# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm run dev       # dev server at http://localhost:4321
pnpm run build     # static build to dist/
pnpm run preview   # serve the built site locally
```

Pushing to `main` deploys via GitHub Actions (`.github/workflows/pages.yml`) to GitHub Pages.

## Architecture

Fully static Astro site (`output: 'static'`, `trailingSlash: 'always'`). There is no server, adapter, or API route. `src/pages/404.astro` builds to `dist/404.html`, which GitHub Pages uses as the custom 404.

Contact (`src/pages/contact.astro`) and waitlist (`src/pages/waitlist.astro`) forms POST to Web3Forms. Each form has a `botcheck` honeypot checkbox. A small script sets the redirect to `${location.origin}/thank-you/?type=contact` or `?type=waitlist`.

### Key files to know

| File | Purpose |
|------|---------|
| `src/data/site.ts` | Site-wide config: `openClients` controls the availability badge; set `openClients: 0` for waitlist-only mode |
| `src/data/posts.ts` | Syndicated insights list (links back to gordonburgett.net) |
| `src/content/packages/` | Fixed-price packages as Markdown: frontmatter (structured card data, FAQs) powers the homepage "Fixed price" rail and package landing pages. Filename = slug — keep it stable |
| `src/content/caseStudies/` | Markdown case studies rendered via `src/pages/case-studies/[slug].astro` using Astro content collections |
| `public/CNAME` | GitHub Pages custom domain (`dfwfractionalfde.com`) |
| `public/llms.txt` | Short plain-language summary for answer engines |
| `src/layouts/Base.astro` | Default title, description, Open Graph, and site-wide JSON-LD |

Prices are not published on the site.
