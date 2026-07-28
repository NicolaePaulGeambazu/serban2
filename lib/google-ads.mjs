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
