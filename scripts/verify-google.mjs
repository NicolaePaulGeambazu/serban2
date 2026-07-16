#!/usr/bin/env node
/**
 * verify-google.mjs — checks the Google Ads API credentials work, without needing
 * a real conversion. Validates OAuth (client id/secret/refresh token), the
 * developer token, and that the customer id is reachable.
 * Run via the "Verify Google Ads access" workflow (secrets injected there).
 */
const {
  GOOGLE_ADS_DEVELOPER_TOKEN, GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET,
  GOOGLE_OAUTH_REFRESH_TOKEN, GOOGLE_ADS_CUSTOMER_ID, GOOGLE_ADS_LOGIN_CUSTOMER_ID,
  GOOGLE_ADS_CONVERSION_ACTION_ID,
} = process.env;

let ok = true;
for (const k of ['GOOGLE_ADS_DEVELOPER_TOKEN','GOOGLE_OAUTH_CLIENT_ID','GOOGLE_OAUTH_CLIENT_SECRET','GOOGLE_OAUTH_REFRESH_TOKEN','GOOGLE_ADS_CUSTOMER_ID']) {
  if (!process.env[k]) { console.log('❌ lipsește', k); ok = false; }
}
if (!ok) process.exit(1);
console.log('Conversion action id:', GOOGLE_ADS_CONVERSION_ACTION_ID || '(lipsește)');

// 1. OAuth: refresh token -> access token
let token;
try {
  const body = new URLSearchParams({
    client_id: GOOGLE_OAUTH_CLIENT_ID, client_secret: GOOGLE_OAUTH_CLIENT_SECRET,
    refresh_token: GOOGLE_OAUTH_REFRESH_TOKEN, grant_type: 'refresh_token',
  });
  const r = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', body });
  const j = await r.json();
  if (!j.access_token) { console.log('❌ OAuth FAILED:', JSON.stringify(j)); process.exit(1); }
  token = j.access_token;
  console.log('✅ OAuth OK (client id/secret + refresh token valide)');
} catch (e) { console.log('❌ OAuth error:', e.message); process.exit(1); }

// 2. developer token + customer reachable — try a few API versions
const versions = ['v21', 'v20', 'v19', 'v18', 'v17'];
let done = false;
for (const v of versions) {
  const headers = { Authorization: `Bearer ${token}`, 'developer-token': GOOGLE_ADS_DEVELOPER_TOKEN };
  if (GOOGLE_ADS_LOGIN_CUSTOMER_ID) headers['login-customer-id'] = GOOGLE_ADS_LOGIN_CUSTOMER_ID;
  const r = await fetch(`https://googleads.googleapis.com/${v}/customers:listAccessibleCustomers`, { headers });
  const txt = await r.text();
  if (r.status === 404) continue; // wrong API version, try next
  console.log(`\nAPI ${v} → HTTP ${r.status}`);
  if (r.status === 200) {
    let names = [];
    try { names = (JSON.parse(txt).resourceNames || []).map((x) => x.replace('customers/', '')); } catch {}
    console.log('✅ Developer token OK. Conturi accesibile:', names.join(', ') || '(niciunul)');
    if (names.includes(String(GOOGLE_ADS_CUSTOMER_ID))) {
      console.log(`✅ GOOGLE_ADS_CUSTOMER_ID (${GOOGLE_ADS_CUSTOMER_ID}) e accesibil. Folosește API ${v} în upload-conversions.mjs.`);
    } else {
      console.log(`⚠️ GOOGLE_ADS_CUSTOMER_ID (${GOOGLE_ADS_CUSTOMER_ID}) NU e în lista de conturi accesibile — verifică valoarea sau setează GOOGLE_ADS_LOGIN_CUSTOMER_ID (MCC).`);
    }
  } else {
    console.log('❌ Google Ads API a răspuns cu eroare:', txt.slice(0, 400));
  }
  done = true;
  break;
}
if (!done) console.log('❌ Nicio versiune de API nu a răspuns (toate 404). Ceva e greșit cu endpoint-ul.');
