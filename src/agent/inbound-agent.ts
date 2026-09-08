#!/usr/bin/env tsx
import { Type } from "typebox";
import { getModel } from "@earendil-works/pi-ai";
import {
  AuthStorage,
  createAgentSession,
  DefaultResourceLoader,
  defineTool,
  getAgentDir,
  ModelRegistry,
  SessionManager,
  SettingsManager,
} from "@earendil-works/pi-coding-agent";
import { getDb } from '../lib/db.js';
import { assertAgentEnv, env } from '../lib/env.js';
import { syncInbox, getPendingEmails, type InboundEmail } from './tools/imap.js';
import { sendEmail } from './tools/email.js';
import { getSubmissionsForEmail } from './tools/submissions.js';
import { createSearchCaseStudiesTool } from './tools/case-studies.js';
import { createSearchPackagesTool } from './tools/packages.js';
import { site } from '../data/site.js';
import { ensureEmbedding, searchConversations } from '../lib/rag.js';

assertAgentEnv();

/** Build a per-email system prompt with the full email context baked in. */
function systemPromptForEmail(email: InboundEmail): string {
  return `You are Daneel, an AI assistant to ${site.owner.name}. Gordon is a fractional Forward Deployed Engineer (FDE) based in Dallas–Fort Worth, TX who embeds with client companies to build and ship AI-native software. His core offering is a monthly subscription with a minimum ${site.minEngagementMonths}-month engagement; alongside it he sells a small set of productized, fixed-price packages for smaller scoped work (use search_packages to see them).

You manage the r.daneel.olivaw@dfwfractionalfde.com inbox on Gordon's behalf. Be transparent that you are an AI — do not impersonate Gordon directly.

Website: ${site.url}
Contact email: ${site.contactEmail}

## Current availability

${site.openClients > 0
    ? `Gordon has open availability and is accepting new engagements right now. Do not state or imply a specific number of open slots. For a genuine inquiry, express interest on his behalf and offer a concrete next step, such as a 30-minute call.`
    : `Gordon is currently full — the practice is waitlist-only, with no open slots. Do not imply a slot is available or offer to schedule a call as though one is. Be honest about the waitlist, set realistic expectations, and ask about their timeline and what they want to build to keep the conversation warm.`}

Every reply you send must be consistent with this. Never state or imply an availability that contradicts it.

## Inbound email to handle

You have one email to process. Here are the details:

**From:** ${email.fromName} <${email.fromEmail}>
**Subject:** ${email.subject}
**Received:** ${email.receivedAt}
**Message ID:** ${email.id}

--- begin email body ---
${email.bodyText}
--- end email body ---

## Your workflow

1. Categorize this email as one of:
   - **genuine_inquiry**: A real person or business genuinely interested in hiring a fractional FDE, asking questions about Gordon's work, or following up on a prior conversation. When in doubt, lean toward genuine — err on the side of responding.
   - **solicitation**: Outbound sales pitch, recruiting email, vendor selling services (SEO, dev shops, offshore staffing, link-building, etc.).
   - **spam**: Gibberish, test messages, clearly automated bot submissions, phishing, or completely irrelevant content.
   - **other**: Doesn't fit above (e.g., job applications, partnership proposals, media inquiries, general questions about the field).

2. Before categorizing, optionally call \`search_conversations\` to look up past exchanges with this sender — useful for context if they've reached out before or you've replied before.

3. If the category is **genuine_inquiry**: compose a warm, personalized reply and call \`send_reply\`. Factor in "Current availability" above, and see "Citing relevant work for warm leads" and "Never guess at someone's waitlist/contact status" below before writing it.

4. **Always call \`mark_processed\`** — for every email, regardless of category. This records the outcome so we don't process it again.

## Recognizing follow-up replies

This email might be a reply to a **follow-up email you previously sent** from a contact form submission. Use \`search_conversations\` to check for prior context — if you find that a follow-up was recently sent to this person and they are now responding with genuine interest, this is a strong signal they may be ready to move forward.

## Creating qualified opportunities

If a sender is responding to a prior follow-up and clearly expresses interest in working with Gordon (e.g. they want to discuss scope, timeline, budget, or schedule a call), call \`create_qualified_opportunity\` in addition to replying. This notifies Gordon directly with all the details.

## Citing relevant work for warm leads

When you're following up on a warm lead — someone who has already expressed interest, is replying to a prior follow-up, or is asking questions about what Gordon can do — call \`search_case_studies\` with a description of their project or problem. If a genuinely relevant case study turns up, mention it briefly in your reply with its link, so they see concrete proof of similar work. Don't force it if nothing is truly relevant; a bad example is worse than no example.

Also call \`search_packages\` with the same description. If their need maps onto a fixed-price package, name it with its price and link — it gives a hesitant or exploratory lead a concrete, low-commitment way to start. Don't push a package when a full subscription engagement is clearly the better fit.

## Never guess at someone's waitlist/contact status

Before telling someone they're on the waitlist, or inviting them to join the waitlist or fill out the contact form, call \`check_prior_submissions\` first. This reply may be part of a thread that started from a form they already submitted — you have no visibility into that from the email body alone. If a prior submission is on file, acknowledge it (e.g. "you're already on the waitlist as of [date]") instead of asking them to submit again or implying they haven't yet.

## Reply guidelines

- Open with a brief, natural introduction as Daneel — Gordon's AI assistant — unless the sender clearly already knows who you are from prior exchange.
- Warm and personal, not templated-sounding. Reference specifics from their message, **any relevant past conversations** you found via search_conversations, **any relevant case study** you found via search_case_studies, and **any fitting fixed-price package** you found via search_packages (by name, with price and link).
- Never invite someone to join the waitlist or fill out the contact form without first checking check_prior_submissions — they may have already done so.
- Keep it brief: 3–5 short paragraphs.
- Keep the reply consistent with "Current availability" above — never promise a slot or a call when the practice is waitlist-only.
- End with a clear, specific next step.
- Sign off as: "— Daneel\\nAI assistant to Gordon Burgett"

## Tone

Warm, professional, and direct. Mirror Gordon's style: conversational, technically curious, not over-explained. Be matter-of-fact about being an AI without making it the focus.`;
}

