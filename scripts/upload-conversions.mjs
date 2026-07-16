#!/usr/bin/env node
/**
 * upload-conversions.mjs — fully automatic: pull confirmed Profitshare commissions
 * that carry a gclid and push them to Google Ads via UploadClickConversions.
 * No manual CSV. Meant to run on a schedule (see .github/workflows/sync-conversions.yml).
 *
 * Required env (set as secrets, never commit):
 *   PROFITSHARE_API_USER, PROFITSHARE_API_KEY
 *   GOOGLE_ADS_DEVELOPER_TOKEN
 *   GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, GOOGLE_OAUTH_REFRESH_TOKEN
 *   GOOGLE_ADS_CUSTOMER_ID            (digits only, no dashes)
 *   GOOGLE_ADS_CONVERSION_ACTION_ID   (numeric id of the "Comision eMAG" action)
 * Optional:
 *   GOOGLE_ADS_LOGIN_CUSTOMER_ID      (MCC id, if your account is under a manager)
 *   GOOGLE_TZ_OFFSET                  (default "+03:00")
 *   LOOKBACK_DAYS                     (default 40)
 *
 * NOTE: untested until you provide Google Ads API access; run once manually and
 * check the response before scheduling.
 */
import { psRequest } from './ps-api.mjs';

const API_VERSION = 'v18'; // bump if Google deprecates it
const {
  GOOGLE_ADS_DEVELOPER_TOKEN, GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET,
  GOOGLE_OAUTH_REFRESH_TOKEN, GOOGLE_ADS_CUSTOMER_ID, GOOGLE_ADS_CONVERSION_ACTION_ID,
  GOOGLE_ADS_LOGIN_CUSTOMER_ID,
} = process.env;
const TZ = process.env.GOOGLE_TZ_OFFSET || '+03:00';
const LOOKBACK = parseInt(process.env.LOOKBACK_DAYS || '40', 10);

for (const k of ['GOOGLE_ADS_DEVELOPER_TOKEN','GOOGLE_OAUTH_CLIENT_ID','GOOGLE_OAUTH_CLIENT_SECRET','GOOGLE_OAUTH_REFRESH_TOKEN','GOOGLE_ADS_CUSTOMER_ID','GOOGLE_ADS_CONVERSION_ACTION_ID']) {
  if (!process.env[k]) { console.error(`Missing env: ${k}`); process.exit(1); }
}

function ymd(d) { return d.toISOString().slice(0, 10); }
function sumCommission(v) { return String(v || '0').split('|').map((x) => parseFloat(x) || 0).reduce((a, b) => a + b, 0); }

async function getAccessToken() {
  const body = new URLSearchParams({
    client_id: GOOGLE_OAUTH_CLIENT_ID, client_secret: GOOGLE_OAUTH_CLIENT_SECRET,
    refresh_token: GOOGLE_OAUTH_REFRESH_TOKEN, grant_type: 'refresh_token',
  });
  const r = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', body });
  const j = await r.json();
  if (!j.access_token) throw new Error('OAuth token error: ' + JSON.stringify(j));
  return j.access_token;
}

// 1. pull Profitshare commissions with a gclid
const now = new Date();
const from = ymd(new Date(now.getTime() - LOOKBACK * 864e5));
const to = ymd(now);
const conversions = [];
let page = 1, totalPages = 1;
do {
  const q = `filters[status]=approved&filters[date_from]=${from}&filters[date_to]=${to}&order=date&page=${page}`;
  const r = await psRequest('GET', 'affiliate-commissions/', q);
  if (r.status !== 200 || !r.json?.result) { console.error('Profitshare error', r.status, r.text?.slice(0, 200)); break; }
  totalPages = r.json.result.total_pages || 1;
  for (const c of r.json.result.commissions || []) {
    if (!c.hash) continue;
    conversions.push({
      gclid: c.hash,
      conversionAction: `customers/${GOOGLE_ADS_CUSTOMER_ID}/conversionActions/${GOOGLE_ADS_CONVERSION_ACTION_ID}`,
      conversionDateTime: `${(c.order_date || '').trim()}${TZ}`,
      conversionValue: Number(sumCommission(c.items_commision).toFixed(2)),
      currencyCode: 'RON',
    });
  }
  page++;
} while (page <= totalPages);

console.log(`${conversions.length} conversion(s) with gclid to upload (${from}..${to}).`);
if (!conversions.length) process.exit(0);

// 2. push to Google Ads
const token = await getAccessToken();
const headers = {
  Authorization: `Bearer ${token}`,
  'developer-token': GOOGLE_ADS_DEVELOPER_TOKEN,
  'Content-Type': 'application/json',
};
if (GOOGLE_ADS_LOGIN_CUSTOMER_ID) headers['login-customer-id'] = GOOGLE_ADS_LOGIN_CUSTOMER_ID;

const url = `https://googleads.googleapis.com/${API_VERSION}/customers/${GOOGLE_ADS_CUSTOMER_ID}:uploadClickConversions`;
const res = await fetch(url, {
  method: 'POST', headers,
  body: JSON.stringify({ conversions, partialFailure: true }),
});
const out = await res.json();
console.log('Google Ads HTTP', res.status);
console.log(JSON.stringify(out, null, 2));
