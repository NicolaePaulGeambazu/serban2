#!/usr/bin/env node
/**
 * upload-conversions.mjs — safety-net batch: pull confirmed Profitshare commissions
 * that carry a gclid and push them to Google Ads via the Data Manager API
 * (events:ingest). No manual CSV. Runs on a schedule (see
 * .github/workflows/sync-conversions.yml) as a backstop behind the real-time webhook.
 *
 * Required env (set as secrets, never commit):
 *   PROFITSHARE_API_USER, PROFITSHARE_API_KEY
 *   GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, GOOGLE_OAUTH_REFRESH_TOKEN
 *     (refresh token minted with scope https://www.googleapis.com/auth/datamanager)
 *   GOOGLE_ADS_CUSTOMER_ID            (digits only, no dashes)
 *   GOOGLE_ADS_CONVERSION_ACTION_ID   (numeric id of the "Comision eMAG" action)
 * Optional:
 *   GOOGLE_ADS_LOGIN_CUSTOMER_ID      (MCC id, if your account is under a manager)
 *   GOOGLE_TZ_OFFSET                  (default "+03:00")
 *   LOOKBACK_DAYS                     (default 40)
 *   DATAMANAGER_VALIDATE_ONLY=1       (dry-run: validate without recording)
 */
import { psRequest } from './ps-api.mjs';
import { makeClient } from '../lib/google-ads.mjs';

const TZ = process.env.GOOGLE_TZ_OFFSET || '+03:00';
const LOOKBACK = parseInt(process.env.LOOKBACK_DAYS || '40', 10);

for (const k of ['GOOGLE_OAUTH_CLIENT_ID','GOOGLE_OAUTH_CLIENT_SECRET','GOOGLE_OAUTH_REFRESH_TOKEN','GOOGLE_ADS_CUSTOMER_ID','GOOGLE_ADS_CONVERSION_ACTION_ID']) {
  if (!process.env[k]) { console.error(`Missing env: ${k}`); process.exit(1); }
}

function ymd(d) { return d.toISOString().slice(0, 10); }
function sumCommission(v) { return String(v || '0').split('|').map((x) => parseFloat(x) || 0).reduce((a, b) => a + b, 0); }

// 1. pull Profitshare commissions with a gclid → build Data Manager events
const now = new Date();
const from = ymd(new Date(now.getTime() - LOOKBACK * 864e5));
const to = ymd(now);
const events = [];
let page = 1, totalPages = 1;
do {
  const q = `filters[status]=approved&filters[date_from]=${from}&filters[date_to]=${to}&order=date&page=${page}`;
  const r = await psRequest('GET', 'affiliate-commissions/', q);
  if (r.status !== 200 || !r.json?.result) { console.error('Profitshare error', r.status, r.text?.slice(0, 200)); break; }
  totalPages = r.json.result.total_pages || 1;
  for (const c of r.json.result.commissions || []) {
    if (!c.hash) continue; // no gclid → not from Google Ads, skip
    events.push({
      adIdentifiers: { gclid: c.hash },
      transactionId: c.order_ref, // dedups against the webhook's real-time send
      eventTimestamp: `${(c.order_date || '').trim().replace(' ', 'T')}${TZ}`,
      conversionValue: Number(sumCommission(c.items_commision).toFixed(2)),
      currency: 'RON',
      eventSource: 'WEB',
    });
  }
  page++;
} while (page <= totalPages);

console.log(`${events.length} conversion(s) with gclid to ingest (${from}..${to}).`);
if (!events.length) process.exit(0);

// 2. push to Google Ads via the shared Data Manager client
const client = makeClient(process.env);
const { status, json } = await client.ingestEvents(events);
console.log('Data Manager HTTP', status);
console.log(JSON.stringify(json, null, 2));
