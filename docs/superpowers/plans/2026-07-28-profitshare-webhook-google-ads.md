# ProfitShare Webhook → Google Ads Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Receive ProfitShare order webhooks on a Vercel Function and upload/adjust the matching conversions in Google Ads in real time, while keeping the site fully static.

**Architecture:** A single Vercel Serverless Function at `api/profitshare-webhook.js` handles ProfitShare's GET webhooks. All pure logic (auth, payload→conversion mapping, event dispatch) lives in `lib/webhook-core.mjs`; all Google Ads I/O (OAuth + upload + adjustments) lives in `lib/google-ads.mjs`, shared with the existing batch script. Tests inject a fake Google Ads client and a fake `fetch`, so nothing hits the network.

**Tech Stack:** Node 20 ESM (`"type":"module"`), Vercel Serverless Functions, Google Ads REST API v21, `node --test` (no extra deps).

## Global Constraints

- Node 20, ESM only (repo `package.json` has `"type": "module"`). No new npm dependencies.
- Secrets come exclusively from environment variables — never hardcoded or committed.
- Google Ads REST API version is `v21` (matches `scripts/upload-conversions.mjs` / `verify-google.mjs`).
- Currency is always `RON`. Default timezone offset `+03:00` (env `GOOGLE_TZ_OFFSET` overrides).
- The webhook uploads ONLY conversions carrying a `gclid` (the `hash` param). No `hash` → skip. Cookie-refusers are never uploaded (handled by Consent Mode, out of scope for code).
- Every authentic request returns HTTP 200 quickly (even skips/errors) so ProfitShare does not retry; a bad/absent Bearer token returns 401.
- Shared Google Ads client lives at `lib/google-ads.mjs`; both the webhook and `scripts/upload-conversions.mjs` import it (DRY — do not duplicate OAuth/upload logic).
- Tests never make network calls: inject `fetchImpl` (google-ads) or a fake `client`/`now` (webhook-core).

---

## File Structure

- Create `lib/google-ads.mjs` — Google Ads client: `getAccessToken`, `uploadClickConversions`, `adjustConversions`, `makeClient`.
- Create `lib/google-ads.test.mjs` — unit tests with injected `fetch`.
- Create `lib/webhook-core.mjs` — pure logic: `authorize`, `buildConversion`, `buildAdjustment`, `handleWebhook`.
- Create `lib/webhook-core.test.mjs` — unit tests with a fake client + fixed `now`.
- Create `api/profitshare-webhook.js` — thin Vercel adapter (req/res → `handleWebhook`).
- Create `api/profitshare-webhook.test.mjs` — smoke test of the adapter with fake req/res + stubbed modules.
- Modify `scripts/upload-conversions.mjs` — use `makeClient` from the shared lib; set `orderId`.
- Modify `.github/workflows/sync-conversions.yml` — schedule `0 */4 * * *`.
- Modify `package.json` — extend the `test` script glob to include `lib/` and `api/`.
- Create `docs/profitshare-webhook.md` — setup + Consent Mode verification notes.

---

### Task 1: Shared Google Ads client (`lib/google-ads.mjs`)

**Files:**
- Create: `lib/google-ads.mjs`
- Test: `lib/google-ads.test.mjs`

**Interfaces:**
- Consumes: nothing (leaf module).
- Produces:
  - `getAccessToken(env, fetchImpl = fetch) → Promise<string>`
  - `uploadClickConversions(conversions, env, token, fetchImpl = fetch) → Promise<{status, json}>`
  - `adjustConversions(adjustments, env, token, fetchImpl = fetch) → Promise<{status, json}>`
  - `makeClient(env, fetchImpl = fetch) → { uploadClickConversions(conversions), adjustConversions(adjustments) }` (memoizes the token)
  - `env` keys used: `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, `GOOGLE_OAUTH_REFRESH_TOKEN`, `GOOGLE_ADS_DEVELOPER_TOKEN`, `GOOGLE_ADS_CUSTOMER_ID`, optional `GOOGLE_ADS_LOGIN_CUSTOMER_ID`.
  - Each `adjustment` object already contains its own `adjustmentType` (`'RETRACTION'|'RESTATEMENT'`).

- [ ] **Step 1: Write the failing test**

```js
// lib/google-ads.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getAccessToken, uploadClickConversions, adjustConversions, makeClient } from './google-ads.mjs';

