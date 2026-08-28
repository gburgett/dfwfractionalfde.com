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
import { assertAgentEnv } from '../lib/env.js';
import { getPendingSubmissions, getSubmissionsForEmail } from './tools/submissions.js';
import { sendEmail } from './tools/email.js';
import { createSearchCaseStudiesTool } from './tools/case-studies.js';
import { createSearchPackagesTool } from './tools/packages.js';
import { site } from '../data/site.js';

assertAgentEnv();

const SYSTEM_PROMPT = `You are Daneel, an AI assistant to ${site.owner.name}. Gordon is a fractional Forward Deployed Engineer (FDE) based in Dallas–Fort Worth, TX who embeds with client companies to build and ship AI-native software. His core offering is a monthly subscription with a minimum ${site.minEngagementMonths}-month engagement; alongside it he sells a small set of productized, fixed-price packages for smaller scoped work (use search_packages to see them).

You send emails on Gordon's behalf from r.daneel.olivaw@dfwfractionalfde.com, identifying yourself as his AI assistant. Be transparent that you are an AI — do not impersonate Gordon directly.

Website: ${site.url}
Contact email: ${site.contactEmail}

## Current availability

${site.openClients > 0
    ? `Gordon has ${site.openClients} open slot(s) and is accepting new engagements right now. For a genuine inquiry, express interest on his behalf and offer a concrete next step, such as a 30-minute call.`
    : `Gordon is currently full — the practice is waitlist-only, with no open slots. Do not imply a slot is available or offer to schedule a call as though one is. Be honest about the waitlist, set realistic expectations, and ask about their timeline and what they want to build to keep the conversation warm.`}

Every email you send must be consistent with this. Never state or imply an availability that contradicts it.

## Your workflow

1. Call get_pending_submissions to fetch all unprocessed contact form and waitlist submissions.
2. If there are none, say so and stop.
3. For each submission, note its type (\`contact\` = project bid request, \`waitlist\` = waitlist signup) and categorize it as one of:
   - **genuine_inquiry**: A real person or business genuinely interested in hiring a fractional FDE. When in doubt, lean toward genuine — err on the side of responding.
   - **solicitation**: Outbound sales pitch, recruiting email, vendor selling services (SEO, dev shops, offshore staffing, etc.), or affiliate marketing.
   - **spam**: Gibberish, test data, clearly automated bot submissions, or completely irrelevant.
   - **other**: Doesn't fit above (e.g., job applications, partnership proposals that aren't solicitations, general questions about the field).
4. For **genuine_inquiry** submissions: before writing the email, call search_case_studies with a description of their project or problem to check whether Gordon has done similar work before. If you find a relevant case study, mention it briefly and include its link — a concrete example builds far more trust than generic reassurance. Don't force it if nothing is genuinely relevant.
   - Also call search_packages with the same description. If their need maps cleanly onto a fixed-price package, name it with its price and link — especially for smaller or exploratory asks, or anyone hesitant about a subscription. Don't push a package when a full engagement is the better fit.
5. Also call check_prior_submissions with their email to see if they have other submissions on file. If, say, they're submitting the waitlist form but already have a contact form submission (or vice versa), acknowledge what you already have rather than treating them as brand new — and never invite someone to "join the waitlist" if a prior submission shows they already have.
6. Compose a warm, personalized follow-up email and call send_followup_email. Keep it consistent with "Current availability" above, and tailor the tone slightly to the submission type — waitlist signups are expressing earlier-stage interest, while contact form submissions likely come with a defined project scope (Or may just be generic questions).
7. Call mark_processed for every submission, regardless of category.
8. Process all pending submissions before finishing.

## Follow-up email guidelines

- Open with a brief, natural introduction: you're Daneel, Gordon's AI assistant, reaching out on his behalf.
- Warm and personal, not templated-sounding. Reference specifics from their message.
- If search_case_studies turned up a relevant example, weave it in naturally with its link — e.g. "Gordon built something similar for [client] — [link]" — rather than bolting it on as an afterthought.
- If search_packages turned up a fitting fixed-price package, mention it by name with its price and link as a concrete, low-commitment starting point.
- Never tell someone to join the waitlist, or ask if they want to, without having checked check_prior_submissions first — they may already be on it.
- Keep it brief: 3–5 short paragraphs.
- Keep the email consistent with "Current availability" above — never promise a slot or a call when the practice is waitlist-only.
- End with a clear, specific next step.
- Sign off as: "— Daneel\\nAI assistant to Gordon Burgett"

## Tone

Warm, professional, and direct. Mirror Gordon's style: conversational, technically curious, not over-explained. As an AI, you can be matter-of-fact about being one without making it the focus of the email.`;

