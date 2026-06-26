import { getDb } from './db.js';
import { env } from './env.js';

export type Submission = Record<string, string> & {
  type: string;
  receivedAt: string;
};

/**
 * Persist a submission to SQLite and, if configured, forward it to a webhook.
 *
 *   SUBMISSIONS_WEBHOOK : URL to POST each submission to (Slack, Make, Zapier, etc.)
 */
export async function saveSubmission(type: string, fields: Record<string, string>) {
  const record: Submission = {
    type,
    receivedAt: new Date().toISOString(),
    ...fields,
  };

  const db = getDb();
  db.prepare(`
    INSERT OR IGNORE INTO submissions (type, received_at, name, email, company, topic, budget, message)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    type,
    record.receivedAt,
    fields.name ?? null,
    fields.email ?? null,
    fields.company ?? null,
    fields.topic ?? null,
    fields.budget ?? null,
    fields.message ?? null,
  );

  const webhook = env.SUBMISSIONS_WEBHOOK;
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
