#!/usr/bin/env node
/**
 * get-product.mjs — turn a real eMAG product URL into a ready-to-paste JSON block.
 *
 * Usage:
 *   node scripts/get-product.mjs "https://www.emag.ro/<slug>/pd/<CODE>/" ["<url2>" ...]
 *
 * Pulls factual data (name, price, image, product id) from the page's public
 * JSON-LD / OpenGraph tags. You then set the editorial fields (rank, score, tag,
 * pros, cons) yourself. It does NOT scrape catalogs — you pass the specific
 * products you've chosen to feature.
 */

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36';

function decodeEntities(s) {
  return String(s || '')
    .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#0?39;/g, "'")
    .replace(/&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ').trim();
}

function firstMatch(re, html) {
  const m = html.match(re);
  return m ? decodeEntities(m[1]) : '';
}

function findProductLd(html) {
  const blocks = [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  for (const b of blocks) {
    let data;
    try { data = JSON.parse(b[1].trim()); } catch { continue; }
    const arr = Array.isArray(data) ? data : (data['@graph'] || [data]);
    for (const node of arr) {
      const t = node && node['@type'];
      const isProduct = t === 'Product' || (Array.isArray(t) && t.includes('Product'));
      if (isProduct) return node;
    }
  }
  return null;
}

function slugify(s) {
  return String(s).toLowerCase()
    .replace(/[ăâ]/g, 'a').replace(/[î]/g, 'i').replace(/[șş]/g, 's').replace(/[țţ]/g, 't')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
}

async function getProduct(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'ro-RO,ro' } });
  const html = await res.text();
  const ld = findProductLd(html);

  let name = ld?.name || firstMatch(/<meta property=["']og:title["'] content=["']([^"']+)["']/i, html) || firstMatch(/<title>([^<]+)<\/title>/i, html);
  name = name.replace(/\s*[-–]\s*eMAG.*/i, '').replace(/\s*\|\s*eMAG.*/i, '').trim();

  let image = (Array.isArray(ld?.image) ? ld.image[0] : ld?.image) || firstMatch(/<meta property=["']og:image["'] content=["']([^"']+)["']/i, html);

  let price = '';
  const offers = ld?.offers && (Array.isArray(ld.offers) ? ld.offers[0] : ld.offers);
  if (offers?.price) price = String(offers.price);
  if (!price) price = firstMatch(/<meta property=["']product:price:amount["'] content=["']([^"']+)["']/i, html);
  const priceNum = price ? Math.round(parseFloat(String(price).replace(/[^0-9.,]/g, '').replace(',', '.'))) : null;

  const code = (url.match(/\/pd\/([A-Za-z0-9]+)/) || [])[1] || '';

  return {
    id: code ? code.toLowerCase() : slugify(name).slice(0, 12),
    rank: 0,
    name: name || '(nume negăsit — completează)',
    tag: '',
    score: 0,
    price: priceNum || 0,
    image: image || '',
    feedId: code || '',
    features: [],
    specs: [],
    scores: [],
    pros: [],
    cons: [],
    emagUrl: url,
  };
}

const urls = process.argv.slice(2);
if (!urls.length) {
  console.error('Usage: node scripts/get-product.mjs "<emag-url>" ["<url2>" ...]');
  process.exit(1);
}

const out = [];
for (const u of urls) {
  try { out.push(await getProduct(u)); }
  catch (e) { console.error('! Eroare la', u, '-', e.message); }
}
console.log(JSON.stringify(out, null, 2));
