import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { site } from '../data/site';

export const GET: APIRoute = async () => {
  const base = site.url.replace(/\/$/, '');
  const cats = await getCollection('categories');
  const guides = await getCollection('guides');
  const comparisons = await getCollection('comparisons');

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

  // Site-wide "content last changed" date = the newest editorial `updated`
  // across all content. It moves whenever any category/guide/comparison is
  // edited, so the aggregator pages below get a truthful, self-refreshing
  // lastmod on every site-wide change — no daily faking (Google distrusts
  // sitemaps whose lastmod changes without the content changing).
  const allDates = [...cats, ...guides, ...comparisons]
    .map((e) => e.data.updated)
    .filter(Boolean)
    .sort();
  const siteLastmod = allDates[allDates.length - 1];

  // Pages that genuinely reflect the latest content (they list it), so they
  // legitimately change whenever content does. Truly evergreen pages
  // (legal, despre, contact) are left without a lastmod on purpose.
  const aggregatorPaths = new Set(['/', '/categorii/', '/ghiduri/']);

  const urls: { loc: string; lastmod?: string }[] = [];
  staticPaths.forEach((p) =>
    urls.push({ loc: base + p, lastmod: aggregatorPaths.has(p) ? siteLastmod : undefined })
  );
  cats.forEach((c) => urls.push({ loc: `${base}/clasament/${c.id}/`, lastmod: c.data.updated }));
  guides.forEach((g) =>
    urls.push({ loc: `${base}/ghiduri/${g.id.replace(/\.md$/, '')}/`, lastmod: g.data.updated })
  );
  comparisons.forEach((c) =>
    urls.push({ loc: `${base}/compara/${c.id}/`, lastmod: c.data.updated })
  );

  const body =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urls
      .map(
        (u) =>
          `  <url><loc>${u.loc}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}</url>`
      )
      .join('\n') +
    '\n</urlset>\n';

  return new Response(body, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