const ENV = {
  GOOGLE_OAUTH_CLIENT_ID: 'cid', GOOGLE_OAUTH_CLIENT_SECRET: 'sec',
  GOOGLE_OAUTH_REFRESH_TOKEN: 'ref', GOOGLE_ADS_DEVELOPER_TOKEN: 'dev',
  GOOGLE_ADS_CUSTOMER_ID: '1234567890',
};

function fakeFetch(routes) {
  const calls = [];
  const fn = async (url, opts = {}) => {
    calls.push({ url, opts });
    for (const [match, resp] of routes) if (url.includes(match)) return resp;
    throw new Error('no route for ' + url);
  };
  fn.calls = calls;
  return fn;
}
const jsonRes = (obj, status = 200) => ({ status, json: async () => obj });

test('getAccessToken returns the access_token from the OAuth response', async () => {
  const f = fakeFetch([['oauth2.googleapis.com', jsonRes({ access_token: 'AT' })]]);
  assert.equal(await getAccessToken(ENV, f), 'AT');
});

test('getAccessToken throws when no token is returned', async () => {
  const f = fakeFetch([['oauth2.googleapis.com', jsonRes({ error: 'bad' })]]);
  await assert.rejects(() => getAccessToken(ENV, f), /OAuth token error/);
});

test('uploadClickConversions POSTs to the customer uploadClickConversions endpoint with headers', async () => {
  const f = fakeFetch([[':uploadClickConversions', jsonRes({ results: [] })]]);
  const r = await uploadClickConversions([{ gclid: 'g' }], { ...ENV, GOOGLE_ADS_LOGIN_CUSTOMER_ID: '999' }, 'AT', f);
  assert.equal(r.status, 200);
  const c = f.calls[0];
  assert.match(c.url, /customers\/1234567890:uploadClickConversions/);
  assert.equal(c.opts.headers['developer-token'], 'dev');
  assert.equal(c.opts.headers['Authorization'], 'Bearer AT');
  assert.equal(c.opts.headers['login-customer-id'], '999');
  assert.deepEqual(JSON.parse(c.opts.body), { conversions: [{ gclid: 'g' }], partialFailure: true });
});

test('adjustConversions POSTs to uploadConversionAdjustments', async () => {
  const f = fakeFetch([[':uploadConversionAdjustments', jsonRes({ results: [] })]]);
  const r = await adjustConversions([{ adjustmentType: 'RETRACTION' }], ENV, 'AT', f);
  assert.equal(r.status, 200);
  assert.match(f.calls[0].url, /customers\/1234567890:uploadConversionAdjustments/);
  assert.deepEqual(JSON.parse(f.calls[0].opts.body), { conversionAdjustments: [{ adjustmentType: 'RETRACTION' }], partialFailure: true });
});

