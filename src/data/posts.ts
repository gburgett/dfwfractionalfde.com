// Content syndicated from Gordon Burgett's personal site (gordonburgett.net).
// Curated to the engineering / AI work that's most relevant to prospective clients.
export type Post = {
  title: string;
  url: string;
  date: string; // ISO
  kind: 'Article' | 'Project' | 'Case Study' | 'Link';
  summary: string;
  tags?: string[];
};

export const caseStudies: Post[] = [
  {
    title: 'Building Alice, an Empowering AI Agent',
    url: '/case-studies/building-alice/',
    date: '2026-03-18',
    kind: 'Case Study',
    summary:
      'What it looks like to build AI agents that actually empower people instead of just "augmenting" them — built for HealthShare Technology Solutions.',
    tags: ['case-study'],
  },
  {
    title: 'Building an Unstructured Data Import',
    url: '/case-studies/unstructured-data-import/',
    date: '2024-11-16',
    kind: 'Case Study',
    summary:
      'Sometimes the hardest question is not how to apply a new technology, but when not to. A pragmatic case study on knowing where AI helps and where it hurts.',
    tags: ['case-study'],
  },
];

export const articles: Post[] = [
  {
    title: 'Pushing Claude Code Further with Spec Driven Development',
    url: 'https://gordonburgett.net/posts/2026/03_spec-driven-development/',
    date: '2026-03-20',
    kind: 'Article',
    summary:
      'How to let an AI agent run for hours and return secure, well-tested, correct code — by reviewing high-level decisions instead of every line. A practical look at spec-driven development with coding agents.',
  },
  {
    title: 'Implementing Licensing & Permissions in a React Redux App',
    url: 'https://gordonburgett.net/posts/2024/10_voir-dire-licensing-modal/',
    date: '2024-10-20',
    kind: 'Article',
    summary:
      'Enforcing licensing requirements as a cross-cutting concern in the VoirDire App — a real production engineering problem and the architecture behind the fix.',
  },
  {
    title: 'Thoughts on Cursor',
    url: 'https://gordonburgett.net/posts/2024/09_thoughts-on-cursor/',
    date: '2024-09-20',
    kind: 'Article',
    summary:
      'Months of using Cursor, an AI-powered code editor, and how AI-native tooling has reshaped a senior engineer\u2019s daily workflow.',
  },
];

export const projects: Post[] = [
  {
    title: 'HealthShare Technology Solutions',
    url: 'https://gordonburgett.net/projects/healthshare-technology-solutions/',
    date: '2024-11-16',
    kind: 'Project',
    summary:
      'Helping churches and ministries navigate the complexities of healthcare cost-sharing with custom software and AI agents.',
  },
  {
    title: 'VoirDire App',
    url: 'https://gordonburgett.net/projects/voir-dire-app/',
    date: '2024-10-20',
    kind: 'Project',
    summary:
      'A React/Redux jury-selection application built for a legal-services client, with licensing, permissions, and a polished cross-platform UX.',
  },
  {
    title: 'Neighbor Solutions',
    url: 'https://gordonburgett.net/projects/neighbor-solutions/',
    date: '2024-08-02',
    kind: 'Project',
    summary:
      'Product engineering and data import work for Neighbor Solutions — turning messy real-world data into a reliable platform.',
  },
];

export const links: Post[] = [
  {
    title: 'Enterprise-Managed Auth for MCP servers',
    url: 'https://blog.modelcontextprotocol.io/posts/enterprise-managed-auth/',
    date: '2026-06-19',
    kind: 'Link',
    summary: `
      MCP servers are the standard way to hook up your personal agents, but authentication is all over the place.
      This is a great way to standardize agent authentication across your organization.
    `,
  },
  {
    title: 'AI is Technology, Not a Product',
    url: 'https://daringfireball.net/2026/05/ai_is_technology_not_a_product',
    date: '2026-06-05',
    kind: 'Link',
    summary: `
      "How do we use more AI" is the wrong question.  AI is not a product - 60% of US consumers say AI in a brand's messaging is a turnoff.
      Ask yourself what you want to achieve, then ask if AI is the right fit.
    `,
  },
  {
    title: 'Uber sets AI usage limits',
    url: 'https://simonwillison.net/2026/Jun/3/uber-caps-usage/',
    date: '2026-06-03',
    kind: 'Link',
    summary: `
      Uber blew through their yearly AI budget in 4 months and had to set per-engineer limits.
      Will your business processes survive if you have to pay full freight for tokens, or are you dependent on the VC subsidized subscription plans?
    `,
  },
  {
    title: 'Making AI Work: Leadership, Lab, and Crowd',
    url: 'https://www.oneusefulthing.org/p/making-ai-work-leadership-lab-and',
    date: '2026-06-03',
    kind: 'Link',
    summary: `
      AI absolutely boosts employee work performance.  But is your company capturing those productivity gains?
      Managing innovation and adoption of AI in a strategic way is going to require transformative leadership from your company.
    `,
  },
];

function byDateDesc(a: Post, b: Post) {
  return new Date(b.date).getTime() - new Date(a.date).getTime();
}

export const posts: Post[] = [...caseStudies, ...articles, ...projects, ...links].sort(
  byDateDesc
);
