#!/usr/bin/env node
/**
 * sync-links.mjs — fill each product's `affiliateUrl` with a tracked Profitshare
 * link, generated via the Links API. Run once when you add new products (or with
 * --force to regenerate all).
 *
 *   PROFITSHARE_API_USER=... PROFITSHARE_API_KEY=... node scripts/sync-links.mjs [--force]
 *
 * Credentials are read from env — never hardcoded. The resulting affiliate links
 * are public (safe to commit); the API key is not.
 */
import fs from 'node:fs';
import path from 'node:path';
import { psRequest } from './ps-api.mjs';

const DIR = path.join(process.cwd(), 'src/content/categories');
const FORCE = process.argv.includes('--force');
const BATCH = 10;

const files = fs.readdirSync(DIR).filter((f) => f.endsWith('.json'));
const cats = files.map((f) => ({ f, data: JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8')) }));

// collect products that need a link
const todo = [];
for (const c of cats) {
  for (const p of c.data.products) {
    if (FORCE || !p.affiliateUrl) todo.push({ cat: c, p });
  }
}
if (!todo.length) {
  console.log('Nothing to do — every product already has an affiliateUrl (use --force to regenerate).');
  process.exit(0);
}
console.log(`Generating tracked links for ${todo.length} product(s)…`);

const urlToPs = new Map();
for (let i = 0; i < todo.length; i += BATCH) {
  const chunk = todo.slice(i, i + BATCH);
  const body = chunk
    .map((t, j) => `${j}[name]=${encodeURIComponent(t.p.name.slice(0, 60))}&${j}[url]=${encodeURIComponent(t.p.emagUrl)}`)
    .join('&');
  const r = await psRequest('POST', 'affiliate-links/', '', body);
  if (r.status !== 200 || !r.json?.result) {
    console.error(`! Batch ${i / BATCH + 1} failed: HTTP ${r.status}`, r.text?.slice(0, 200));
    continue;
  }
  for (const item of r.json.result) {
    if (item.url && item.ps_url) urlToPs.set(item.url, item.ps_url);
  }
  console.log(`  batch ${i / BATCH + 1}: ${r.json.result.length} links`);
}

// write back
let updated = 0;
for (const c of cats) {
  let changed = false;
  for (const p of c.data.products) {
    const ps = urlToPs.get(p.emagUrl);
    if (ps && p.affiliateUrl !== ps) { p.affiliateUrl = ps; changed = true; updated++; }
  }
  if (changed) fs.writeFileSync(path.join(DIR, c.f), JSON.stringify(c.data, null, 2) + '\n');
}
console.log(`Done — set affiliateUrl on ${updated} product(s).`);
