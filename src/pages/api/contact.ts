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

  if (fields.company_website) return redirect('/thank-you/?type=contact', 303);

  // Verify Turnstile CAPTCHA
  const turnToken = fields['cf-turnstile-response'];
  if (!turnToken || !(await verifyTurnstile(turnToken))) {
    return redirect('/contact/?error=1', 303);
  }

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
