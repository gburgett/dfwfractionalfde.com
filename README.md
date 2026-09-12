# DFW Fractional FDE

Marketing + waitlist site for **Gordon Burgett — Fractional Forward Deployed Engineer** serving
Dallas–Fort Worth. Built with [Astro](https://docs.astro.build). Hosted at
**https://dfwfractionalfde.com**.

## What's here

| Page | Purpose |
|------|---------|
| `/` | Hero, the "Fractional FDE" positioning, capabilities, how-it-works teaser, syndicated insights |
| `/how-it-works/` | The engagement model, on-site → embed → ship → maintenance |
| `/pricing/` | Three panes — **Maintenance only ($999/mo, ≤6 hrs)**, **Subscription ($6,995/mo, featured)**, **Project bid (fixed price)** |
| `/about/` | Bio, capabilities, and tech stack pulled from gordonburgett.net |
| `/insights/` | Articles & projects syndicated from gordonburgett.net |
| `/waitlist/` | Waitlist signup form (currently the only way in — waitlist-only) |
| `/contact/` | Firm fixed-price project bid request / maintenance enquiry |
| `/thank-you/` | Post-submit confirmation |

## Develop

```bash
pnpm install
pnpm run dev        # http://localhost:4321
```

## Build & run

```bash
pnpm run build      # outputs dist/ (static pages + Node server for the two form endpoints)
pnpm run preview    # serves the built site: node ./dist/server/entry.mjs
```

The site is **static-first**. Only two routes are rendered on demand:
`/api/waitlist` and `/api/contact`. They are served by the bundled Node server
(`@astrojs/node`, standalone). Run it behind your reverse proxy / process manager.

## Where signups go

Form submissions are appended as JSON Lines to `./submissions/waitlist.jsonl` and
`./submissions/contact.jsonl`. Configure delivery with environment variables:

| Variable | Purpose |
|----------|---------|
| `SUBMISSIONS_DIR` | Directory for the JSONL files (default `./submissions`) |
| `SUBMISSIONS_WEBHOOK` | Optional URL each submission is also POSTed to (Slack / Make / Zapier / inbox-as-a-service) |
| `HOST` / `PORT` | Bind address for the Node server (default `localhost:4321`) |

Each form includes a hidden honeypot field (`company_website`); submissions that fill
it are silently accepted but never stored.

## Updating availability & capacity

Edit `src/data/site.ts`:

- `openClients` — set to `0` for "currently full / waitlist only". Any value > 0
  flips the availability badge to "accepting new engagements".
- `minEngagementMonths` — the stated minimum engagement (currently **6**).

## Updating syndicated content

Edit `src/data/posts.ts`. Each entry links back to the canonical post on
`https://www.gordonburgett.net`.

## Updating fixed-price packages

Edit `src/data/packages.ts` — it's the single source of truth for both the
homepage "Fixed price" rail and the agent DB import. `pnpm run build` runs
`db:sync-packages`, which upserts each package (by `slug`) into the agent
SQLite DB with an embedding so Daneel can search and cite them in lead
follow-ups. Removing a package from the file prunes it from the DB on the
next build.

## Notes

- `security.checkOrigin` is disabled in `astro.config.mjs` so the same-origin forms
  work regardless of how the reverse proxy forwards `Host`/`X-Forwarded-Proto`.
  Spam is mitigated with the honeypot; add a CAPTCHA later if needed.
