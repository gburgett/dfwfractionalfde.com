import { Type } from "typebox";
import { defineTool } from "@earendil-works/pi-coding-agent";
import type Database from 'better-sqlite3';
import { searchCaseStudies } from '../../lib/rag.js';

/** Shared by both agents — lets Daneel find and cite relevant past case studies. */
export function createSearchCaseStudiesTool(db: Database.Database) {
  return defineTool({
    name: 'search_case_studies',
    label: 'Search Case Studies',
    description: 'Search Gordon\'s past case studies for projects similar to what a lead is describing. Returns title, client, description, and a link to the published case study. Use this when following up on a warm lead so you can cite a relevant, concrete example of similar work — with a link.',
    parameters: Type.Object({
      query: Type.String({ description: 'What kind of project or problem to find a similar case study for (e.g. "AI agent for healthcare paperwork", "unstructured data import pipeline")' }),
    }),
    execute: async (_toolCallId, params) => {
      try {
        const { query } = params;
        const results = await searchCaseStudies(db, query);
        console.log(`[search_case_studies] "${query}" → ${results.length} result(s)`);
        const result = results.length > 0 ? results : { message: 'No relevant case studies found.' };
        return { content: [{ type: 'text' as const, text: JSON.stringify(result) }], details: {} };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error('[search_case_studies] failed:', msg);
        return { content: [{ type: 'text' as const, text: JSON.stringify({ error: msg }) }], details: {} };
      }
    },
  });
}
