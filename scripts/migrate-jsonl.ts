#!/usr/bin/env tsx
/**
 * One-time migration: imports existing JSONL submissions into SQLite.
 * Safe to re-run — duplicate rows are silently ignored via the unique index.
 */
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { getDb } from '../src/lib/db.js';

const DIR = process.env.SUBMISSIONS_DIR ?? './submissions';

async function migrate() {
  const db = getDb();

  for (const type of ['contact', 'waitlist']) {
    const file = `${DIR}/${type}.jsonl`;
    if (!existsSync(file)) {
      console.log(`  ${file} not found, skipping.`);
      continue;
    }

    const raw = await readFile(file, 'utf8');
    const rows = raw.trim().split('\n').filter(Boolean).map(l => JSON.parse(l) as Record<string, string>);

    const insert = db.prepare(`
      INSERT OR IGNORE INTO submissions (type, received_at, name, email, company, topic, budget, message)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertAll = db.transaction((items: typeof rows) => {
      for (const r of items) {
        insert.run(
          r.type ?? type,
          r.receivedAt,
          r.name ?? null,
          r.email ?? null,
          r.company ?? null,
          r.topic ?? null,
          r.budget ?? null,
          r.message ?? null,
        );
      }
    });

    insertAll(rows);
    console.log(`  Migrated ${rows.length} ${type} submission(s) from ${file}`);
  }

  console.log('Done.');
}

migrate().catch(err => { console.error(err); process.exit(1); });
