import { defineCollection, z } from 'astro:content';

const caseStudies = defineCollection({
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.date(),
    client: z.string(),
    hero: z.string().optional(),
    heroAlt: z.string().optional(),
  }),
});

export const collections = { caseStudies };
