#!/usr/bin/env tsx
/**
 * Build step: syncs src/data/packages.ts into the agent SQLite DB
 * (packages + embeddings) so Daneel can search and cite fixed-price
 * packages when following up with leads.
 * Safe to re-run — upserts by slug and prunes removed packages.
 */
import { getDb } from '../src/lib/db.js';
import { upsertPackage, prunePackages } from '../src/lib/rag.js';
import { packages } from '../src/data/packages.js';
import { site } from '../src/data/site.js';

async function sync() {
  const db = getDb();

  const slugs: string[] = [];
  for (const pkg of packages) {
    const summary = [pkg.blurb, '', 'Includes:', ...pkg.features.map(f => `- ${f}`)].join('\n');

    await upsertPackage(db, {
      slug: pkg.slug,
      name: pkg.name,
      price: pkg.price,
      term: pkg.term,
      summary,
      url: `${site.url}${pkg.bookingUrl}`,
    });
    slugs.push(pkg.slug);
    console.log(`  Synced package: ${pkg.slug}`);
  }

  const pruned = prunePackages(db, slugs);
  if (pruned > 0) console.log(`  Pruned ${pruned} removed package(s)`);

  console.log(`Done. ${slugs.length} package(s) synced.`);
}

sync().catch(err => { console.error(err); process.exit(1); });
