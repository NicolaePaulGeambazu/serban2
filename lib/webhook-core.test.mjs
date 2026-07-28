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

test('buildConversion falls back to 0 for a non-numeric commissions value', () => {
  const c = buildConversion({ hash: 'GCLID1', order_reference: 'OR1', order_date_time: '2026-01-01 05:00:00', commissions: 'not-a-number' }, ENV);
  assert.equal(c.conversionValue, 0);
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

test('handleWebhook still returns 200/upload but logs an error when Google Ads rejects the upload', async () => {
  const client = {
    async uploadClickConversions() { return { status: 400, json: { error: { message: 'bad request' } } }; },
    async adjustConversions() { return { status: 200, json: {} }; },
  };
  const prevError = console.error;
  const calls = [];
  console.error = (...args) => { calls.push(args); };
  try {
    const r = await handleWebhook({
      query: { type: 'order_add', hash: 'G', order_reference: 'OR1', order_date_time: '2026-01-01 05:00:00', commissions: '13.99', status: 'pending' },
      headers: { authorization: 'Bearer secret-token' }, env: ENV, client, now: NOW,
    });
    assert.deepEqual([r.status, r.action], [200, 'upload']);
    assert.equal(calls.length, 1);
    assert.match(calls[0].join(' '), /Google Ads upload failed/);
  } finally {
    console.error = prevError;
  }
});
