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

export interface CaseStudySource {
  slug: string;
  title: string;
  description: string;
  client: string | null;
  url: string;
  content: string;
}

export interface CaseStudyResult {
  slug: string;
  title: string;
  description: string;
  client: string | null;
  url: string;
  distance: number;
}

/**
 * Upsert a case study and its embedding, keyed by slug.
 * Called from the case-study sync build step (scripts/sync-case-studies.ts).
 */
export async function upsertCaseStudy(
  db: Database.Database,
  study: CaseStudySource,
): Promise<void> {
  const { slug, title, description, client, url, content } = study;

  db.prepare(`
    INSERT INTO case_studies (slug, title, description, client, url, content, updated_at)
    VALUES (@slug, @title, @description, @client, @url, @content, datetime('now'))
    ON CONFLICT(slug) DO UPDATE SET
      title = excluded.title,
      description = excluded.description,
      client = excluded.client,
      url = excluded.url,
      content = excluded.content,
      updated_at = excluded.updated_at
  `).run({ slug, title, description, client, url, content });

  const row = db.prepare('SELECT id FROM case_studies WHERE slug = ?').get(slug) as { id: number };

  const text = `Title: ${title}\nClient: ${client ?? 'n/a'}\nDescription: ${description}\n\n${content}`;
  const vec = await generateEmbedding(text);
  const blob = vectorToBlob(vec);
  const hex = hexBlob(vec);

  db.prepare(`
    INSERT OR REPLACE INTO case_study_embeddings (case_study_id, embedding, updated_at)
    VALUES (?, ?, datetime('now'))
  `).run(row.id, blob);

  // vec0 virtual tables don't honor INSERT OR REPLACE (throws a unique constraint
  // error instead) — delete any existing row for this case study first.
  db.exec(`DELETE FROM vec_case_study_embeddings WHERE case_study_id = ${row.id}`);
  db.exec(`INSERT INTO vec_case_study_embeddings (case_study_id, embedding) VALUES (${row.id}, ${hex})`);
}

/**
 * Remove case studies (and their embeddings, via ON DELETE CASCADE) whose slug
 * is no longer present in `keepSlugs` — keeps the DB in sync when a case study
 * markdown file is deleted or renamed.
 */
export function pruneCaseStudies(db: Database.Database, keepSlugs: string[]): number {
  if (keepSlugs.length === 0) {
    const result = db.prepare('DELETE FROM case_studies').run();
    return result.changes;
  }
  const placeholders = keepSlugs.map(() => '?').join(', ');
  const result = db.prepare(`DELETE FROM case_studies WHERE slug NOT IN (${placeholders})`).run(...keepSlugs);
  return result.changes;
}

/**
 * Search case studies for projects similar to `query` — used by Daneel to
 * find and reference relevant past work when following up on warm leads.
 */
export async function searchCaseStudies(
  db: Database.Database,
  query: string,
  limit: number = 3,
): Promise<CaseStudyResult[]> {
  const queryVec = await generateEmbedding(query);
  const queryHex = hexBlob(queryVec);

  type Row = {
    slug: string; distance: number; title: string;
    description: string; client: string | null; url: string;
  };

  const rows = db.prepare(`
    SELECT c.slug, v.distance, c.title, c.description, c.client, c.url
    FROM vec_case_study_embeddings v
    INNER JOIN case_studies c ON c.id = v.case_study_id
    WHERE v.embedding MATCH ${queryHex}
      AND k = ?
    ORDER BY v.distance ASC
  `).all(limit) as Row[];

  return rows.map(r => ({
    slug: r.slug,
    title: r.title,
    description: r.description,
    client: r.client,
    url: r.url,
    distance: r.distance,
  }));
}

export interface PackageSource {
  slug: string;
  name: string;
  price: string;
  term: string;
  summary: string;
  url: string;
}

export interface PackageResult {
  slug: string;
  name: string;
  price: string;
  term: string;
  summary: string;
  url: string;
  distance: number;
}

/**
 * Upsert a fixed-price package and its embedding, keyed by slug.
 * Called from the package sync build step (scripts/sync-packages.ts).
 */
export async function upsertPackage(
  db: Database.Database,
  pkg: PackageSource,
): Promise<void> {
  const { slug, name, price, term, summary, url } = pkg;

  db.prepare(`
    INSERT INTO packages (slug, name, price, term, summary, url, updated_at)
    VALUES (@slug, @name, @price, @term, @summary, @url, datetime('now'))
    ON CONFLICT(slug) DO UPDATE SET
      name = excluded.name,
      price = excluded.price,
      term = excluded.term,
      summary = excluded.summary,
      url = excluded.url,
      updated_at = excluded.updated_at
  `).run({ slug, name, price, term, summary, url });

  const row = db.prepare('SELECT id FROM packages WHERE slug = ?').get(slug) as { id: number };

  const text = `Package: ${name}\nPrice: ${price} (${term})\n\n${summary}`;
  const vec = await generateEmbedding(text);
  const blob = vectorToBlob(vec);
  const hex = hexBlob(vec);

  db.prepare(`
    INSERT OR REPLACE INTO package_embeddings (package_id, embedding, updated_at)
    VALUES (?, ?, datetime('now'))
  `).run(row.id, blob);

  // vec0 virtual tables don't honor INSERT OR REPLACE — delete first.
  db.exec(`DELETE FROM vec_package_embeddings WHERE package_id = ${row.id}`);
  db.exec(`INSERT INTO vec_package_embeddings (package_id, embedding) VALUES (${row.id}, ${hex})`);
}

/**
 * Remove packages (and their embeddings, via ON DELETE CASCADE) whose slug
 * is no longer present in `keepSlugs`.
 */
export function prunePackages(db: Database.Database, keepSlugs: string[]): number {
  if (keepSlugs.length === 0) {
    const result = db.prepare('DELETE FROM packages').run();
    return result.changes;
  }
  const placeholders = keepSlugs.map(() => '?').join(', ');
  const result = db.prepare(`DELETE FROM packages WHERE slug NOT IN (${placeholders})`).run(...keepSlugs);
  return result.changes;
}

/**
 * Search fixed-price packages for offerings similar to `query` — used by Daneel
 * to point leads at a productized, scoped option when one fits.
 */
export async function searchPackages(
  db: Database.Database,
  query: string,
  limit: number = 3,
): Promise<PackageResult[]> {
  const queryVec = await generateEmbedding(query);
  const queryHex = hexBlob(queryVec);

  type Row = {
    slug: string; distance: number; name: string;
    price: string; term: string; summary: string; url: string;
  };

  const rows = db.prepare(`
    SELECT p.slug, v.distance, p.name, p.price, p.term, p.summary, p.url
    FROM vec_package_embeddings v
    INNER JOIN packages p ON p.id = v.package_id
    WHERE v.embedding MATCH ${queryHex}
      AND k = ?
    ORDER BY v.distance ASC
  `).all(limit) as Row[];

  return rows.map(r => ({
    slug: r.slug,
    name: r.name,
    price: r.price,
    term: r.term,
    summary: r.summary,
    url: r.url,
    distance: r.distance,
  }));
}
