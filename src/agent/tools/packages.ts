import { Type } from "typebox";
import { defineTool } from "@earendil-works/pi-coding-agent";
import type Database from 'better-sqlite3';
import { searchPackages } from '../../lib/rag.js';

/** Shared by both agents — lets Daneel find and cite relevant fixed-price packages. */
export function createSearchPackagesTool(db: Database.Database) {
  return defineTool({
    name: 'search_packages',
    label: 'Search Fixed-Price Packages',
    description: 'Search Gordon\'s productized, fixed-price packages for one that fits what a lead is describing. Returns name, price, terms, what\'s included, and a booking link. Use this when someone wants a small, scoped, up-front-priced engagement rather than a subscription — so you can point them at a concrete package with a price.',
    parameters: Type.Object({
      query: Type.String({ description: 'What the lead wants done (e.g. "AI phone answering for after-hours calls", "help finding where to apply AI", "set up an internal AI platform")' }),
    }),
    execute: async (_toolCallId, params) => {
      try {
        const { query } = params;
        const results = await searchPackages(db, query);
        console.log(`[search_packages] "${query}" → ${results.length} result(s)`);
        const result = results.length > 0 ? results : { message: 'No matching fixed-price package. A custom fixed-price bid is still an option — direct them to /contact/?topic=project.' };
        return { content: [{ type: 'text' as const, text: JSON.stringify(result) }], details: {} };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error('[search_packages] failed:', msg);
        return { content: [{ type: 'text' as const, text: JSON.stringify({ error: msg }) }], details: {} };
      }
    },
  });
}
