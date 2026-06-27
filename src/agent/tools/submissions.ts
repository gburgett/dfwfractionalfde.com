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
