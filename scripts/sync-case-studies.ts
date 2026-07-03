#!/usr/bin/env tsx
/**
 * Build step: syncs src/content/caseStudies/*.md into the agent SQLite DB
 * (case_studies + embeddings) so Daneel can search past case studies via RAG.
 * Safe to re-run — upserts by slug and prunes deleted files.
 */
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { getDb } from '../src/lib/db.js';
import { upsertCaseStudy, pruneCaseStudies } from '../src/lib/rag.js';
import { site } from '../src/data/site.js';

const CASE_STUDIES_DIR = path.join(process.cwd(), 'src/content/caseStudies');

/** Minimal frontmatter parser for the flat `key: value` format used in these files. */
function parseFrontmatter(raw: string): { data: Record<string, string>; content: string } {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return { data: {}, content: raw };

  const [, frontmatter, content] = match;
  const data: Record<string, string> = {};
  for (const line of frontmatter.split('\n')) {
    const lineMatch = line.match(/^(\w+):\s*(.*)$/);
    if (!lineMatch) continue;
    const [, key, rawValue] = lineMatch;
    data[key] = rawValue.trim().replace(/^"(.*)"$/, '$1');
  }
  return { data, content: content.trim() };
}

async function sync() {
  const db = getDb();
  const files = (await readdir(CASE_STUDIES_DIR)).filter(f => f.endsWith('.md'));

  const slugs: string[] = [];
  for (const file of files) {
    const slug = file.replace(/\.md$/, '');
    const raw = await readFile(path.join(CASE_STUDIES_DIR, file), 'utf8');
    const { data, content } = parseFrontmatter(raw);

    if (!data.title || !data.description) {
      console.warn(`  Skipping ${file}: missing title or description in frontmatter`);
      continue;
    }

    await upsertCaseStudy(db, {
      slug,
      title: data.title,
      description: data.description,
      client: data.client ?? null,
      url: `${site.url}/case-studies/${slug}/`,
      content,
    });
    slugs.push(slug);
    console.log(`  Synced case study: ${slug}`);
  }

  const pruned = pruneCaseStudies(db, slugs);
  if (pruned > 0) console.log(`  Pruned ${pruned} removed case study/studies`);

  console.log(`Done. ${slugs.length} case study/studies synced.`);
}

sync().catch(err => { console.error(err); process.exit(1); });