test('makeClient fetches the token once and reuses it across calls', async () => {
  const f = fakeFetch([
    ['oauth2.googleapis.com', jsonRes({ access_token: 'AT' })],
    [':uploadClickConversions', jsonRes({ results: [] })],
    [':uploadConversionAdjustments', jsonRes({ results: [] })],
  ]);
  const client = makeClient(ENV, f);
  await client.uploadClickConversions([{ gclid: 'g' }]);
  await client.adjustConversions([{ adjustmentType: 'RETRACTION' }]);
  const oauthCalls = f.calls.filter((c) => c.url.includes('oauth2.googleapis.com'));
  assert.equal(oauthCalls.length, 1);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test lib/google-ads.test.mjs`
Expected: FAIL (`Cannot find module './google-ads.mjs'` or missing exports).

- [ ] **Step 3: Write minimal implementation**

```js
// lib/google-ads.mjs
/**
 * Google Ads REST client (OAuth + click-conversion upload + adjustments).
 * Shared by the real-time webhook (api/profitshare-webhook.js) and the batch
 * poller (scripts/upload-conversions.mjs). No secrets here — all via `env`.
 */
const API_VERSION = 'v21';

export async function getAccessToken(env, fetchImpl = fetch) {
  const body = new URLSearchParams({
    client_id: env.GOOGLE_OAUTH_CLIENT_ID,
    client_secret: env.GOOGLE_OAUTH_CLIENT_SECRET,
    refresh_token: env.GOOGLE_OAUTH_REFRESH_TOKEN,
    grant_type: 'refresh_token',
  });
  const r = await fetchImpl('https://oauth2.googleapis.com/token', { method: 'POST', body });
  const j = await r.json();
  if (!j.access_token) throw new Error('OAuth token error: ' + JSON.stringify(j));
  return j.access_token;
}

function headers(env, token) {
  const h = {
    Authorization: `Bearer ${token}`,
    'developer-token': env.GOOGLE_ADS_DEVELOPER_TOKEN,
    'Content-Type': 'application/json',
  };
  if (env.GOOGLE_ADS_LOGIN_CUSTOMER_ID) h['login-customer-id'] = env.GOOGLE_ADS_LOGIN_CUSTOMER_ID;
  return h;
}

async function post(path, payload, env, token, fetchImpl) {
  const url = `https://googleads.googleapis.com/${API_VERSION}/customers/${env.GOOGLE_ADS_CUSTOMER_ID}:${path}`;
  const res = await fetchImpl(url, { method: 'POST', headers: headers(env, token), body: JSON.stringify(payload) });
  const json = await res.json();
  return { status: res.status, json };
}

export function uploadClickConversions(conversions, env, token, fetchImpl = fetch) {
  return post('uploadClickConversions', { conversions, partialFailure: true }, env, token, fetchImpl);
}

export function adjustConversions(adjustments, env, token, fetchImpl = fetch) {
  return post('uploadConversionAdjustments', { conversionAdjustments: adjustments, partialFailure: true }, env, token, fetchImpl);
}

export function makeClient(env, fetchImpl = fetch) {
  let tokenPromise;
  const token = () => (tokenPromise ??= getAccessToken(env, fetchImpl));
  return {
    async uploadClickConversions(conversions) { return uploadClickConversions(conversions, env, await token(), fetchImpl); },
    async adjustConversions(adjustments) { return adjustConversions(adjustments, env, await token(), fetchImpl); },
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test lib/google-ads.test.mjs`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/google-ads.mjs lib/google-ads.test.mjs
git commit -m "feat: shared Google Ads REST client (OAuth + upload + adjustments)"
```

---

### Task 2: Webhook core logic (`lib/webhook-core.mjs`)

**Files:**
- Create: `lib/webhook-core.mjs`
- Test: `lib/webhook-core.test.mjs`

**Interfaces:**
- Consumes: a `client` shaped like `makeClient(...)` from Task 1 (`uploadClickConversions(list)`, `adjustConversions(list)`).
- Produces:
  - `authorize(headers, expectedToken) → boolean` (Bearer, constant-time)
  - `buildConversion(query, env) → conversion | null` (null when no `hash`)
  - `buildAdjustment(query, env, type, now) → adjustment` (`type` is `'RETRACTION'|'RESTATEMENT'`)
  - `handleWebhook({ query, headers, env, client, now = new Date() }) → Promise<{status, action, reason?}>`
  - `action ∈ {'unauthorized','skip','upload','retract','restate','noop'}`
- `env` keys used: `PROFITSHARE_WEBHOOK_TOKEN`, `GOOGLE_ADS_CUSTOMER_ID`, `GOOGLE_ADS_CONVERSION_ACTION_ID`, optional `GOOGLE_TZ_OFFSET`.
- Query fields consumed: `hash`, `order_reference`, `order_date_time`, `commissions`, `status`, `type`.

- [ ] **Step 1: Write the failing test**

```js
// lib/webhook-core.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { authorize, buildConversion, buildAdjustment, handleWebhook } from './webhook-core.mjs';

const ENV = {
  PROFITSHARE_WEBHOOK_TOKEN: 'secret-token',
  GOOGLE_ADS_CUSTOMER_ID: '1234567890',
  GOOGLE_ADS_CONVERSION_ACTION_ID: '555',
};
const NOW = new Date('2026-01-02T00:00:00Z'); // +03:00 → 2026-01-02 03:00:00
const ACTION = 'customers/1234567890/conversionActions/555';

function fakeClient() {
  const calls = [];
  return {
    calls,
    async uploadClickConversions(list) { calls.push(['upload', list]); return { status: 200, json: {} }; },
    async adjustConversions(list) { calls.push(['adjust', list]); return { status: 200, json: {} }; },
  };
}

test('authorize accepts the exact Bearer token and rejects others', () => {
  assert.equal(authorize({ authorization: 'Bearer secret-token' }, 'secret-token'), true);
  assert.equal(authorize({ Authorization: 'Bearer secret-token' }, 'secret-token'), true);
  assert.equal(authorize({ authorization: 'Bearer wrong' }, 'secret-token'), false);
  assert.equal(authorize({}, 'secret-token'), false);
  assert.equal(authorize({ authorization: 'Bearer x' }, ''), false);
});

test('buildConversion maps the payload and returns null without a hash', () => {
  assert.equal(buildConversion({ commissions: '13.99' }, ENV), null);
  const c = buildConversion({ hash: 'GCLID1', order_reference: 'OR1', order_date_time: '2026-01-01 05:00:00', commissions: '13.99' }, ENV);
  assert.deepEqual(c, {
    gclid: 'GCLID1', orderId: 'OR1', conversionAction: ACTION,
    conversionDateTime: '2026-01-01 05:00:00+03:00', conversionValue: 13.99, currencyCode: 'RON',
  });
});

test('buildAdjustment builds RETRACTION (no value) and RESTATEMENT (with value)', () => {
  const ret = buildAdjustment({ order_reference: 'OR1', commissions: '13.99' }, ENV, 'RETRACTION', NOW);
  assert.deepEqual(ret, { conversionAction: ACTION, adjustmentType: 'RETRACTION', orderId: 'OR1', adjustmentDateTime: '2026-01-02 03:00:00+03:00' });
  const res = buildAdjustment({ order_reference: 'OR1', commissions: '20.5' }, ENV, 'RESTATEMENT', NOW);
  assert.deepEqual(res.restatementValue, { adjustedValue: 20.5, currencyCode: 'RON' });
});

test('handleWebhook returns 401 on a bad token', async () => {
  const client = fakeClient();
  const r = await handleWebhook({ query: { hash: 'g', type: 'order_add' }, headers: { authorization: 'Bearer nope' }, env: ENV, client });
  assert.equal(r.status, 401);
  assert.equal(r.action, 'unauthorized');
  assert.equal(client.calls.length, 0);
});

test('handleWebhook skips (200) when there is no hash', async () => {
  const client = fakeClient();
  const r = await handleWebhook({ query: { type: 'order_add', commissions: '5' }, headers: { authorization: 'Bearer secret-token' }, env: ENV, client });
  assert.deepEqual([r.status, r.action], [200, 'skip']);
  assert.equal(client.calls.length, 0);
});

test('handleWebhook uploads a click conversion on order_add', async () => {
  const client = fakeClient();
  const r = await handleWebhook({
    query: { type: 'order_add', hash: 'G', order_reference: 'OR1', order_date_time: '2026-01-01 05:00:00', commissions: '13.99', status: 'pending' },
    headers: { authorization: 'Bearer secret-token' }, env: ENV, client, now: NOW,
  });
  assert.deepEqual([r.status, r.action], [200, 'upload']);
  assert.equal(client.calls[0][0], 'upload');
  assert.equal(client.calls[0][1][0].gclid, 'G');
});

test('handleWebhook retracts on a canceled update', async () => {
  const client = fakeClient();
  const r = await handleWebhook({
    query: { hash: 'G', order_reference: 'OR1', status: 'canceled', commissions: '13.99' },
    headers: { authorization: 'Bearer secret-token' }, env: ENV, client, now: NOW,
  });
  assert.deepEqual([r.status, r.action], [200, 'retract']);
  assert.equal(client.calls[0][1][0].adjustmentType, 'RETRACTION');
});

test('handleWebhook skips a canceled update with no order_reference', async () => {
  const client = fakeClient();
  const r = await handleWebhook({
    query: { hash: 'G', status: 'canceled' },
    headers: { authorization: 'Bearer secret-token' }, env: ENV, client, now: NOW,
  });
  assert.deepEqual([r.status, r.action, r.reason], [200, 'skip', 'cancel-no-order-ref']);
  assert.equal(client.calls.length, 0);
});

test('handleWebhook restates value on an approving update', async () => {
  const client = fakeClient();
  const r = await handleWebhook({
    query: { hash: 'G', order_reference: 'OR1', status: 'approved', commissions: '20.5' },
    headers: { authorization: 'Bearer secret-token' }, env: ENV, client, now: NOW,
  });
  assert.deepEqual([r.status, r.action], [200, 'restate']);
  assert.equal(client.calls[0][1][0].adjustmentType, 'RESTATEMENT');
  assert.equal(client.calls[0][1][0].restatementValue.adjustedValue, 20.5);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test lib/webhook-core.test.mjs`
Expected: FAIL (`Cannot find module './webhook-core.mjs'`).

- [ ] **Step 3: Write minimal implementation**

```js
// lib/webhook-core.mjs
/**
 * Pure logic for the ProfitShare → Google Ads webhook. No network here — the
 * Google Ads `client` and `now` are injected so this is fully unit-testable.
 */
import crypto from 'node:crypto';

function timingSafeEqualStr(a, b) {
  const ba = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

export function authorize(headers, expectedToken) {
  if (!expectedToken) return false;
  const raw = headers.authorization || headers.Authorization || '';
  const m = /^Bearer\s+(.+)$/.exec(raw);
  return m ? timingSafeEqualStr(m[1], expectedToken) : false;
}

function tz(env) { return env.GOOGLE_TZ_OFFSET || '+03:00'; }
function actionResource(env) {
  return `customers/${env.GOOGLE_ADS_CUSTOMER_ID}/conversionActions/${env.GOOGLE_ADS_CONVERSION_ACTION_ID}`;
}
function money(v) { return Number(parseFloat(v || '0').toFixed(2)); }

function fmtDateTime(date, offset) {
  const sign = offset[0] === '-' ? -1 : 1;
  const [oh, om] = offset.slice(1).split(':').map(Number);
  const d = new Date(date.getTime() + sign * (oh * 60 + om) * 60000);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())}${offset}`;
}

export function buildConversion(query, env) {
  if (!query.hash) return null;
  return {
    gclid: query.hash,
    orderId: query.order_reference,
    conversionAction: actionResource(env),
    conversionDateTime: `${(query.order_date_time || '').trim()}${tz(env)}`,
    conversionValue: money(query.commissions),
    currencyCode: 'RON',
  };
}

export function buildAdjustment(query, env, type, now) {
  const adj = {
    conversionAction: actionResource(env),
    adjustmentType: type,
    orderId: query.order_reference,
    adjustmentDateTime: fmtDateTime(now, tz(env)),
  };
  if (type === 'RESTATEMENT') {
    adj.restatementValue = { adjustedValue: money(query.commissions), currencyCode: 'RON' };
  }
  return adj;
}

export async function handleWebhook({ query, headers, env, client, now = new Date() }) {
  if (!authorize(headers, env.PROFITSHARE_WEBHOOK_TOKEN)) return { status: 401, action: 'unauthorized' };
  if (!query.hash) return { status: 200, action: 'skip', reason: 'no-gclid' };

  const status = String(query.status || '').toLowerCase();
  const type = String(query.type || '').toLowerCase();

  if (status === 'canceled' || status === 'cancelled') {
    if (!query.order_reference) return { status: 200, action: 'skip', reason: 'cancel-no-order-ref' };
    await client.adjustConversions([buildAdjustment(query, env, 'RETRACTION', now)]);
    return { status: 200, action: 'retract' };
  }
  if (type === 'order_add') {
    await client.uploadClickConversions([buildConversion(query, env)]);
    return { status: 200, action: 'upload' };
  }
  if (query.order_reference && query.commissions != null) {
    await client.adjustConversions([buildAdjustment(query, env, 'RESTATEMENT', now)]);
    return { status: 200, action: 'restate' };
  }
  return { status: 200, action: 'noop' };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test lib/webhook-core.test.mjs`
Expected: PASS (9 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/webhook-core.mjs lib/webhook-core.test.mjs
git commit -m "feat: webhook core logic (auth, mapping, event dispatch)"
```

---

### Task 3: Vercel adapter (`api/profitshare-webhook.js`)

**Files:**
- Create: `api/profitshare-webhook.js`
- Test: `api/profitshare-webhook.test.mjs`

**Interfaces:**
- Consumes: `makeClient` (Task 1), `handleWebhook` (Task 2).
- Produces: `export default async function handler(req, res)` — Vercel Node function. Reads `req.query`, `req.headers`; writes `res.status(n).json(obj)`. Also exports `handler` as a named export so tests can import it without a default-interop shim.

- [ ] **Step 1: Write the failing test**

```js
// api/profitshare-webhook.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { handler } from './profitshare-webhook.js';

function fakeRes() {
  return {
    _status: null, _json: null,
    status(s) { this._status = s; return this; },
    json(o) { this._json = o; return this; },
  };
}

test('handler returns 401 without a valid token (no Google env needed)', async () => {
  const prev = process.env.PROFITSHARE_WEBHOOK_TOKEN;
  process.env.PROFITSHARE_WEBHOOK_TOKEN = 'secret-token';
  const res = fakeRes();
  await handler({ query: { hash: 'g', type: 'order_add' }, headers: { authorization: 'Bearer nope' } }, res);
  assert.equal(res._status, 401);
  process.env.PROFITSHARE_WEBHOOK_TOKEN = prev;
});

test('handler skips (200) a request with no hash and never calls Google', async () => {
  const prev = process.env.PROFITSHARE_WEBHOOK_TOKEN;
  process.env.PROFITSHARE_WEBHOOK_TOKEN = 'secret-token';
  const res = fakeRes();
  await handler({ query: { type: 'order_add' }, headers: { authorization: 'Bearer secret-token' } }, res);
  assert.equal(res._status, 200);
  assert.equal(res._json.action, 'skip');
  process.env.PROFITSHARE_WEBHOOK_TOKEN = prev;
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test api/profitshare-webhook.test.mjs`
Expected: FAIL (`Cannot find module './profitshare-webhook.js'`).

- [ ] **Step 3: Write minimal implementation**

```js
// api/profitshare-webhook.js
/**
 * ProfitShare Webhooks receiver (Order Add / Order Update). ProfitShare sends a
 * GET with the order params and, if configured, `Authorization: Bearer {token}`
 * plus `User-Agent: ProfitshareWebhooks/v1.0`. We upload/adjust the matching
 * Google Ads conversion. Static-site-safe: this is a standalone Vercel Function.
 */
import { makeClient } from '../lib/google-ads.mjs';
import { handleWebhook } from '../lib/webhook-core.mjs';

export async function handler(req, res) {
  const env = process.env;
  const ua = req.headers['user-agent'] || '';
  if (!ua.startsWith('ProfitshareWebhooks/')) console.warn('profitshare-webhook: unexpected user-agent', ua);
  try {
    const client = makeClient(env);
    const result = await handleWebhook({ query: req.query || {}, headers: req.headers || {}, env, client });
    return res.status(result.status).json({ ok: result.status < 400, action: result.action, reason: result.reason });
  } catch (e) {
    console.error('profitshare-webhook error:', e);
    // 200 on internal error: keep ProfitShare from hammering retries; we log for ourselves.
    return res.status(200).json({ ok: false, error: 'internal' });
  }
}

export default handler;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test api/profitshare-webhook.test.mjs`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add api/profitshare-webhook.js api/profitshare-webhook.test.mjs
git commit -m "feat: Vercel webhook adapter for ProfitShare order events"
```

---

### Task 4: Refactor batch poller onto the shared client

**Files:**
- Modify: `scripts/upload-conversions.mjs`

**Interfaces:**
- Consumes: `makeClient` (Task 1).
- Produces: no new exports; behaviour preserved (approved-only, 40-day lookback), now with `orderId` set and OAuth/upload delegated to the lib.

- [ ] **Step 1: Replace the inline OAuth + upload block**

In `scripts/upload-conversions.mjs`:

Add near the top (after the existing `import { psRequest } from './ps-api.mjs';`):

```js
import { makeClient } from '../lib/google-ads.mjs';
```

Delete the local `getAccessToken` function (lines defining it) and the manual token/headers/`fetch` upload block at the end (the `const token = await getAccessToken();` block through the final `console.log(JSON.stringify(out, null, 2));`).

In the pull loop, add `orderId` to each pushed conversion:

```js
    conversions.push({
      gclid: c.hash,
      orderId: c.order_ref,
      conversionAction: `customers/${GOOGLE_ADS_CUSTOMER_ID}/conversionActions/${GOOGLE_ADS_CONVERSION_ACTION_ID}`,
      conversionDateTime: `${(c.order_date || '').trim()}${TZ}`,
      conversionValue: Number(sumCommission(c.items_commision).toFixed(2)),
      currencyCode: 'RON',
    });
```

Replace the upload section with:

```js
// 2. push to Google Ads via the shared client
const client = makeClient(process.env);
const { status, json } = await client.uploadClickConversions(conversions);
console.log('Google Ads HTTP', status);
console.log(JSON.stringify(json, null, 2));
```

- [ ] **Step 2: Verify it still parses and the env guard works**

Run: `node scripts/upload-conversions.mjs`
Expected: exits early with `Missing env: GOOGLE_ADS_DEVELOPER_TOKEN` (no env set) — i.e. no syntax/import error. If Google env IS present locally, expect it to reach the ProfitShare pull; Ctrl-C is fine.

- [ ] **Step 3: Commit**

```bash
git add scripts/upload-conversions.mjs
git commit -m "refactor: batch poller uses shared Google Ads client + sets orderId"
```

---

### Task 5: Cron cadence, test glob, and docs

**Files:**
- Modify: `.github/workflows/sync-conversions.yml`
- Modify: `package.json`
- Create: `docs/profitshare-webhook.md`

**Interfaces:**
- Consumes: nothing.
- Produces: runnable `npm test` covering `lib/` + `api/`; a 4-hourly safety-net cron; setup documentation.

- [ ] **Step 1: Change the cron schedule**

In `.github/workflows/sync-conversions.yml`, change:

```yaml
    - cron: '0 * * * *' # every hour, on the hour (UTC)
```

to:

```yaml
    - cron: '0 */4 * * *' # every 4 hours (UTC) — safety net; the webhook is the primary path
```

- [ ] **Step 2: Extend the test glob**

In `package.json`, change:

```json
    "test": "node --test scripts/*.test.mjs",
```

to:

```json
    "test": "node --test scripts/*.test.mjs lib/*.test.mjs api/*.test.mjs",
```

- [ ] **Step 3: Run the whole suite**

Run: `npm test`
Expected: PASS — existing script tests + Task 1/2/3 tests (16 new tests) all green.

- [ ] **Step 4: Write the setup doc**

```markdown
<!-- docs/profitshare-webhook.md -->
# ProfitShare Webhook → Google Ads (real-time conversions)

Endpoint: `POST/GET https://<your-domain>/api/profitshare-webhook`
(ProfitShare sends **GET**.) The site stays static; this is a standalone Vercel Function.

## One-time setup

1. **Vercel env vars** (Project → Settings → Environment Variables), same values as the
   GitHub Actions secrets, plus the new webhook token:
   - `PROFITSHARE_WEBHOOK_TOKEN` — a long random string you choose.
   - `GOOGLE_ADS_DEVELOPER_TOKEN`, `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`,
     `GOOGLE_OAUTH_REFRESH_TOKEN`, `GOOGLE_ADS_CUSTOMER_ID`, `GOOGLE_ADS_CONVERSION_ACTION_ID`.
   - Optional: `GOOGLE_ADS_LOGIN_CUSTOMER_ID`, `GOOGLE_TZ_OFFSET` (default `+03:00`).
2. **ProfitShare account** → set the Webhook URL to the endpoint above and the token to
   the same `PROFITSHARE_WEBHOOK_TOKEN`. ProfitShare sends it as `Authorization: Bearer {token}`.
3. **Google Ads conversion action** (the "Comision eMAG" action referenced by
   `GOOGLE_ADS_CONVERSION_ACTION_ID`): set **Count = "One"** per click. This is what makes
   the webhook and the 4-hourly safety-net cron idempotent — the same `gclid` counts once
   even if both send it.

## Behaviour

- `order_add` → uploads a click conversion (pending value) keyed on `gclid` (from `hash`)
  and `orderId` (from `order_reference`).
- `order_update` with `status=canceled` → RETRACTION by `orderId`.
- `order_update` that approves/updates → RESTATEMENT to the final `commissions` value.
- No `hash` (gclid) → 200 + skip. Consent-refusers are never uploaded here.

## Consent Mode (cookie-refusers)

Refusers are **not** uploaded by this webhook — that is by design (clean-legal posture).
They can only appear in Google Ads as **modeled "Unknown" conversions** via Consent Mode v2.
Verify (no code change): `<head>` sets consent default `denied`; accepting cookies fires a
`consent update` (see `src/components/CookieConsent.astro`); GA4/Ads are linked. Modeling
needs sufficient traffic volume.

## Limitations

- If a `canceled` update omits `order_reference`, retraction is impossible → logged and skipped.
- `order_reference ↔ order_ref` equivalence is assumed for cross-path dedup; confirm on a
  real payload. Primary dedup relies on the "count one per click" action setting, not orderId.
```

- [ ] **Step 5: Commit**

```bash
git add .github/workflows/sync-conversions.yml package.json docs/profitshare-webhook.md
git commit -m "chore: 4h safety-net cron, test glob, webhook setup docs"
```

---

## Self-Review

**Spec coverage:**
- Vercel Function receiver → Task 3. ✅
- Shared Google Ads lib (OAuth/upload/adjust) → Task 1. ✅
- Auth (Bearer 401 + soft UA) / skip-no-hash / upload-on-add / retract-on-cancel / restate-on-approve → Task 2 (logic) + Task 3 (UA). ✅
- Data mapping table → `buildConversion`/`buildAdjustment` in Task 2. ✅
- orderId dedup + "count one" config → Task 2/4 (orderId) + Task 5 docs (config). ✅
- Batch poller refactor + orderId → Task 4. ✅
- Cron hourly → 4h → Task 5. ✅
- Consent Mode verification (docs, no code) → Task 5 docs. ✅
- Testing with injected fakes → Tasks 1–3. ✅
- Assumed limitations documented → Task 5 docs. ✅

**Placeholder scan:** No TBD/TODO/"handle edge cases"; every code step is concrete. ✅

**Type consistency:** `makeClient(env, fetchImpl)` → `{ uploadClickConversions(list), adjustConversions(list) }` used identically in Tasks 2/3/4. `handleWebhook` return `{status, action, reason?}` consumed in Task 3. `buildAdjustment(query, env, type, now)` signature consistent across Task 2 test + impl. ✅

**Note for implementer:** The exact Google Ads v21 JSON field names for `uploadConversionAdjustments` (`conversionAdjustments`, `adjustmentType`, `orderId`, `adjustmentDateTime`, `restatementValue.adjustedValue`) should be spot-checked against current Google Ads REST docs (use the context7 skill) before the first live cancel/approve event; the upload path already matches the working `scripts/upload-conversions.mjs`.
