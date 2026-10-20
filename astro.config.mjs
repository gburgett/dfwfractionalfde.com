// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// Fully static site. GitHub Pages serves directory URLs (/about/ → about/index.html).
export default defineConfig({
  site: 'https://dfwfractionalfde.com',
  output: 'static',
  trailingSlash: 'always',
  build: {
    format: 'directory',
  },
  integrations: [sitemap()],
});
