import { defineCollection, z } from 'astro:content';

const caseStudies = defineCollection({
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.date(),
    client: z.string(),
  }),
});

export const collections = { caseStudies };
