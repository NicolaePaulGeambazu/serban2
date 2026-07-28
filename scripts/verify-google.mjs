#!/usr/bin/env node
/**
 * verify-google.mjs — health check for the Data Manager credentials, without
 * recording a real conversion. Validates OAuth (client id/secret/refresh token)
 * AND that the refresh token carries the `datamanager` scope and can reach the
 * destination, via a validateOnly (dry-run) events:ingest.
 * Run via the "Verify Google Ads access" workflow (secrets injected there),
 * daily as a heartbeat — a failure means the token expired/lost scope.
 */
import { ingestEvents } from '../lib/google-ads.mjs';

const REQUIRED = ['GOOGLE_OAUTH_CLIENT_ID', 'GOOGLE_OAUTH_CLIENT_SECRET', 'GOOGLE_OAUTH_REFRESH_TOKEN', 'GOOGLE_ADS_CUSTOMER_ID', 'GOOGLE_ADS_CONVERSION_ACTION_ID'];
let ok = true;
for (const k of REQUIRED) { if (!process.env[k]) { console.log('❌ lipsește', k); ok = false; } }
if (!ok) process.exit(1);

// 1. OAuth: refresh token -> access token
let token;
try {
  const body = new URLSearchParams({
    client_id: process.env.GOOGLE_OAUTH_CLIENT_ID, client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET,
    refresh_token: process.env.GOOGLE_OAUTH_REFRESH_TOKEN, grant_type: 'refresh_token',
  });
  const r = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', body });
  const j = await r.json();
  if (!j.access_token) { console.log('❌ OAuth FAILED:', JSON.stringify(j)); process.exit(1); }
  token = j.access_token;
  console.log('✅ OAuth OK (client id/secret + refresh token valide)');
} catch (e) { console.log('❌ OAuth error:', e.message); process.exit(1); }

// 2. Data Manager reachable + scope OK — validateOnly dry-run (records nothing)
const env = { ...process.env, DATAMANAGER_VALIDATE_ONLY: '1' };
const dummy = [{
  adIdentifiers: { gclid: 'HEALTHCHECK_VALIDATE_ONLY' },
  transactionId: 'healthcheck',
  eventTimestamp: '2026-01-01T00:00:00+03:00',
  conversionValue: 0,
  currency: 'RON',
  eventSource: 'WEB',
}];
const { status, json } = await ingestEvents(dummy, env, token);
console.log(`\nData Manager validateOnly → HTTP ${status}`);
if (status >= 200 && status < 300 && !json?.error) {
  console.log('✅ Data Manager OK — refresh token has the datamanager scope and the destination is reachable.');
} else {
  console.log('❌ Data Manager error:', JSON.stringify(json).slice(0, 600));
  process.exit(1);
}
