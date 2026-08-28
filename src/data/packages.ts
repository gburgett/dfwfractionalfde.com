/**
 * Fixed-price, productized packages.
 *
 * Single source of truth for:
 *   - the "Fixed price" rail on the homepage (src/pages/index.astro)
 *   - the agent DB import (scripts/sync-packages.ts) so Daneel can cite them
 *
 * Keep `slug` stable — it keys the row in the agent DB.
 */
export interface Package {
  slug: string;
  name: string;
  /** Display price, e.g. "$4,750". */
  price: string;
  /** Short terms line, e.g. "fixed · 3 days onsite". */
  term: string;
  image: string;
  imageAlt: string;
  /** Plain-text description (no markup). */
  blurb: string;
  /** Bullet list of what's included / delivered. */
  features: string[];
  /** Where the "Book this" CTA points. */
  bookingUrl: string;
  /** Optional related case study slug (rendered as a link in the blurb area). */
  caseStudySlug?: string;
  caseStudyLinkText?: string;
}

export const packages: Package[] = [
  {
    slug: 'process-map',
    name: 'Map your business processes',
    price: '$4,750',
    term: 'fixed · 3 days onsite',
    image: '/data-flow-diagram.webp',
    imageAlt: 'Annotated diagram of data moving between business systems',
    blurb:
      'I sit with your team and find where AI could really help. You get a report with specific opportunities and actionable solutions.',
    features: [
      'Annotated flow map of your business processes',
      'Ranked list of automation candidates',
      'Written walkthrough with your team',
      '3rd party solutions identified',
    ],
    bookingUrl: '/contact/?topic=project',
  },
  {
    slug: 'cloudflare-os-setup',
    name: 'Install & configure Cloudflare OS',
    price: '$3,950',
    term: 'fixed · 1 week',
    image: '/cloudflare-os-card-2.png',
    imageAlt: 'Cloudflare OS analytics dashboard',
    blurb:
      'The new AI-native business operating system. Cloudflare OS enables your entire team to build tools and integrations, automate processes, and collaborate on skills. I deploy it into your Cloudflare tenant and configure governance rules, audit trails, and spend limits.',
    features: [
      'Provisioned and access-scoped for your org',
      'Connected to your data sources',
      '2 working dashboards or reports pulled from your data',
      'Up to 2 custom Gatekeepers or Gadgets',
      'Source code lives in your repositories',
    ],
    bookingUrl: '/contact/?topic=project',
  },
  {
    slug: 'ai-phone-receptionist',
    name: 'AI Phone Receptionist',
    price: '$9,250',
    term: 'fixed · 2-4 weeks',
    image: '/servpro-agent-conversation.png',
    imageAlt: 'Transcript of a caller talking with the ServPro AI voice agent',
    blurb:
      'Genuinely helpful AI inbound voice receptionist handling first-layer or after-hours support. Routes inbound calls better than an IVR tree, handles simple message-taking tasks, and escalates to human support.',
    features: [
      '3 months of follow-up fine tuning on real recorded conversations',
      'Connected to your system of record',
      'You own the voice provider account and source code',
    ],
    bookingUrl: '/contact/?topic=project',
    caseStudySlug: 'servpro-voice-agent',
    caseStudyLinkText: 'See how I built this for ServPro →',
  }
];
