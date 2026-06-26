import Database from 'better-sqlite3';
import path from 'node:path';
import { mkdirSync } from 'node:fs';
import { env } from './env.js';

const DB_DIR = env.DB_DIR;
export const DB_PATH = path.join(DB_DIR, 'agent.db');

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (_db) return _db;
  mkdirSync(DB_DIR, { recursive: true });
  _db = new Database(DB_PATH);
  _db.pragma('journal_mode = WAL');
  _db.exec(`
    CREATE TABLE IF NOT EXISTS submissions (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      type           TEXT NOT NULL,
      received_at    TEXT NOT NULL,
      name           TEXT,
      email          TEXT,
      company        TEXT,
      topic          TEXT,
      budget         TEXT,
      message        TEXT,
      category       TEXT,
      category_notes TEXT,
      email_sent     INTEGER,
      processed_at   TEXT
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_submissions_unique
      ON submissions (type, email, received_at);
    CREATE INDEX IF NOT EXISTS idx_submissions_pending
      ON submissions (type, processed_at)
      WHERE processed_at IS NULL;

    CREATE TABLE IF NOT EXISTS inbound_emails (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      message_id     TEXT NOT NULL UNIQUE,
      imap_uid       INTEGER,
      received_at    TEXT NOT NULL,
      from_email     TEXT NOT NULL,
      from_name      TEXT,
      to_email       TEXT,
      subject        TEXT,
      body_text      TEXT,
      in_reply_to    TEXT,
      ref_chain      TEXT,
      category       TEXT,
      category_notes TEXT,
      reply_sent     INTEGER DEFAULT 0,
      processed_at   TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_inbound_pending
      ON inbound_emails (processed_at)
      WHERE processed_at IS NULL;
  `);

  // Migrate existing tables that predate the to_email column (safe to re-run)
  try {
    _db.exec('ALTER TABLE inbound_emails ADD COLUMN to_email TEXT');
  } catch {
    // column already exists — ignore
  }

  // Index on to_email — created after migration so it works on pre-existing DBs
  try {
    _db.exec('CREATE INDEX IF NOT EXISTS idx_inbound_to_email ON inbound_emails (to_email)');
  } catch {
    // column still missing somehow — ignore
  }

  return _db;
}
