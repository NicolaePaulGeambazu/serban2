import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { execSync } from 'node:child_process';
import { site } from '../data/site';

// One site-wide lastmod for every URL: the date of the latest git commit.
// Any real change (title tweak, code, content) is a commit, so it refreshes
// every page's lastmod at once — exactly the "one change → all pages fresh"
// behaviour we want. A no-op redeploy has no new commit, so it doesn't churn
// the dates for nothing. Falls back to the build date if git isn't available.
function buildLastmod(): string {
  try {
    return execSync('git log -1 --format=%cs', { encoding: 'utf8' }).trim();
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

export const GET: APIRoute = async () => {
  const base = site.url.replace(/\/$/, '');
  const cats = await getCollection('categories');
  const guides = await getCollection('guides');
  const comparisons = await getCollection('comparisons');

  const lastmod = buildLastmod();

  const staticPaths = [
    '/',
    '/categorii/',
    '/ghiduri/',
    '/cum-testam/',
    '/despre/',
    '/contact/',
    '/legal/afiliere/',
    '/legal/confidentialitate/',
    '/legal/cookie/',
    '/legal/termeni/',
  ];

  const urls: { loc: string }[] = [];
  staticPaths.forEach((p) => urls.push({ loc: base + p }));
  cats.forEach((c) => urls.push({ loc: `${base}/clasament/${c.id}/` }));
  guides.forEach((g) => urls.push({ loc: `${base}/ghiduri/${g.id.replace(/\.md$/, '')}/` }));
  comparisons.forEach((c) => urls.push({ loc: `${base}/compara/${c.id}/` }));

  const body =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urls
      .map((u) => `  <url><loc>${u.loc}</loc><lastmod>${lastmod}</lastmod></url>`)
      .join('\n') +
    '\n</urlset>\n';

  return new Response(body, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
