import type { APIRoute } from 'astro';
import { saveSubmission, readForm, isEmail } from '../../lib/submissions';
import { env } from '../../lib/env';

export const prerender = false;

async function verifyTurnstile(token: string): Promise<boolean> {
  try {
    const resp = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        secret: env.TURNSTILE_SECRET_KEY,
        response: token,
      }),
    });
    const data = await resp.json() as { success: boolean };
    return data.success;
  } catch {
    return false;
  }
}

export const POST: APIRoute = async ({ request, redirect }) => {
  const fields = await readForm(request);

  // Honeypot: real users never fill this hidden field.
  if (fields.company_website) return redirect('/thank-you/?type=waitlist', 303);

  const turnToken = fields['cf-turnstile-response'];
  if (!turnToken || !(await verifyTurnstile(turnToken))) {
    return redirect('/waitlist/?error=1', 303);
  }

  if (!fields.name || !isEmail(fields.email)) {
    return redirect('/waitlist/?error=1', 303);
  }

  await saveSubmission('waitlist', {
    name: fields.name,
    email: fields.email,
    company: fields.company || '',
    industry: fields.industry || '',
    timeline: fields.timeline || '',
    budget: fields.budget || '',
    message: fields.message || '',
    source: fields.source || '',
  });

  return redirect('/thank-you/?type=waitlist', 303);
};

// Gracefully handle accidental GETs.
export const GET: APIRoute = ({ redirect }) => redirect('/waitlist/', 303);
