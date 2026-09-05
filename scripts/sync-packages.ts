#!/usr/bin/env tsx
/**
 * Build step: syncs src/content/packages/*.md into the agent SQLite DB
 * (packages + embeddings) so Daneel can search and cite fixed-price
 * packages when following up with leads.
 * Frontmatter supplies the structured fields; the markdown body is
 * included in the summary text so the agent can cite the prose too.
 * Safe to re-run — upserts by slug and prunes removed packages.
 */
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';
import { getDb } from '../src/lib/db.js';
import { upsertPackage, prunePackages } from '../src/lib/rag.js';
import { site } from '../src/data/site.js';

const PACKAGES_DIR = path.join(process.cwd(), 'src/content/packages');

async function sync() {
  const db = getDb();
  const files = (await readdir(PACKAGES_DIR)).filter(f => f.endsWith('.md'));

  const slugs: string[] = [];
  for (const file of files) {
    const slug = file.replace(/\.md$/, '');
    const raw = await readFile(path.join(PACKAGES_DIR, file), 'utf8');
    const { data, content } = matter(raw);

    if (!data.name || !data.price || !data.term || !data.blurb) {
      console.warn(`  Skipping ${file}: missing name, price, term, or blurb in frontmatter`);
      continue;
    }

    const features: string[] = Array.isArray(data.features) ? data.features : [];
    const summary = [
      data.blurb,
      '',
      'Includes:',
      ...features.map(f => `- ${f}`),
      '',
      content.trim(),
    ].join('\n');

    await upsertPackage(db, {
      slug,
      name: data.name,
      price: data.price,
      term: data.term,
      summary,
      url: `${site.url}${data.bookingUrl ?? '/contact/?topic=project'}`,
    });
    slugs.push(slug);
    console.log(`  Synced package: ${slug}`);
  }

  const pruned = prunePackages(db, slugs);
  if (pruned > 0) console.log(`  Pruned ${pruned} removed package(s)`);

  console.log(`Done. ${slugs.length} package(s) synced.`);
}

sync().catch(err => { console.error(err); process.exit(1); });
