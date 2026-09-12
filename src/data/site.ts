export const site = {
  name: 'DFW Fractional FDE',
  brand: 'Fractional Forward Deployed Engineer',
  domain: 'dfwfractionalfde.com',
  url: 'https://dfwfractionalfde.com',
  region: 'Dallas–Fort Worth',
  tagline:
    'A senior engineer embedded in your business — building, shipping, and deploying AI-native software, on-site in DFW.',
  owner: {
    name: 'Gordon Burgett',
    role: 'Director of Software Engineering',
    altRole: 'Director, HealthShare Technology Solutions',
    personalSite: 'https://gordonburgett.net',
    headshot: 'https://gordonburgett.net/images/headshot.jpg',
  },
  // Availability — set openClients to 0 for waitlist-only mode, or a positive
  // number when actively accepting new engagements. The number itself is
  // never shown publicly (site copy only branches on >0 vs 0); it's also fed
  // to the inbound/follow-up agent prompts as an internal signal only.
  openClients: 1, // accepting new engagements
  minEngagementMonths: 6,
  // Internal only — prices are never rendered on the site. Fed to Daneel so he
  // can quote them when a lead asks.
  pricing: {
    subscription: { monthly: '$6,995', hoursPerMonth: 40 },
    maintenance: { monthly: '$999', hoursPerMonth: 6 },
  },
  contactEmail: 'gordon@dfwfractionalfde.com',
};

export type NavItem = { label: string; href: string };

export const nav: NavItem[] = [
  { label: 'How it works', href: '/how-it-works/' },
  { label: 'Pricing', href: '/pricing/' },
  { label: 'Insights', href: '/insights/' },
  { label: 'About', href: '/about/' },
  { label: site.openClients > 0 ? 'Start an engagement' : 'Join the waitlist', href: '/waitlist/' },
];
