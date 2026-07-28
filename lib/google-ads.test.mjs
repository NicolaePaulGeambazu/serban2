import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getAccessToken, ingestEvents, makeClient } from './google-ads.mjs';

const ENV = {
  GOOGLE_OAUTH_CLIENT_ID: 'cid', GOOGLE_OAUTH_CLIENT_SECRET: 'sec',
  GOOGLE_OAUTH_REFRESH_TOKEN: 'ref',
  GOOGLE_ADS_CUSTOMER_ID: '1234567890', GOOGLE_ADS_CONVERSION_ACTION_ID: '555',
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

test('ingestEvents POSTs to the Data Manager endpoint with the right destination + consent', async () => {
  const f = fakeFetch([['datamanager.googleapis.com/v1/events:ingest', jsonRes({})]]);
  const events = [{ adIdentifiers: { gclid: 'g' }, transactionId: 'OR1', conversionValue: 5, currency: 'RON', eventSource: 'WEB' }];
  const r = await ingestEvents(events, { ...ENV, GOOGLE_ADS_LOGIN_CUSTOMER_ID: '999' }, 'AT', f);
  assert.equal(r.status, 200);
  const c = f.calls[0];
  assert.equal(c.url, 'https://datamanager.googleapis.com/v1/events:ingest');
  assert.equal(c.opts.headers.Authorization, 'Bearer AT');
  assert.equal(c.opts.headers['developer-token'], undefined); // Data Manager needs no developer token
  const body = JSON.parse(c.opts.body);
  assert.deepEqual(body.destinations[0], {
    operatingAccount: { accountType: 'GOOGLE_ADS', accountId: '1234567890' },
    loginAccount: { accountType: 'GOOGLE_ADS', accountId: '999' },
    productDestinationId: '555',
  });
  assert.deepEqual(body.consent, { adUserData: 'CONSENT_GRANTED', adPersonalization: 'CONSENT_GRANTED' });
  assert.equal(body.validateOnly, false);
  assert.deepEqual(body.events, events);
});

test('ingestEvents loginAccount defaults to the operating customer id when no MCC is set', async () => {
  const f = fakeFetch([['events:ingest', jsonRes({})]]);
  await ingestEvents([], ENV, 'AT', f);
  const body = JSON.parse(f.calls[0].opts.body);
  assert.equal(body.destinations[0].loginAccount.accountId, '1234567890');
});

test('ingestEvents honours DATAMANAGER_VALIDATE_ONLY=1 (dry run)', async () => {
  const f = fakeFetch([['events:ingest', jsonRes({})]]);
  await ingestEvents([], { ...ENV, DATAMANAGER_VALIDATE_ONLY: '1' }, 'AT', f);
  assert.equal(JSON.parse(f.calls[0].opts.body).validateOnly, true);
});

test('makeClient fetches the token once and reuses it across ingest calls', async () => {
  const f = fakeFetch([
    ['oauth2.googleapis.com', jsonRes({ access_token: 'AT' })],
    ['events:ingest', jsonRes({})],
  ]);
  const client = makeClient(ENV, f);
  await client.ingestEvents([{ transactionId: 'a' }]);
  await client.ingestEvents([{ transactionId: 'b' }]);
  const oauthCalls = f.calls.filter((c) => c.url.includes('oauth2.googleapis.com'));
  assert.equal(oauthCalls.length, 1);
});
