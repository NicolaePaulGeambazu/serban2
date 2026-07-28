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
