// @ts-check
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import sitemap from '@astrojs/sitemap';

// Static-first site with a couple of on-demand endpoints (waitlist + contact).
// Pages are prerendered by default; API routes opt out via `export const prerender = false`.
export default defineConfig({
  site: 'https://dfwfractionalfde.com',
  output: 'static',
  adapter: node({ mode: 'standalone' }),
  // Forms POST to same-origin endpoints. Astro's origin check relies on the
  // reverse proxy forwarding Host/X-Forwarded-Proto correctly; disabling it
  // avoids false 403s across proxy setups. The endpoints use a honeypot field.
  security: { checkOrigin: false },
  vite: {
    server: {
      allowedHosts: ['dfwfractionalfde.exe.xyz'],
    },
  },
  integrations: [sitemap()],
});
