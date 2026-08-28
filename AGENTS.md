# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # dev server at http://localhost:4321 (or https://dfwfractionalfde.exe.xyz via proxy)
npm run build     # build to dist/ (static pages + Node server bundle)
npm run preview   # serve the built site: node ./dist/server/entry.mjs
npm run deploy    # build + restart production server (writes PID to .server.pid, logs to server.log)
```

## Architecture

Static-first Astro site (`output: 'static'`) using the `@astrojs/node` standalone adapter. Every page is prerendered **except** the two API routes, which opt out with `export const prerender = false`:

- `src/pages/api/waitlist.ts` — waitlist form handler
- `src/pages/api/contact.ts` — contact/bid request handler

Both endpoints share the same pattern: honeypot check (`company_website` field) → field validation → `saveSubmission()` → redirect to `/thank-you/`.

### Key files to know

| File | Purpose |
|------|---------|
| `src/data/site.ts` | Site-wide config: `openClients` controls the availability badge; set `openClients: 0` for waitlist-only mode |
| `src/data/posts.ts` | Syndicated insights list (links back to gordonburgett.net) |
| `src/content/caseStudies/` | Markdown case studies rendered via `src/pages/case-studies/[slug].astro` using Astro content collections |
| `src/lib/submissions.ts` | Form persistence: appends JSONL to `./submissions/<type>.jsonl` and optionally POSTs to `SUBMISSIONS_WEBHOOK` |

### Environment variables (production)

| Variable | Default | Purpose |
|----------|---------|---------|
| `SUBMISSIONS_DIR` | `./submissions` | Directory for JSONL files |
| `SUBMISSIONS_WEBHOOK` | — | URL to POST each submission to (Slack, Make, Zapier, etc.) |
| `HOST` / `PORT` | `localhost:4321` | Node server bind address |

### `security.checkOrigin` is disabled

The Astro origin check is off in `astro.config.mjs` to avoid 403s from reverse-proxy `Host`/`X-Forwarded-Proto` mismatches. Spam mitigation relies solely on the honeypot field; add a CAPTCHA if spam becomes a problem.