export async function runFollowUpAgent(): Promise<void> {
  const db = getDb();

  const precheck = getPendingSubmissions(db);
  if (precheck.length === 0) {
    console.log('[follow-up-agent] No pending submissions. Nothing to do.');
    return;
  }
  console.log(`[follow-up-agent] ${precheck.length} pending submission(s) — starting agent.`);

  const getPendingSubmissionsTool = defineTool({
    name: 'get_pending_submissions',
    label: 'Get Pending Submissions',
    description: 'Returns all unprocessed contact form and waitlist submissions. Call this first before doing anything else.',
    parameters: Type.Object({}),
    execute: async () => {
      try {
        const pending = getPendingSubmissions(db);
        console.log(`[follow-up-agent] ${pending.length} pending submission(s)`);
        const result = pending.length > 0 ? pending : { message: 'No pending submissions.' };
        return { content: [{ type: 'text' as const, text: JSON.stringify(result) }], details: {} };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error('[follow-up-agent] get_pending_submissions failed:', msg);
        return { content: [{ type: 'text' as const, text: JSON.stringify({ error: msg }) }], details: {} };
      }
    },
  });

  const sendFollowupEmailTool = defineTool({
    name: 'send_followup_email',
    label: 'Send Follow-up Email',
    description: 'Sends a warm follow-up email to a genuine inquiry. Only call this for genuine_inquiry category submissions.',
    parameters: Type.Object({
      id: Type.Integer({ description: 'The numeric id of the submission from get_pending_submissions' }),
      to_email: Type.String({ description: 'Recipient email address' }),
      to_name: Type.String({ description: 'Recipient name (first name or full name)' }),
      subject: Type.String({ description: 'Email subject line' }),
      body_text: Type.String({ description: 'Plain text email body' }),
    }),
    execute: async (_toolCallId, params) => {
      try {
        const { to_email, to_name, subject, body_text } = params;
        const messageId = await sendEmail({ to: to_email, toName: to_name, subject, text: body_text });
        console.log(`[follow-up-agent] Sent follow-up to ${to_email}`);
        return { content: [{ type: 'text' as const, text: JSON.stringify({ success: true, messageId }) }], details: {} };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error('[follow-up-agent] send_followup_email failed:', msg);
        return { content: [{ type: 'text' as const, text: JSON.stringify({ error: msg }) }], details: {} };
      }
    },
  });

  const markProcessedTool = defineTool({
    name: 'mark_processed',
    label: 'Mark Processed',
    description: 'Record the final outcome for a submission. Must be called for every submission, including spam and solicitations.',
    parameters: Type.Object({
      id: Type.Integer({ description: 'The numeric id of the submission' }),
      category: Type.Union(
        [
          Type.Literal('genuine_inquiry'),
          Type.Literal('spam'),
          Type.Literal('solicitation'),
          Type.Literal('other'),
        ],
        { description: 'genuine_inquiry: real potential client. solicitation: vendor/recruiter pitching services. spam: bot/gibberish. other: everything else.' }
      ),
      category_notes: Type.Optional(Type.String({ description: 'One-sentence reason for the classification' })),
      email_sent: Type.Boolean({ description: 'Whether a follow-up email was sent for this submission' }),
    }),
    execute: async (_toolCallId, params) => {
      try {
        const { id, category, category_notes, email_sent } = params;
        db.prepare(`
          UPDATE submissions
          SET category = ?, category_notes = ?, email_sent = ?, processed_at = ?
          WHERE id = ?
        `).run(category, category_notes ?? null, email_sent ? 1 : 0, new Date().toISOString(), id);
        console.log(`[follow-up-agent] Marked id=${id} → ${category}${email_sent ? ' (email sent)' : ''}`);
        return { content: [{ type: 'text' as const, text: JSON.stringify({ success: true }) }], details: {} };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error('[follow-up-agent] mark_processed failed:', msg);
        return { content: [{ type: 'text' as const, text: JSON.stringify({ error: msg }) }], details: {} };
      }
    },
  });

  const searchCaseStudiesTool = createSearchCaseStudiesTool(db);
  const searchPackagesTool = createSearchPackagesTool(db);

  const checkPriorSubmissionsTool = defineTool({
    name: 'check_prior_submissions',
    label: 'Check Prior Submissions',
    description: 'Checks whether a given email address has any other waitlist or contact form submissions already on file (besides the one you\'re currently processing). Call this before telling someone they\'re on the waitlist, or before inviting them to join it / fill out the form again.',
    parameters: Type.Object({
      email: Type.String({ description: 'Email address to check' }),
    }),
    execute: async (_toolCallId, params) => {
      try {
        const results = getSubmissionsForEmail(db, params.email);
        console.log(`[follow-up-agent] check_prior_submissions(${params.email}) → ${results.length} result(s)`);
        const result = results.length > 0 ? results : { message: 'No prior waitlist or contact form submissions on file for this email.' };
        return { content: [{ type: 'text' as const, text: JSON.stringify(result) }], details: {} };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error('[follow-up-agent] check_prior_submissions failed:', msg);
        return { content: [{ type: 'text' as const, text: JSON.stringify({ error: msg }) }], details: {} };
      }
    },
  });

  const model = getModel('fireworks', 'accounts/fireworks/models/deepseek-v4-pro');
  if (!model) throw new Error('DeepSeek v4 Pro model not found in pi model registry');

  const authStorage = AuthStorage.create();
  const modelRegistry = ModelRegistry.create(authStorage);

  const loader = new DefaultResourceLoader({ cwd: process.cwd(), agentDir: getAgentDir(), systemPromptOverride: () => SYSTEM_PROMPT });
  await loader.reload();

  const { session } = await createAgentSession({
    model,
    noTools: 'builtin',
    customTools: [getPendingSubmissionsTool, sendFollowupEmailTool, markProcessedTool, searchCaseStudiesTool, searchPackagesTool, checkPriorSubmissionsTool],
    resourceLoader: loader,
    sessionManager: SessionManager.inMemory(),
    settingsManager: SettingsManager.inMemory({ compaction: { enabled: false } }),
    authStorage,
    modelRegistry,
  });

  console.log('[follow-up-agent] Starting run...');

  session.subscribe((event) => {
    if (event.type === 'message_update' && event.assistantMessageEvent.type === 'text_delta') {
      process.stdout.write(event.assistantMessageEvent.delta);
    }
  });

  await session.prompt('Please process all pending form submissions from the website (contact and waitlist).');
  process.stdout.write('\n');
  console.log('[follow-up-agent] Run complete.');
  session.dispose();
}

// CLI entry point — run directly with: npm run agent:follow-up
const scriptPath = new URL(import.meta.url).pathname;
const invoked = process.argv[1] ? new URL(process.argv[1], 'file://').pathname : '';
if (scriptPath === invoked) {
  runFollowUpAgent().catch(err => {
    console.error('[follow-up-agent] Fatal:', err);
    process.exit(1);
  });
}
