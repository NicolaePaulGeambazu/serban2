# ProfitShare Webhook → Google Ads (real-time conversions)

Endpoint: `https://www.topalegeri.ro/api/profitshare-webhook/` (ProfitShare sends **GET**;
note the **trailing slash** — `vercel.json` has `trailingSlash: true`, so the no-slash URL
308-redirects). The site stays static; this is a standalone Vercel Function.

Conversions are delivered to Google Ads via the **Data Manager API** (`events:ingest`) —
Google closed the classic `UploadClickConversions` endpoint to new integrations.

## One-time setup

1. **Vercel env vars** (Project → Settings → Environment Variables):
   - `PROFITSHARE_WEBHOOK_TOKEN` — a long random string you choose (the webhook's Bearer token).
   - `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, `GOOGLE_OAUTH_REFRESH_TOKEN`,
     `GOOGLE_ADS_CUSTOMER_ID` (digits, no dashes), `GOOGLE_ADS_CONVERSION_ACTION_ID`.
   - Optional: `GOOGLE_ADS_LOGIN_CUSTOMER_ID` (MCC), `GOOGLE_TZ_OFFSET` (default `+03:00`),
     `DATAMANAGER_VALIDATE_ONLY=1` (dry-run: validate without recording).
   - **No developer token** is needed (Data Manager auth is OAuth Bearer only).
2. **Refresh token scope** — the `GOOGLE_OAUTH_REFRESH_TOKEN` MUST be minted with the
   **`https://www.googleapis.com/auth/datamanager`** scope (the old `adwords` scope will
   fail). Mint it in the OAuth Playground with "Use your own OAuth credentials" set to the
   SAME client id/secret above. Keep the OAuth consent screen **Published** so the token
   doesn't expire every 7 days.
3. **ProfitShare account** (API & Webhooks) → set the Webhook URL to the endpoint above,
   tick **"Include an API key on request"**, and paste `PROFITSHARE_WEBHOOK_TOKEN` into the
   **API KEY (BEARER TOKEN)** field. ProfitShare then sends `Authorization: Bearer {token}`.
4. **Google Ads conversion action** (`GOOGLE_ADS_CONVERSION_ACTION_ID`): set **Count = "One"**
   per click, so the webhook and the safety-net cron dedupe to one conversion per `gclid`.

## Behaviour

Every event needs a `gclid` (from `hash`) and an `order_reference` (used as the Data Manager
`transactionId`, which dedupes across the webhook, the cron, and resends).

- `order_add` → **ingest** the conversion (pending value) — fast signal.
- approving `order_update` → **re-ingest** the same `transactionId` with the final value;
  Data Manager overrides the recorded value (a restate).
- `order_update` with `status=canceled` → **soft-retract**: re-ingest the same `transactionId`
  with `conversionValue: 0`. Data Manager has **no true retraction** for events, so zeroing
  the value is the best available correction (the conversion *count* may linger).
- No `hash`, or no `order_reference` → 200 + skip (nothing to attribute / no dedup key).

## Consent Mode (cookie-refusers)

Refusers are **not** uploaded by this webhook — by design (clean-legal posture). They can
only appear in Google Ads as **modeled "Unknown" conversions** via Consent Mode v2. The
request always sends `consent: { adUserData: CONSENT_GRANTED, adPersonalization: CONSENT_GRANTED }`
because only consented, gclid-carrying conversions ever reach the ingest call.

## Limitations

- **No true retraction** (Data Manager events are add/override only). Cancels zero the value.
- `order_reference ↔ order_ref` equivalence is assumed for cross-path dedup; confirm on a
  real payload. Primary dedup relies on `transactionId` + the "count one per click" setting.
- `gbraid`/`wbraid` clicks (iOS/in-app) are currently sent in the `gclid` field — follow-up.
