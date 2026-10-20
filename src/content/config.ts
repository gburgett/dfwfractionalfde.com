import { defineCollection, z } from 'astro:content';

const caseStudies = defineCollection({
  schema: ({ image }) => z.object({
    title: z.string(),
    description: z.string(),
    date: z.date(),
    client: z.string().optional(),
    hero: image().optional(),
    heroAlt: z.string().optional(),
  }),
});

const packages = defineCollection({
  schema: ({ image }) => z.object({
    /** Controls display order on the homepage rail (lower = first). */
    order: z.number(),
    name: z.string(),
    /** Display price, e.g. "$4,750". */
    price: z.string(),
    /** Short terms line, e.g. "fixed · 3 days onsite". */
    term: z.string(),
    image: image(),
    imageAlt: z.string(),
    /** Plain-text description (no markup) shown on the homepage card and detail page. */
    blurb: z.string(),
    /** Bullet list of what's included / delivered. */
    features: z.array(z.string()),
    /** Where the "Book this" CTA points. */
    bookingUrl: z.string(),
    /** Optional related case study slug (rendered as a link in the blurb area). */
    caseStudySlug: z.string().optional(),
    caseStudyLinkText: z.string().optional(),
    /** One-line hook for the package's landing page, under the H1. */
    tagline: z.string(),
    /** ~150-char, keyword-rich summary used as the landing page's <meta description>. */
    metaDescription: z.string(),
    /** FAQ entries — also emitted as FAQPage structured data for search/AI answer engines. */
    faqs: z.array(z.object({ q: z.string(), a: z.string() })),
  }),
});

export const collections = { caseStudies, packages };
