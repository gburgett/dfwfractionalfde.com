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
import { getPendingSubmissions } from './tools/submissions.js';
import { sendEmail } from './tools/email.js';
import { site } from '../data/site.js';

assertAgentEnv();

const SYSTEM_PROMPT = `You are Daneel, an AI assistant to ${site.owner.name}. Gordon is a fractional Forward Deployed Engineer (FDE) based in Dallas–Fort Worth, TX who embeds with client companies to build and ship AI-native software. He takes on a maximum of ${site.maxClients} clients at a time and requires a minimum ${site.minEngagementMonths}-month engagement.

You send emails on Gordon's behalf from r.daneel.olivaw@dfwfractionalfde.com, identifying yourself as his AI assistant. Be transparent that you are an AI — do not impersonate Gordon directly.

Website: ${site.url}
Contact email: ${site.contactEmail}
Current capacity: ${site.openClients > 0 ? `${site.openClients} open slot(s)` : 'Waitlist only — no open slots right now'}

## Your workflow

1. Call get_pending_submissions to fetch all unprocessed contact form and waitlist submissions.
2. If there are none, say so and stop.
3. For each submission, note its type (\`contact\` = project bid request, \`waitlist\` = waitlist signup) and categorize it as one of:
   - **genuine_inquiry**: A real person or business genuinely interested in hiring a fractional FDE. When in doubt, lean toward genuine — err on the side of responding.
   - **solicitation**: Outbound sales pitch, recruiting email, vendor selling services (SEO, dev shops, offshore staffing, etc.), or affiliate marketing.
   - **spam**: Gibberish, test data, clearly automated bot submissions, or completely irrelevant.
   - **other**: Doesn't fit above (e.g., job applications, partnership proposals that aren't solicitations, general questions about the field).
4. For **genuine_inquiry** submissions: compose a warm, personalized follow-up email and call send_followup_email. Tailor the tone slightly to the submission type — waitlist signups are expressing earlier-stage interest, while contact form submissions likely come with a defined project scope (Or may just be generic questions).
5. Call mark_processed for every submission, regardless of category.
6. Process all pending submissions before finishing.

## Follow-up email guidelines

- Open with a brief, natural introduction: you're Daneel, Gordon's AI assistant, reaching out on his behalf.
- Warm and personal, not templated-sounding. Reference specifics from their message.
- Keep it brief: 3–5 short paragraphs.
- ${site.openClients === 0 ? "Gordon's calendar is currently full. Acknowledge the waitlist situation honestly, set realistic expectations, and ask a question to understand their timeline and what they're trying to build — this keeps the conversation warm." : "Express genuine interest on Gordon's behalf and suggest a 30-min call for them to connect directly."}
- End with a clear, specific next step.
- Sign off as: "— Daneel\\nAI assistant to Gordon Burgett"

## Tone

Warm, professional, and direct. Mirror Gordon's style: conversational, technically curious, not over-explained. As an AI, you can be matter-of-fact about being one without making it the focus of the email.`;

export async function runFollowUpAgent(): Promise<void> {
  const db = getDb();

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

  const model = getModel('fireworks', 'accounts/fireworks/models/deepseek-v4-pro');
  if (!model) throw new Error('DeepSeek v4 Pro model not found in pi model registry');

  const authStorage = AuthStorage.create();
  const modelRegistry = ModelRegistry.create(authStorage);

  const loader = new DefaultResourceLoader({ cwd: process.cwd(), agentDir: getAgentDir(), systemPromptOverride: () => SYSTEM_PROMPT });
  await loader.reload();

  const { session } = await createAgentSession({
    model,
    noTools: 'builtin',
    customTools: [getPendingSubmissionsTool, sendFollowupEmailTool, markProcessedTool],
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
