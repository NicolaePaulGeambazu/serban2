/**
 * Google Data Manager API client — sends Google Ads offline conversions.
 *
 * Google closed the classic Ads `UploadClickConversions` endpoint to new
 * integrations (CUSTOMER_NOT_ALLOWLISTED_FOR_THIS_FEATURE); the Data Manager API
 * (`events:ingest`) is the sanctioned replacement. Auth is a plain OAuth Bearer
 * token — no developer-token or login-customer-id headers. The refresh token
 * MUST be minted with the `https://www.googleapis.com/auth/datamanager` scope.
 *
 * Shared by the real-time webhook (api/profitshare-webhook.js) and the batch
 * poller (scripts/upload-conversions.mjs). No secrets here — all via `env`.
 *
 * env keys: GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET,
 *   GOOGLE_OAUTH_REFRESH_TOKEN, GOOGLE_ADS_CUSTOMER_ID (digits, no dashes),
 *   GOOGLE_ADS_CONVERSION_ACTION_ID; optional GOOGLE_ADS_LOGIN_CUSTOMER_ID
 *   (manager/MCC id) and DATAMANAGER_VALIDATE_ONLY ('1' to dry-run without recording).
 */
const INGEST_URL = 'https://datamanager.googleapis.com/v1/events:ingest';

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

// The Data Manager destination: which Google Ads account + conversion action to write to.
function destination(env) {
  const login = env.GOOGLE_ADS_LOGIN_CUSTOMER_ID || env.GOOGLE_ADS_CUSTOMER_ID;
  return {
    operatingAccount: { accountType: 'GOOGLE_ADS', accountId: String(env.GOOGLE_ADS_CUSTOMER_ID) },
    loginAccount: { accountType: 'GOOGLE_ADS', accountId: String(login) },
    productDestinationId: String(env.GOOGLE_ADS_CONVERSION_ACTION_ID),
  };
}

/**
 * Ingest offline-conversion events. `events` is an array of Data Manager Event
 * objects (built in lib/webhook-core.mjs). Consent is GRANTED because we only
 * ever send gclid-carrying conversions from marketing-consented visitors.
 * Returns { status, json } — the caller inspects it (we never throw on non-2xx).
 */
export async function ingestEvents(events, env, token, fetchImpl = fetch) {
  const payload = {
    destinations: [destination(env)],
    events,
    consent: { adUserData: 'CONSENT_GRANTED', adPersonalization: 'CONSENT_GRANTED' },
    validateOnly: env.DATAMANAGER_VALIDATE_ONLY === '1',
  };
  const res = await fetchImpl(INGEST_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const json = await res.json().catch(() => null);
  return { status: res.status, json };
}

export function makeClient(env, fetchImpl = fetch) {
  let tokenPromise;
  const token = () => (tokenPromise ??= getAccessToken(env, fetchImpl));
  return {
    async ingestEvents(events) { return ingestEvents(events, env, await token(), fetchImpl); },
  };
}
