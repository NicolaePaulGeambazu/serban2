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
