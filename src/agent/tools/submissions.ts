import type Database from 'better-sqlite3';

export interface Submission {
  id: number;
  type: string;
  name: string;
  email: string;
  company: string;
  topic: string;
  budget: string;
  message: string;
  receivedAt: string;
}

type Row = {
  id: number;
  type: string;
  name: string | null;
  email: string | null;
  company: string | null;
  topic: string | null;
  budget: string | null;
  message: string | null;
  received_at: string;
};

export function getPendingSubmissions(db: Database.Database): Submission[] {
  const rows = db.prepare(`
    SELECT id, type, name, email, company, topic, budget, message, received_at
    FROM submissions
    WHERE processed_at IS NULL
    ORDER BY received_at ASC
  `).all() as Row[];

  return rows.map(r => ({
    id: r.id,
    type: r.type,
    name: r.name ?? '',
    email: r.email ?? '',
    company: r.company ?? '',
    topic: r.topic ?? 'general',
    budget: r.budget ?? '',
    message: r.message ?? '',
    receivedAt: r.received_at,
  }));
}

export interface PriorSubmission {
  type: string;
  receivedAt: string;
  topic: string;
  emailSent: boolean;
}

type PriorRow = {
  type: string;
  received_at: string;
  topic: string | null;
  email_sent: number | null;
};

/**
 * All submissions (contact or waitlist, processed or not) on file for an email
 * address — lets Daneel check whether someone has already submitted the
 * waitlist/contact form before inviting them to fill it out (again).
 */
export function getSubmissionsForEmail(db: Database.Database, email: string): PriorSubmission[] {
  const rows = db.prepare(`
    SELECT type, received_at, topic, email_sent
    FROM submissions
    WHERE LOWER(email) = LOWER(?)
    ORDER BY received_at ASC
  `).all(email) as PriorRow[];

  return rows.map(r => ({
    type: r.type,
    receivedAt: r.received_at,
    topic: r.topic ?? 'general',
    emailSent: !!r.email_sent,
  }));
}
