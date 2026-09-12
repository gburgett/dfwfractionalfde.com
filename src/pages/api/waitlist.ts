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
    const data = await resp.json() as { success: boolean; 'error-codes'?: string[] };
    if (!data.success) {
      console.error('[turnstile] siteverify failed:', JSON.stringify(data['error-codes'] || data));
    }
    return data.success;
  } catch (err) {
    console.error('[turnstile] siteverify error:', err);
    return false;
  }
}

export const POST: APIRoute = async ({ request, redirect }) => {
  const fields = await readForm(request);

  // Honeypot: real users never fill this hidden field.
  if (fields.company_website) return redirect('/thank-you/?type=waitlist', 303);

  // Turnstile is advisory, not a gate: the widget can fail to produce a token
  // on some devices (notably iOS Safari hitting a Cloudflare-side glitch), and
  // a lost lead is worse than the occasional bot slipping past the honeypot.
  const turnToken = fields['cf-turnstile-response'];
  let turnstileVerified = 'skipped';
  if (!turnToken) {
    console.error('[turnstile] missing token in submission (widget likely never rendered), UA:', request.headers.get('user-agent'));
  } else if (await verifyTurnstile(turnToken)) {
    turnstileVerified = 'true';
  } else {
    console.error('[turnstile] token rejected, UA:', request.headers.get('user-agent'));
    turnstileVerified = 'false';
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
    turnstileVerified,
  });

  return redirect('/thank-you/?type=waitlist', 303);
};

// Gracefully handle accidental GETs.
export const GET: APIRoute = ({ redirect }) => redirect('/waitlist/', 303);
