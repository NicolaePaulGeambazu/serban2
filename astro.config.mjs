import { defineConfig } from 'astro/config';

// Update this to your real domain before deploying.
export const SITE = 'https://topalegeri.ro';

export default defineConfig({
  site: SITE,
  build: { inlineStylesheets: 'auto', format: 'directory' },
  compressHTML: true,
  // Prefetch linked pages on hover for near-instant navigation.
  prefetch: { prefetchAll: true, defaultStrategy: 'hover' },
});
