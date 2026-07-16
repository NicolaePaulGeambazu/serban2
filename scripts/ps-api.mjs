#!/usr/bin/env node
/**
 * Profitshare Affiliate API client + CLI.
 *
 * Credentials come from env (never hardcode / commit):
 *   PROFITSHARE_API_USER, PROFITSHARE_API_KEY
 *
 * Usage:
 *   PROFITSHARE_API_USER=... PROFITSHARE_API_KEY=... node scripts/ps-api.mjs advertisers
 *   ... node scripts/ps-api.mjs products <advertiserId> [page]
 */
import crypto from 'node:crypto';
import https from 'node:https';

const API_USER = process.env.PROFITSHARE_API_USER;
const API_KEY = process.env.PROFITSHARE_API_KEY;
const HOST = 'api.profitshare.ro';

if (!API_USER || !API_KEY) {
  console.error('Missing PROFITSHARE_API_USER / PROFITSHARE_API_KEY env vars.');
  process.exit(1);
}

// Note: the `Date` header is a "forbidden header" in fetch/undici (silently dropped),
// so we use the low-level https module to set it — the signature depends on it.
export function psRequest(verb, methodPath, queryString = '', body = null) {
  const date = new Date().toUTCString(); // RFC1123 GMT
  // signature = VERB + methodPath + "?" + queryString + "/" + apiUser + date  (per API docs; body not signed)
  const signature = `${verb}${methodPath}?${queryString}/${API_USER}${date}`;
  const auth = crypto.createHmac('sha1', API_KEY).update(signature).digest('hex');
  const path = `/${methodPath}?${queryString}`;
  const headers = {
    Date: date,
    'X-PS-Client': API_USER,
    'X-PS-Accept': 'json',
    'X-PS-Auth': auth,
  };
  if (body != null) {
    headers['Content-Type'] = 'application/x-www-form-urlencoded';
    headers['Content-Length'] = Buffer.byteLength(body);
  }
  return new Promise((resolve) => {
    const req = https.request({ host: HOST, path, method: verb, headers }, (res) => {
      let text = '';
      res.on('data', (c) => (text += c));
      res.on('end', () => {
        let json;
        try { json = JSON.parse(text); } catch { json = null; }
        resolve({ status: res.statusCode, json, text });
      });
    });
    req.on('error', (e) => resolve({ status: 0, json: null, text: String(e) }));
    if (body != null) req.write(body);
    req.end();
  });
}

// ---- CLI (only when run directly) ----
if (import.meta.url === `file://${process.argv[1]}`) {
  const [cmd, arg1, arg2] = process.argv.slice(2);
  if (cmd === 'advertisers') {
    const r = await psRequest('GET', 'affiliate-advertisers/', '');
    console.log('HTTP', r.status);
    console.log(r.json ? JSON.stringify(r.json, null, 2) : r.text.slice(0, 800));
  } else if (cmd === 'products') {
    const q = `page=${arg2 || 1}&filters[advertiser]=${arg1}`;
    const r = await psRequest('GET', 'affiliate-products/', q);
    console.log('HTTP', r.status);
    console.log(r.json ? JSON.stringify(r.json, null, 2).slice(0, 1500) : r.text.slice(0, 800));
  } else if (cmd === 'link') {
    const url = arg1;
    const name = (arg2 || 'topalegeri').slice(0, 60);
    const body = `0[name]=${encodeURIComponent(name)}&0[url]=${encodeURIComponent(url)}`;
    const r = await psRequest('POST', 'affiliate-links/', '', body);
    console.log('HTTP', r.status);
    console.log(r.json ? JSON.stringify(r.json, null, 2) : r.text.slice(0, 800));
  } else {
    console.error('Commands: advertisers | products <advertiserId> [page] | link <url> [name]');
  }
}
