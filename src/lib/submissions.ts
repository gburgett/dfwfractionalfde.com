import { appendFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';

// Where submissions are persisted. Override with SUBMISSIONS_DIR in production.
const DIR = process.env.SUBMISSIONS_DIR || './submissions';

export type Submission = Record<string, string> & {
  type: string;
  receivedAt: string;
};

/**
 * Persist a submission as a line of JSON (JSONL) and, if configured, forward it.
 *
 * Delivery options (all optional, set whichever you use in production):
 *   - SUBMISSIONS_DIR : directory for the JSONL files (default ./submissions)
 *   - SUBMISSIONS_WEBHOOK : URL to POST each submission to (Slack, Make, Zapier, your inbox-as-a-service, etc.)
 */
export async function saveSubmission(type: string, fields: Record<string, string>) {
  const record: Submission = {
    type,
    receivedAt: new Date().toISOString(),
    ...fields,
  };

  const file = `${DIR}/${type}.jsonl`;
  await mkdir(dirname(file), { recursive: true });
  await appendFile(file, JSON.stringify(record) + '\n', 'utf8');

  const webhook = process.env.SUBMISSIONS_WEBHOOK;
  if (webhook) {
    try {
      await fetch(webhook, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(record),
      });
    } catch (err) {
      console.error('[submissions] webhook delivery failed:', err);
    }
  }

  return record;
}

/** Pull and lightly validate fields from a posted form. */
export async function readForm(request: Request) {
  const data = await request.formData();
  const out: Record<string, string> = {};
  for (const [k, v] of data.entries()) {
    if (typeof v === 'string') out[k] = v.trim();
  }
  return out;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export function isEmail(value: string | undefined): boolean {
  return !!value && EMAIL_RE.test(value);
}
