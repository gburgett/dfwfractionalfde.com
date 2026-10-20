# DFW Fractional FDE

Marketing site for **Gordon Burgett**, a fractional AI engineer serving Dallas–Fort Worth.
Built with [Astro](https://docs.astro.build) as a fully static site and hosted on
GitHub Pages at **https://dfwfractionalfde.com**.

## What's here

| Page | Purpose |
|------|---------|
| `/` | Hero, how the engagement works, fixed-price packages, case studies |
| `/how-it-works/` | The engagement model, on-site → embed → ship → maintenance |
| `/pricing/` | Subscription, maintenance, and fixed-price project bids. No prices published |
| `/about/` | Bio and background |
| `/insights/` | Case studies and writing syndicated from gordonburgett.net |
| `/waitlist/` | Start an engagement, or join the waitlist when the practice is full |
| `/contact/` | Firm fixed-price project bid request / maintenance enquiry |
| `/thank-you/` | Post-submit confirmation (not indexed) |

## Develop

```bash
pnpm install
pnpm run dev        # http://localhost:4321
```

## Build

```bash
pnpm run build      # static files in dist/
pnpm run preview    # serve dist/ locally
```

Pages are built with trailing slashes (`/about/` → `dist/about/index.html`).
`src/pages/404.astro` becomes `dist/404.html`.

## Deploy

Pushing to `main` runs `.github/workflows/pages.yml`, which builds the site and
deploys `dist/` to GitHub Pages. In the repo settings, Pages source must be
**GitHub Actions**. `public/CNAME` sets the custom domain.

The repository has to be public, or on a plan that includes GitHub Pages for private repos.

## Forms

Contact and waitlist forms POST to [Web3Forms](https://web3forms.com). They share one
access key and a `botcheck` honeypot. After a successful submit, Web3Forms redirects
to `/thank-you/?type=contact` or `/thank-you/?type=waitlist` on the host that served
the page.

## Updating availability

Edit `src/data/site.ts`:

- `openClients` — set to `0` for "currently full / waitlist only". Any value > 0
  flips the availability badge to "accepting new engagements".
- `minEngagementMonths` — the stated minimum engagement (currently **6**).

## Updating syndicated content

Edit `src/data/posts.ts`. Each entry links back to the canonical post on
`https://gordonburgett.net`.

## Updating fixed-price packages

Edit the Markdown files in `src/content/packages/`. Frontmatter drives the homepage
rail and each package page. The filename is the URL slug — keep it stable.
