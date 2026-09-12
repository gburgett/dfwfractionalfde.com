import { getCollection } from 'astro:content';
import type { Post } from '../data/posts';

/** Case studies from src/content/caseStudies/, as Post cards, newest first. */
export async function getCaseStudyPosts(): Promise<Post[]> {
  const entries = await getCollection('caseStudies');
  return entries
    .map<Post>((entry) => ({
      title: entry.data.title,
      url: `/case-studies/${entry.slug}/`,
      date: entry.data.date.toISOString().slice(0, 10),
      kind: 'Case Study',
      summary: entry.data.description,
      tags: ['case-study'],
    }))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}
