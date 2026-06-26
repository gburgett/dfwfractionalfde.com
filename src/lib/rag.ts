import type Database from 'better-sqlite3';
import { generateEmbedding, vectorToBlob } from './embeddings.js';

export interface RagResult {
  id: number;
  fromEmail: string;
  fromName: string;
  toEmail: string | null;
  subject: string;
  snippet: string;
  distance: number;
  receivedAt: string;
}

/** Helper: build a hex-encoded blob literal for raw SQL (sqlite-vec vec0 workaround). */
function hexBlob(vec: Float32Array): string {
  return "X'" + Buffer.from(vec.buffer).toString('hex') + "'";
}

/**
 * Generate and store an embedding for a single inbound email.
 * Called for new emails as they arrive (no backfill of older ones).
 */
export async function ensureEmbedding(
  db: Database.Database,
  emailId: number,
  subject: string,
  bodyText: string,
): Promise<void> {
  // Skip if already embedded
  const exists = db.prepare('SELECT 1 FROM email_embeddings WHERE email_id = ?').get(emailId);
  if (exists) return;

  const text = `Subject: ${subject}\nBody: ${bodyText}`;
  const vec = await generateEmbedding(text);
  const blob = vectorToBlob(vec);
  const hex = hexBlob(vec);

  db.prepare(`
    INSERT OR REPLACE INTO email_embeddings (email_id, embedding, updated_at)
    VALUES (?, ?, datetime('now'))
  `).run(emailId, blob);

  // vec0 virtual table requires raw SQL — use exec with hex literal
  db.exec(`INSERT OR REPLACE INTO vec_email_embeddings (email_id, embedding) VALUES (${emailId}, ${hex})`);
}

/**
 * Search past inbound_emails for conversations related to `query`,
 * restricted to exchanges with `contactEmail` (either from or to them).
 *
 * Joins vec0 KNN results with inbound_emails in SQL so the contact filter
 * is applied before limiting — avoids returning zero rows when the top
 * vec0 matches are from unrelated contacts.
 */
export async function searchConversations(
  db: Database.Database,
  query: string,
  contactEmail: string,
  limit: number = 5,
): Promise<RagResult[]> {
  const queryVec = await generateEmbedding(query);
  const queryHex = hexBlob(queryVec);

  // Scan generously (k=100) so filtering by contact doesn't starve results
  type Row = {
    id: number; distance: number; from_email: string; from_name: string | null;
    to_email: string | null; subject: string | null;
    body_text: string | null; received_at: string;
  };

  const rows = db.prepare(`
    SELECT v.email_id AS id, v.distance,
           e.from_email, e.from_name, e.to_email, e.subject,
           e.body_text, e.received_at
    FROM vec_email_embeddings v
    INNER JOIN inbound_emails e ON e.id = v.email_id
    WHERE v.embedding MATCH ${queryHex}
      AND k = 100
      AND (LOWER(e.from_email) = LOWER(?) OR LOWER(e.to_email) = LOWER(?))
    ORDER BY v.distance ASC
    LIMIT ?
  `).all(contactEmail, contactEmail, limit) as Row[];

  if (rows.length === 0) return [];

  const results: RagResult[] = rows.map(r => ({
    id: r.id,
    fromEmail: r.from_email,
    fromName: r.from_name ?? '',
    toEmail: r.to_email ?? null,
    subject: r.subject ?? '(no subject)',
    snippet: (r.body_text ?? '').length > 500
      ? (r.body_text ?? '').slice(0, 500) + '…'
      : (r.body_text ?? ''),
    distance: r.distance,
    receivedAt: r.received_at,
  }));

  return results;
}
