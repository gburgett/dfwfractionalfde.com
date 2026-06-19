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
  // Capacity / availability — update these two values as the business changes.
  maxClients: 5,
  openClients: 0, // currently taking zero clients -> waitlist only
  minEngagementMonths: 6,
  contactEmail: 'gordon@dfwfractionalfde.com',
};

export type NavItem = { label: string; href: string };

export const nav: NavItem[] = [
  { label: 'How it works', href: '/how-it-works/' },
  { label: 'Pricing', href: '/pricing/' },
  { label: 'Insights', href: '/insights/' },
  { label: 'About', href: '/about/' },
  { label: 'Join the waitlist', href: '/waitlist/' },
];
