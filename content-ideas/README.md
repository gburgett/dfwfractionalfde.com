# Content ideas

Working notes for Gordon Burgett's social posts and blog drafts. One markdown file per idea.

This folder is **not site content**. It lives at the repo root, outside `src/` and `public/`. Astro only builds pages from `src/pages/`, content collections registered in `src/content/config.ts` (`caseStudies` and `packages`), and files copied from `public/`. The agent import scripts only read `src/content/caseStudies/` and `src/content/packages/`. Nothing in here is rendered, synced into the agent database, or deployed.

Keep it that way. Do not move these notes under `src/` or `public/`.

## Positioning

Write for this, and cut anything that drifts off it:

Gordon is a fractional AI engineer on **10 hrs/wk retainers**. He helps small and mid-size businesses with:

- AI-connected company knowledgebases
- custom and customizable CRMs
- a strategic thought partner on using AI to grow revenue, including go-to-market engineering

**ICP**

- SMBs with little or no IT capability, often with an MSP that isn't creative or responsive, and ready to make a strategic AI investment
- Companies building an AI feature into their product who need help with evals

## File format

Filename is a stable kebab-case slug (`making-my-ai-test-set-harder-on-purpose.md`). Don't rename a file once it exists; status changes go in the header.

```markdown
---
title: Short title
status: idea
platforms:
  - LinkedIn
  - X
  - Facebook
  - blog
source: Where the idea came from
confidentiality: public-ok
created: 2026-10-19
---

## Angle

Who this is for and the point of the piece.

## Draft

### LinkedIn

Draft text, if any. Omit this section when there is no draft yet.

## Notes

Open questions, what to leave out, checks to do before posting.
```

| Field | Values |
|-------|--------|
| `title` | Working title |
| `status` | `idea`, `drafted`, `scheduled`, `posted` |
| `platforms` | Any of LinkedIn, X, Facebook, blog. Use `[]` until a channel is chosen. |
| `source` | Where the idea came from (a public repo, a conversation, private work described only in general) |
| `confidentiality` | `public-ok` or `needs-gordon-ok` |
| `created` | Date the note was added (`YYYY-MM-DD`) |

`needs-gordon-ok` means the idea draws on private work. Do not post it until Gordon has said the draft is safe. `public-ok` means either the source is already public (for example the [kroger-mealplanner](https://github.com/gburgett/kroger-mealplanner) repo) and the note stays inside that public material, or the lesson can be told with no client, employer, vendor, or metric attached. If a draft needs any of those, switch it to `needs-gordon-ok`.

## What never goes in a note

No specific security findings, infrastructure details, IP addresses, PHI examples, client or employer names, or private metrics. Describe the principle or the owner-facing lesson, not the engagement.

The AMS evaluation notes follow two extra naming rules. Never name the client agency, and never name the legacy vendor. Employee Navigator may be named as the benefits-admin integration when the agency stays unnamed. Any note that names Zywave is `needs-gordon-ok`.

When a post needs a real knowledgebase or CRM story, use the placeholder note and wait for an anonymized version from Gordon. Do not invent one.
