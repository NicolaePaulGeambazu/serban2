# ProfitShare Webhook → Google Ads (real-time conversions) — Design

Date: 2026-07-28
Status: Approved (design), pending implementation plan

## Goal

Import ProfitShare affiliate conversions into Google Ads in **real time** by
receiving ProfitShare's order webhooks, instead of relying only on the existing
hourly batch poller. The webhook fires the moment an order is registered on
eMAG, so conversions reach Google Ads' Smart Bidding faster.

## Context (what already exists)

The site already has a **batch** conversion pipeline:

1. `src/layouts/Base.astro` captures the `gclid`/`gbraid`/`wbraid` from the
   landing URL and appends it as a trailing path segment on ProfitShare links
   (`/l/<id>/<gclid>`), **only when the visitor accepts marketing cookies**.
2. ProfitShare stores that value as the commission `hash`.
3. An hourly GitHub Action runs `scripts/upload-conversions.mjs`, which pulls
   **approved** commissions from the ProfitShare Commissions API (40-day
   lookback), keeps those with a `hash`, and calls Google Ads
   `uploadClickConversions` (API v21, value = sum of `items_commision`, RON).
4. `scripts/ps-api.mjs` is the signed ProfitShare API client (HMAC-SHA1,
   `X-PS-Client` / `X-PS-Auth` / `X-PS-Date`). `scripts/verify-google.mjs`
   validates Google Ads credentials.

The site is a **static Astro app deployed on Vercel** (`outputDirectory: dist`,
zero client JS by default).

## Key constraints

- **Attribution needs a `gclid`.** Google Ads offline import cannot ingest a
  conversion without a click identifier. The purchase completes on eMAG, so
  buyer PII is never collected — Enhanced Conversions (hashed email/phone) is
  impossible. `gclid` (threaded through the ProfitShare `hash`) is the only
  identifier available.
- **Consent posture = clean-legal (option B).** The webhook uploads **only**
  consented conversions (those carrying a `gclid` hash). Visitors who reject
  marketing cookies are never individually tracked or uploaded; they are
  covered by **Google Consent Mode v2 modeling** (the "Unknown/modeled" bucket),
  which is a Google Ads configuration concern, not webhook logic.
- **Inbound webhook needs a server endpoint.** A static site can't receive it,
  so a single standalone Vercel Function under a root `/api/` directory is used.
  This keeps the whole site static — no Astro server/hybrid adapter.
- **ProfitShare `order_update` fields are optional.** Per the docs, `hash`,
  `order_date_time`, and `order_reference` are all optional on update events,
  so the receiver must degrade gracefully when they are absent.

## Architecture & data flow

```
ProfitShare  ──GET──▶  /api/profitshare-webhook  (Vercel Function)
(order_add /            │  1. verify Bearer token (+ soft User-Agent check)
 order_update)          │  2. if no hash(gclid) → 200, skip (non-consented / non-Google)
                        │  3. type=order_add        → uploadClickConversions (pending value)
                        │  4. update→status=canceled → uploadConversionAdjustments RETRACTION
                        │  5. update→status=approved  → uploadConversionAdjustments RESTATEMENT (final value)
                        ▼
                 Google Ads API (v21)   ◀── api/_lib/google-ads.mjs (shared)
                        ▲
   daily cron (safety net) ── scripts/upload-conversions.mjs (approved, 40-day lookback)
```

## Components

### `api/profitshare-webhook.js` (new)
- Handles **GET** (ProfitShare sends GET with query params); reads `req.query`.
- Auth: `Authorization: Bearer {PROFITSHARE_WEBHOOK_TOKEN}`, constant-time
  compare; return **401** on mismatch/absence. Soft-check `User-Agent:
  ProfitshareWebhooks/v1.0` (log, do not reject).
- Skip (return 200) when `hash` is absent — nothing to attribute.
- Dispatch by `type` / `status`:
  - `order_add` → upload one click conversion (pending value).
  - `order_update` with `status=canceled` → RETRACTION by `orderId`.
  - `order_update` with an approving status → RESTATEMENT to the final
    `commissions` value by `orderId`.
- Always return **200** quickly for authentic requests (even on skip) so
  ProfitShare does not needlessly retry.

