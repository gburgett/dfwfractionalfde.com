import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  // Server / DB
  DB_DIR:              z.string().default('./data'),
  HOST:                z.string().default('localhost'),
  PORT:                z.string().default('4321'),
  SUBMISSIONS_WEBHOOK: z.string().optional(),

  // Turnstile (CAPTCHA) — Cloudflare test keys work everywhere
  TURNSTILE_SITE_KEY:   z.string().default('0x4AAAAAADrnBAPF3d9yn8Ga'),
  TURNSTILE_SECRET_KEY: z.string().default('0x4AAAAAADrnBL0GjCTIQpbnsZfeqpNYoro'),

  // Agent
  EASYMAIL_EMAIL:       z.string().optional(),
  EASYMAIL_PASSWORD:    z.string().optional(),
  EASYMAIL_AGENT_EMAIL: z.string().optional(),
});

export const env = schema.parse(process.env);

/** Throws a descriptive error if any agent-required vars are missing. */
export function assertAgentEnv(): asserts env is typeof env & {
  EASYMAIL_EMAIL: string;
  EASYMAIL_PASSWORD: string;
} {
  const missing: string[] = [];
  if (!env.EASYMAIL_EMAIL)    missing.push('EASYMAIL_EMAIL');
  if (!env.EASYMAIL_PASSWORD) missing.push('EASYMAIL_PASSWORD');
  if (missing.length > 0) {
    throw new Error(`Missing required env vars: ${missing.join(', ')}`);
  }
}
