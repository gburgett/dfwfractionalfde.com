import Database from 'better-sqlite3';
import path from 'node:path';
import { mkdirSync } from 'node:fs';
import { load as loadVec } from 'sqlite-vec';
import { env } from './env.js';

const DB_DIR = env.DB_DIR;
export const DB_PATH = path.join(DB_DIR, 'agent.db');

const EMBEDDING_DIMS = 384;

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (_db) return _db;
  mkdirSync(DB_DIR, { recursive: true });
  _db = new Database(DB_PATH);
  _db.pragma('journal_mode = WAL');

  // ── Load sqlite-vec extension ──────────────────────────────────────
  loadVec(_db);

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

    -- Embedding storage (one row per inbound email)
    CREATE TABLE IF NOT EXISTS email_embeddings (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      email_id   INTEGER NOT NULL UNIQUE REFERENCES inbound_emails(id) ON DELETE CASCADE,
      embedding  BLOB NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_email_embeddings_email
      ON email_embeddings (email_id);

    -- vec0 virtual table for ANN search
    CREATE VIRTUAL TABLE IF NOT EXISTS vec_email_embeddings USING vec0(
      email_id INTEGER PRIMARY KEY,
      embedding FLOAT[${EMBEDDING_DIMS}]
    );
  `);

  // ── Migrations for pre-existing tables (safe to re-run) ────────────
  try { _db.exec('ALTER TABLE inbound_emails ADD COLUMN to_email TEXT'); } catch { /* exists */ }
  try { _db.exec('CREATE INDEX IF NOT EXISTS idx_inbound_to_email ON inbound_emails (to_email)'); } catch { /* exists */ }

  return _db;
}

/** Number of embedding dimensions used throughout the app. */
export function embeddingDims(): number {
  return EMBEDDING_DIMS;
}
