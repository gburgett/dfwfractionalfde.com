import type { APIRoute } from 'astro';
import { saveSubmission, readForm, isEmail } from '../../lib/submissions';

export const prerender = false;

export const POST: APIRoute = async ({ request, redirect }) => {
  const fields = await readForm(request);

  if (fields.company_website) return redirect('/thank-you/?type=contact', 303);

  if (!fields.name || !isEmail(fields.email) || !fields.message) {
    return redirect('/contact/?error=1', 303);
  }

  await saveSubmission('contact', {
    name: fields.name,
    email: fields.email,
    company: fields.company || '',
    topic: fields.topic || 'general',
    budget: fields.budget || '',
    message: fields.message,
  });

  return redirect('/thank-you/?type=contact', 303);
};

export const GET: APIRoute = ({ redirect }) => redirect('/contact/', 303);