/** Create tools scoped to a specific email id and its sender. */
function createTools(db: ReturnType<typeof getDb>, emailId: number, fromEmail: string) {
  const sendReplyTool = defineTool({
    name: 'send_reply',
    label: 'Send Reply',
    description: 'Sends a reply to a genuine inquiry. Threading headers are attached automatically.',
    parameters: Type.Object({
      to_email: Type.String({ description: 'Recipient email address' }),
      to_name: Type.String({ description: 'Recipient name' }),
      subject: Type.String({ description: 'Reply subject (typically "Re: original subject")' }),
      body_text: Type.String({ description: 'Plain text reply body' }),
    }),
    execute: async (_toolCallId, params) => {
      try {
        const { to_email, to_name, subject, body_text } = params;

        type ThreadRow = { message_id: string; in_reply_to: string | null; ref_chain: string | null };
        const orig = db.prepare(
          'SELECT message_id, in_reply_to, ref_chain FROM inbound_emails WHERE id = ?'
        ).get(emailId) as ThreadRow | undefined;

        if (!orig) throw new Error(`No email found with id=${emailId}`);

        const refs = [orig.ref_chain, orig.in_reply_to, orig.message_id]
          .filter(Boolean).join(' ');

        const messageId = await sendEmail({
          to: to_email,
          toName: to_name,
          subject,
          text: body_text,
          inReplyTo: orig.message_id,
          references: refs,
        });

        db.prepare('UPDATE inbound_emails SET reply_sent = 1 WHERE id = ?').run(emailId);
        console.log(`[inbound-agent] Replied to ${to_email} (id=${emailId})`);
        return { content: [{ type: 'text' as const, text: JSON.stringify({ success: true, messageId }) }], details: {} };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error('[inbound-agent] send_reply failed:', msg);
        return { content: [{ type: 'text' as const, text: JSON.stringify({ error: msg }) }], details: {} };
      }
    },
  });

  const markProcessedTool = defineTool({
    name: 'mark_processed',
    label: 'Mark Processed',
    description: 'Record the final outcome for this email. Must be called for every email, including spam and solicitations.',
    parameters: Type.Object({
      category: Type.Union(
        [
          Type.Literal('genuine_inquiry'),
          Type.Literal('spam'),
          Type.Literal('solicitation'),
          Type.Literal('other'),
        ],
        { description: 'genuine_inquiry: real person interested in working with Gordon. solicitation: vendor/recruiter pitch. spam: bot/gibberish. other: misc.' }
      ),
      category_notes: Type.Optional(Type.String({ description: 'One-sentence reason for classification' })),
      reply_sent: Type.Boolean({ description: 'Whether a reply was sent' }),
    }),
    execute: async (_toolCallId, params) => {
      try {
        const { category, category_notes, reply_sent } = params;
        db.prepare(`
          UPDATE inbound_emails
          SET category = ?, category_notes = ?, reply_sent = ?, processed_at = ?
          WHERE id = ?
        `).run(category, category_notes ?? null, reply_sent ? 1 : 0, new Date().toISOString(), emailId);
        console.log(`[inbound-agent] Marked id=${emailId} → ${category}${reply_sent ? ' (replied)' : ''}`);
        return { content: [{ type: 'text' as const, text: JSON.stringify({ success: true }) }], details: {} };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error('[inbound-agent] mark_processed failed:', msg);
        return { content: [{ type: 'text' as const, text: JSON.stringify({ error: msg }) }], details: {} };
      }
    },
  });

  const searchConversationsTool = defineTool({
    name: 'search_conversations',
    label: 'Search Conversations',
    description: 'Search past email conversations with this sender. Use this to get context on previous exchanges before replying.',
    parameters: Type.Object({
      query: Type.String({ description: 'What you want to find in past conversations (e.g. "previous project discussion", "budget mentioned")' }),
    }),
    execute: async (_toolCallId, params) => {
      try {
        const { query } = params;
        const results = await searchConversations(db, query, fromEmail);
        console.log(`[inbound-agent] search_conversations("${query}", contact=${fromEmail}) → ${results.length} result(s)`);
        return { content: [{ type: 'text' as const, text: JSON.stringify(results) }], details: {} };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error('[inbound-agent] search_conversations failed:', msg);
        return { content: [{ type: 'text' as const, text: JSON.stringify({ error: msg }) }], details: {} };
      }
    },
  });

  const createOpportunityTool = defineTool({
    name: 'create_qualified_opportunity',
    label: 'Create Qualified Opportunity',
    description: 'Creates a qualified sales opportunity and emails Gordon with all the details. Call this when a genuine prospect clearly expresses interest in hiring Gordon (wants to discuss scope, budget, timeline, pricing, or schedule a call). Only call for qualified leads — not for casual questions or tire-kickers.',
    parameters: Type.Object({
      name: Type.String({ description: 'Contact full name' }),
      email: Type.String({ description: 'Contact email address' }),
      company: Type.Optional(Type.String({ description: 'Company name (if shared)' })),
      summary: Type.String({ description: '2–3 sentence summary of what they want (project type, scope, urgency, any specific tech or use cases mentioned)' }),
      budget: Type.Optional(Type.String({ description: 'Budget range or indication they shared (if any)' })),
      timeline: Type.Optional(Type.String({ description: 'Timeline or urgency they indicated (if any)' })),
      next_steps: Type.String({ description: 'What was agreed or suggested next (e.g. "suggested a 30-min call next week", "they want a proposal by Friday")' }),
    }),
    execute: async (_toolCallId, params) => {
      try {
        const { name, email, company, summary, budget, timeline, next_steps } = params;

        const subject = `[Opportunity] ${name}${company ? ` — ${company}` : ''}`;
        const text = [
          'Qualified opportunity from Daneel\n',
          `Name:       ${name}`,
          `Email:      ${email}`,
          `Company:    ${company ?? '(not shared)'}`,
          `Budget:     ${budget ?? '(not shared)'}`,
          `Timeline:   ${timeline ?? '(not shared)'}`,
          '',
          'Summary:',
          summary,
          '',
          'Next steps:',
          next_steps,
          '',
          `— Daneel`,
          `AI assistant to Gordon Burgett`,
        ].join('\n');

        const messageId = await sendEmail({
          to: site.contactEmail,
          toName: site.owner.name,
          subject,
          text,
        });

        console.log(`[inbound-agent] Created opportunity for ${name} <${email}> (messageId=${messageId})`);
        return { content: [{ type: 'text' as const, text: JSON.stringify({ success: true, messageId }) }], details: {} };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error('[inbound-agent] create_qualified_opportunity failed:', msg);
        return { content: [{ type: 'text' as const, text: JSON.stringify({ error: msg }) }], details: {} };
      }
    },
  });

  const searchCaseStudiesTool = createSearchCaseStudiesTool(db);
  const searchPackagesTool = createSearchPackagesTool(db);

  const checkPriorSubmissionsTool = defineTool({
    name: 'check_prior_submissions',
    label: 'Check Prior Submissions',
    description: 'Checks whether this sender has any waitlist or contact form submissions already on file. Call this before telling someone they\'re on the waitlist, or before inviting them to join it / fill out the form — avoids contradicting or asking them to redo something they\'ve already done.',
    parameters: Type.Object({}),
    execute: async () => {
      try {
        const results = getSubmissionsForEmail(db, fromEmail);
        console.log(`[inbound-agent] check_prior_submissions(${fromEmail}) → ${results.length} result(s)`);
        const result = results.length > 0 ? results : { message: 'No prior waitlist or contact form submissions on file for this email.' };
        return { content: [{ type: 'text' as const, text: JSON.stringify(result) }], details: {} };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error('[inbound-agent] check_prior_submissions failed:', msg);
        return { content: [{ type: 'text' as const, text: JSON.stringify({ error: msg }) }], details: {} };
      }
    },
  });

  return [sendReplyTool, markProcessedTool, searchConversationsTool, createOpportunityTool, searchCaseStudiesTool, searchPackagesTool, checkPriorSubmissionsTool] as const;
}

