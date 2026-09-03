/**
 * Fixed-price, productized packages.
 *
 * Single source of truth for:
 *   - the "Fixed price" rail on the homepage (src/pages/index.astro)
 *   - each package's own SEO landing page (src/pages/packages/[slug].astro)
 *   - the agent DB import (scripts/sync-packages.ts) so Daneel can cite them
 *
 * Keep `slug` stable — it keys the row in the agent DB and the page URL.
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
  /** One-line hook for the package's landing page, under the H1. */
  tagline: string;
  /** ~150-char, keyword-rich summary used as the landing page's <meta description>. */
  metaDescription: string;
  /** "Why this works for a small business" sections on the landing page. */
  smbWhy: { title: string; body: string }[];
  /** FAQ entries — also emitted as FAQPage structured data for search/AI answer engines. */
  faqs: { q: string; a: string }[];
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
    tagline: 'The fastest, lowest-risk way for a small business to find out where AI actually helps.',
    metaDescription:
      'A fixed-price, 3-day AI opportunity audit for small businesses. Get a ranked list of automation opportunities and a written roadmap — no subscription, no guesswork.',
    smbWhy: [
      {
        title: "You don't need to guess which AI tool to buy",
        body: "Most SMB owners' first move into AI is trial-and-error with a subscription tool that doesn't quite fit. I come to you first, watch how your team actually works, and find the two or three places where AI removes real, measured pain — before you spend a dollar on tooling.",
      },
      {
        title: 'A fixed price means no scope creep',
        body: "You know the cost and the timeline before I walk in the door: three days on-site, one price, one deliverable. There's no hourly clock running and no follow-on retainer required to get your report.",
      },
      {
        title: 'Independent advice, not a vendor pitch',
        body: "I'm not selling a platform or a license count. The recommendations in your report are ranked by what will actually move the needle for your team, whether that's a five-minute Zapier fix or a custom-built agent.",
      },
    ],
    faqs: [
      {
        q: 'How is this different from hiring a consulting firm?',
        a: "A consulting firm sells hours and a deck. This is a fixed price, a firm scope, and a person — me — who has actually built and shipped production AI systems. The output is a concrete, ranked list you can act on immediately, not a slide about 'AI strategy.'",
      },
      {
        q: 'Do I need an in-house engineer to act on the report?',
        a: "No. Many of the opportunities I identify are things your existing team or a low-code tool can implement directly. For the ones that need real engineering, I can bid a fixed-price project or you can bring the report to any developer.",
      },
      {
        q: "We're a small team — is this overkill for us?",
        a: "This package exists specifically for small and mid-sized businesses that don't have an internal AI or data team. The whole point is to get you an expert's eye for three days without hiring one full-time.",
      },
      {
        q: 'What happens after the audit?',
        a: "You keep the report either way. If you'd like me to build what I found, we can scope a fixed-price project or start a fractional engagement — there's no obligation to continue.",
      },
    ],
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
    tagline: 'Give your whole team AI tools to build with — without hiring an IT or platform team.',
    metaDescription:
      'Fixed-price Cloudflare OS setup for small businesses: a governed, audit-logged AI platform your team can build on, deployed and configured in one week.',
    smbWhy: [
      {
        title: "Your team gets AI tooling, not just an AI tool",
        body: "Most SMBs give employees a single chatbot subscription and hope for the best. Cloudflare OS is a platform: your team can build small automations and integrations themselves, on infrastructure that's actually governed, instead of pasting sensitive data into a browser tab.",
      },
      {
        title: 'Guardrails built in from day one',
        body: "Small businesses rarely have a security team to review every new AI tool. I configure spend limits, access scoping, and audit trails as part of setup, so you get the upside of self-serve AI without an open-ended bill or an unmonitored data leak.",
      },
      {
        title: 'You own it — no lock-in',
        body: "Everything I build lives in your Cloudflare tenant and your own source repositories. If you never hire me again, the platform and every automation on it keeps working and keeps belonging to you.",
      },
    ],
    faqs: [
      {
        q: 'What is Cloudflare OS?',
        a: "It's Cloudflare's AI-native business operating system — a platform where teams build internal tools, automations, and AI-driven workflows ('Skills' and 'Gadgets') with proper access control and observability, instead of everyone using disconnected point tools.",
      },
      {
        q: 'Do we need a technical team to use it after setup?',
        a: "No. Once configured, non-engineers on your team can build and adjust simple tools and dashboards themselves. I set up the guardrails; your team drives day-to-day use.",
      },
      {
        q: "We're a small business — do we really need governance and audit trails?",
        a: "If AI tools ever touch customer data, financials, or credentials, yes. It takes the same week to set up correctly as it does to set up carelessly, and it's much cheaper to build in from the start than to retrofit after an incident.",
      },
      {
        q: "What if we outgrow the initial setup?",
        a: "The platform is designed to grow with you. Additional Gatekeepers, Gadgets, dashboards, or data connections are straightforward fixed-price add-ons, or can be rolled into a fractional engagement if you want ongoing, continuous build.",
      },
    ],
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
    tagline: 'Never miss another call — without the cost of a full-time front desk hire.',
    metaDescription:
      'A fixed-price AI phone receptionist for small businesses: answers calls 24/7, routes and takes messages better than an IVR, and escalates emergencies to a human.',
    smbWhy: [
      {
        title: 'Staffing a phone line is expensive for a small team',
        body: "A receptionist costs real salary and benefits, and still can't cover nights, weekends, or lunch breaks. An AI receptionist answers every call immediately, at a fraction of the cost, so a missed call never becomes a lost customer.",
      },
      {
        title: "It's a real conversation, not an IVR maze",
        body: '"Press 1 for sales" trains customers to hang up. Callers talk to the agent in plain language, get routed correctly, and can leave detailed messages — a noticeably better experience for the person calling your business.',
      },
      {
        title: 'It knows when to hand off to a person',
        body: "Every workflow is built with clear escalation paths: urgent issues get routed to on-call staff immediately, and the agent never pretends to be human or promises something it can't do. You get automation where it helps and a human where it matters.",
      },
    ],
    faqs: [
      {
        q: 'Will callers know they are talking to AI?',
        a: "Yes — the agent introduces itself clearly. Callers still get routed correctly and can leave a message or reach a human, they just skip the frustrating IVR tree in between.",
      },
      {
        q: 'What happens with urgent or emergency calls?',
        a: "Workflows are built around your business's real escalation needs. For example, one client uses this to route active water or fire damage calls straight to on-call staff instead of a queue.",
      },
      {
        q: 'Do we own the system after it is built?',
        a: "Yes. You own the voice provider account and the source code outright. You can make tweaks and re-run tests any time, with or without me.",
      },
      {
        q: 'How much does it cost to run month to month?',
        a: "Typical usage runs around $0.07 per minute of call time through the voice provider — no software license or per-seat fee on top.",
      },
      {
        q: 'How long does it take to go live?',
        a: "2 to 4 weeks from kickoff to a working agent handling real calls, followed by 3 months of tuning against your actual call recordings to sharpen accuracy.",
      },
    ],
  },
];