### `api/_lib/google-ads.mjs` (new, shared)
Extracted from `upload-conversions.mjs`:
- `getAccessToken()` — OAuth refresh-token → access-token.
- `uploadClickConversions(conversions)` — POST `:uploadClickConversions`,
  `partialFailure: true`.
- `adjustConversions(adjustments, type)` — POST `:uploadConversionAdjustments`
  for `RETRACTION` / `RESTATEMENT`.
- Reads the same Google env vars; `API_VERSION = 'v21'`.

### `scripts/upload-conversions.mjs` (refactor)
- Import the shared lib instead of inlining OAuth + upload.
- Set `orderId = order_ref` on each conversion for consistency and future
  retraction support.
- Behaviour otherwise unchanged (approved-only, 40-day lookback).

### `.github/workflows/sync-conversions.yml` (edit)
- Change schedule from `0 * * * *` (hourly) to `0 3 * * *` (daily) — safety net.

### Docs
- Setup notes: Vercel env vars, ProfitShare account webhook URL + token, and
  the required Google Ads conversion-action setting.

## Data mapping (webhook payload → Google Ads)

| Google Ads field    | Webhook source        | Notes |
|---------------------|-----------------------|-------|
| `gclid`             | `hash`                | skip event if absent |
| `orderId`           | `order_reference`     | key for retraction/restatement |
| `conversionAction`  | `GOOGLE_ADS_CONVERSION_ACTION_ID` | env |
| `conversionDateTime`| `order_date_time` + TZ | TZ from `GOOGLE_TZ_OFFSET`, default `+03:00` |
| `conversionValue`   | `commissions`         | total commission (float) |
| `currencyCode`      | `RON`                 | constant |

## Dedup: webhook ↔ cron

- The Google Ads conversion action must be set to **Count: "One"** per click, so
  the same `gclid` counts once even if both the webhook and the daily cron send
  it. (Config step in the Google Ads UI — part of the plan checklist.)
- The daily cron only recovers approved conversions the webhook may have missed
  (endpoint down, no retry). It never double-counts thanks to "count one".

## Consent Mode (secondary deliverable)

The webhook does not touch cookie-refusers. They appear via **Consent Mode v2**
modeled conversions. Verify (no webhook code): default state is `denied` in
`<head>`, the `consent update` fires correctly on accept, and GA4/Ads linkage
is in place. Report findings; fix only if trivially wrong.

## Security

- Secrets only via Vercel environment variables — never committed.
  New: `PROFITSHARE_WEBHOOK_TOKEN`. Reused (mirrored from GitHub secrets):
  `GOOGLE_ADS_DEVELOPER_TOKEN`, `GOOGLE_OAUTH_CLIENT_ID`,
  `GOOGLE_OAUTH_CLIENT_SECRET`, `GOOGLE_OAUTH_REFRESH_TOKEN`,
  `GOOGLE_ADS_CUSTOMER_ID`, `GOOGLE_ADS_CONVERSION_ACTION_ID`,
  optional `GOOGLE_ADS_LOGIN_CUSTOMER_ID`, `GOOGLE_TZ_OFFSET`.
- Constant-time token comparison; 401 on failure.
- The endpoint is a server function, not a page asset, so the site CSP is
  unaffected.

## Testing

- Unit tests for the handler with mocked payloads: `order_add`, `canceled`,
  `approved`, missing `hash`, wrong/absent token. Inject a fake Google Ads
  client so tests never hit the network (via `node --test`, matching the
  existing `scripts/*.test.mjs` convention).
- `scripts/verify-google.mjs` confirms real credentials before scheduling.

## Assumed limitations

- If an `order_update` with `status=canceled` omits `order_reference`, the
  retraction cannot be built → log and skip.
- The `order_reference ↔ order_ref` equivalence is assumed and must be
  confirmed against a real payload before trusting cross-path dedup by orderId.
  (Primary dedup does not depend on it — it relies on "count one per click".)
- Consent Mode modeled conversions require sufficient traffic volume; low-volume
  accounts may see few or no modeled "Unknown" conversions.

## Out of scope

- Persisting order/gclid mappings to a datastore (KV/DB). Not needed: the
  payload carries everything, and retraction keys off `order_reference`.
- Tagging gclid or firing ProfitShare tracking without consent (option A).
- Any change to product data, rankings, or the static site UI.