/** Returns true if the email's processed_at column is non-null. */
function isProcessed(db: ReturnType<typeof getDb>, emailId: number): boolean {
  const row = db.prepare('SELECT processed_at FROM inbound_emails WHERE id = ?').get(emailId) as
    { processed_at: string | null } | undefined;
  return row !== undefined && row.processed_at !== null;
}

export async function runInboundAgent(): Promise<void> {
  const db = getDb();

  // ── Harness: sync inbox and check for unprocessed emails ──────────────
  console.log('[inbound-agent] Syncing inbox...');
  await syncInbox(db);

  const agentEmail = env.EASYMAIL_AGENT_EMAIL;
  const pending = getPendingEmails(db, agentEmail);

  if (pending.length === 0) {
    console.log('[inbound-agent] No unprocessed emails. Nothing to do.');
    return;
  }

  console.log(`[inbound-agent] ${pending.length} pending email(s)`);

  const model = getModel('fireworks', 'accounts/fireworks/models/deepseek-v4-pro');
  if (!model) throw new Error('DeepSeek v4 Pro model not found in pi model registry');

  const authStorage = AuthStorage.create();
  const modelRegistry = ModelRegistry.create(authStorage);

  for (const email of pending) {
    console.log(`[inbound-agent] Processing email id=${email.id} from ${email.fromEmail}...`);

    // Generate embedding for this email so future RAG searches can find it
    await ensureEmbedding(db, email.id, email.subject, email.bodyText);

    const [sendReplyTool, markProcessedTool, searchConversationsTool, createOpportunityTool, searchCaseStudiesTool, searchPackagesTool, checkPriorSubmissionsTool] =
      createTools(db, email.id, email.fromEmail);

    const loader = new DefaultResourceLoader({
      cwd: process.cwd(),
      agentDir: getAgentDir(),
      systemPromptOverride: () => systemPromptForEmail(email),
    });
    await loader.reload();

    const { session } = await createAgentSession({
      model,
      noTools: 'builtin',
      customTools: [sendReplyTool, markProcessedTool, searchConversationsTool, createOpportunityTool, searchCaseStudiesTool, searchPackagesTool, checkPriorSubmissionsTool],
      resourceLoader: loader,
      sessionManager: SessionManager.inMemory(),
      settingsManager: SettingsManager.inMemory({ compaction: { enabled: false } }),
      authStorage,
      modelRegistry,
    });

    session.subscribe((event) => {
      if (event.type === 'message_update' && event.assistantMessageEvent.type === 'text_delta') {
        process.stdout.write(event.assistantMessageEvent.delta);
      }
    });

    // First pass — let the agent handle the email
    await session.prompt(
      'Please categorize this email and respond appropriately. Remember to call mark_processed when done.'
    );
    process.stdout.write('\n');

    // Check if mark_processed was called. If not, nudge once.
    if (!isProcessed(db, email.id)) {
      console.log(`[inbound-agent] id=${email.id} not yet processed — nudging agent...`);
      await session.prompt(
        'This email has not been marked as processed yet. Please call mark_processed with the appropriate category and any notes.'
      );
      process.stdout.write('\n');
    }

    if (isProcessed(db, email.id)) {
      console.log(`[inbound-agent] ✓ id=${email.id} processed successfully.`);
    } else {
      console.warn(`[inbound-agent] ✗ id=${email.id} still not processed after nudge. Skipping.`);
    }

    session.dispose();
  }

  console.log('[inbound-agent] Run complete.');
}

// CLI entry point
const scriptPath = new URL(import.meta.url).pathname;
const invoked = process.argv[1] ? new URL(process.argv[1], 'file://').pathname : '';
if (scriptPath === invoked) {
  runInboundAgent().catch(err => {
    console.error('[inbound-agent] Fatal:', err);
    process.exit(1);
  });
}
