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
import { syncInbox, getPendingEmails } from './tools/imap.js';
import { sendEmail } from './tools/email.js';
import { site } from '../data/site.js';

assertAgentEnv();

const SYSTEM_PROMPT = `You are Daneel, an AI assistant to ${site.owner.name}. Gordon is a fractional Forward Deployed Engineer (FDE) based in Dallas–Fort Worth, TX who embeds with client companies to build and ship AI-native software. He takes on a maximum of ${site.maxClients} clients at a time and requires a minimum ${site.minEngagementMonths}-month engagement.

You manage the r.daneel.olivaw@dfwfractionalfde.com inbox on Gordon's behalf. Be transparent that you are an AI — do not impersonate Gordon directly.

Website: ${site.url}
Contact email: ${site.contactEmail}
Current capacity: ${site.openClients > 0 ? `${site.openClients} open slot(s)` : 'Waitlist only — no open slots right now'}

## Your workflow

1. Call get_new_emails to fetch all unprocessed inbound emails.
2. If there are none, say so and stop.
3. For each email, categorize it as one of:
   - **genuine_inquiry**: A real person or business genuinely interested in hiring a fractional FDE, asking questions about Gordon's work, or following up on a prior conversation. When in doubt, lean toward genuine — err on the side of responding.
   - **solicitation**: Outbound sales pitch, recruiting email, vendor selling services (SEO, dev shops, offshore staffing, link-building, etc.).
   - **spam**: Gibberish, test messages, clearly automated bot submissions, phishing, or completely irrelevant content.
   - **other**: Doesn't fit above (e.g., job applications, partnership proposals, media inquiries, general questions about the field).
4. For **genuine_inquiry** emails: compose a warm, personalized reply and call send_reply.
5. Call mark_processed for every email, regardless of category.
6. Process all emails before finishing.

## Reply guidelines

- Open with a brief, natural introduction as Daneel — Gordon's AI assistant — unless the sender clearly already knows who you are from prior exchange.
- Warm and personal, not templated-sounding. Reference specifics from their message.
- Keep it brief: 3–5 short paragraphs.
- ${site.openClients === 0 ? "Gordon's calendar is currently full. Acknowledge the waitlist situation honestly, set realistic expectations, and ask a question to understand their timeline and what they're trying to build — this keeps the conversation warm." : "Express genuine interest on Gordon's behalf and suggest a 30-min call for them to connect directly."}
- End with a clear, specific next step.
- Sign off as: "— Daneel\\nAI assistant to Gordon Burgett"

## Tone

Warm, professional, and direct. Mirror Gordon's style: conversational, technically curious, not over-explained. Be matter-of-fact about being an AI without making it the focus.`;

export async function runInboundAgent(): Promise<void> {
  const db = getDb();

  const getNewEmailsTool = defineTool({
    name: 'get_new_emails',
    label: 'Get New Emails',
    description: 'Syncs the inbox from IMAP and returns all unprocessed inbound emails. Call this first.',
    parameters: Type.Object({}),
    execute: async () => {
      try {
        await syncInbox(db);
        const pending = getPendingEmails(db);
        console.log(`[inbound-agent] ${pending.length} pending email(s)`);
        const result = pending.length > 0 ? pending : { message: 'No new emails.' };
        return { content: [{ type: 'text' as const, text: JSON.stringify(result) }], details: {} };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error('[inbound-agent] get_new_emails failed:', msg);
        return { content: [{ type: 'text' as const, text: JSON.stringify({ error: msg }) }], details: {} };
      }
    },
  });

  const sendReplyTool = defineTool({
    name: 'send_reply',
    label: 'Send Reply',
    description: 'Sends a reply to a genuine inquiry. Threading headers are attached automatically.',
    parameters: Type.Object({
      id: Type.Integer({ description: 'The id of the inbound email from get_new_emails' }),
      to_email: Type.String({ description: 'Recipient email address' }),
      to_name: Type.String({ description: 'Recipient name' }),
      subject: Type.String({ description: 'Reply subject (typically "Re: original subject")' }),
      body_text: Type.String({ description: 'Plain text reply body' }),
    }),
    execute: async (_toolCallId, params) => {
      try {
        const { id: emailId, to_email, to_name, subject, body_text } = params;

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
    description: 'Record the final outcome for an email. Must be called for every email, including spam and solicitations.',
    parameters: Type.Object({
      id: Type.Integer({ description: 'The id of the inbound email' }),
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
        const { id: emailId, category, category_notes, reply_sent } = params;
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

  const model = getModel('fireworks', 'accounts/fireworks/models/deepseek-v4-pro');
  if (!model) throw new Error('DeepSeek v4 Pro model not found in pi model registry');

  const authStorage = AuthStorage.create();
  const modelRegistry = ModelRegistry.create(authStorage);

  const loader = new DefaultResourceLoader({ cwd: process.cwd(), agentDir: getAgentDir(), systemPromptOverride: () => SYSTEM_PROMPT });
  await loader.reload();

  const { session } = await createAgentSession({
    model,
    noTools: 'builtin',
    customTools: [getNewEmailsTool, sendReplyTool, markProcessedTool],
    resourceLoader: loader,
    sessionManager: SessionManager.inMemory(),
    settingsManager: SettingsManager.inMemory({ compaction: { enabled: false } }),
    authStorage,
    modelRegistry,
  });

  console.log('[inbound-agent] Starting run...');

  session.subscribe((event) => {
    if (event.type === 'message_update' && event.assistantMessageEvent.type === 'text_delta') {
      process.stdout.write(event.assistantMessageEvent.delta);
    }
  });

  await session.prompt('Please check the inbox and handle any new emails.');
  process.stdout.write('\n');
  console.log('[inbound-agent] Run complete.');
  session.dispose();
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
