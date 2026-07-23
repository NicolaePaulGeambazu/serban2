#!/usr/bin/env node
/**
 * export-conversions.mjs — pull confirmed Profitshare commissions that carry a
 * Google click id and print a Google Ads "offline conversions" CSV.
 *
 *   PROFITSHARE_API_USER=... PROFITSHARE_API_KEY=... \
 *     node scripts/export-conversions.mjs 2026-01-01 2026-07-16 > conversions.csv
 *
 * Then upload conversions.csv in Google Ads → Goals → Conversions → Uploads.
 * The "Conversion Name" must match the conversion action you created in Google Ads.
 */
import { psRequest } from './ps-api.mjs';

const [from, to] = process.argv.slice(2);
const CONVERSION_NAME = process.env.CONVERSION_NAME || 'Comision eMAG';
const TIMEZONE = 'Europe/Bucharest';

if (!from || !to) {
  console.error('Usage: node scripts/export-conversions.mjs <date_from YYYY-MM-DD> <date_to YYYY-MM-DD>');
  process.exit(1);
}

function sumCommission(v) {
  // items_commision looks like "4.5965|56.3707" — sum the parts
  return String(v || '0')
    .split('|')
    .map((x) => parseFloat(x) || 0)
    .reduce((a, b) => a + b, 0);
}

const rows = [];
let page = 1;
let totalPages = 1;
do {
  const q = `filters[status]=approved&filters[date_from]=${from}&filters[date_to]=${to}&order=date&page=${page}`;
  const r = await psRequest('GET', 'affiliate-commissions/', q);
  if (r.status !== 200 || !r.json?.result) {
    console.error(`! HTTP ${r.status}`, r.text?.slice(0, 200));
    break;
  }
  totalPages = r.json.result.total_pages || 1;
  for (const c of r.json.result.commissions || []) {
    const gclid = c.hash; // the value we appended as /l/<id>/<gclid> on the affiliate link
    if (!gclid) continue; // no ad click id → not from Google Ads, skip
    const value = sumCommission(c.items_commision).toFixed(2);
    const time = (c.order_date || '').trim(); // "YYYY-MM-DD HH:mm:ss"
    rows.push(`${gclid},${CONVERSION_NAME},${time},${value},RON`);
  }
  page++;
} while (page <= totalPages);

// Google Ads offline-conversion CSV
console.log(`Parameters:TimeZone=${TIMEZONE}`);
console.log('Google Click ID,Conversion Name,Conversion Time,Conversion Value,Conversion Currency');
for (const row of rows) console.log(row);
console.error(`\n${rows.length} conversion(s) with a gclid, between ${from} and ${to}.`);
