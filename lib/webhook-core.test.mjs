import { test } from 'node:test';
import assert from 'node:assert/strict';
import { authorize, buildEvent, handleWebhook } from './webhook-core.mjs';

const ENV = {
  PROFITSHARE_WEBHOOK_TOKEN: 'secret-token',
  GOOGLE_ADS_CUSTOMER_ID: '1234567890',
  GOOGLE_ADS_CONVERSION_ACTION_ID: '555',
};
const NOW = new Date('2026-01-02T00:00:00Z'); // +03:00 → 2026-01-02T03:00:00
const AUTH = { authorization: 'Bearer secret-token' };

function fakeClient(resp = { status: 200, json: {} }) {
  const calls = [];
  return { calls, async ingestEvents(events) { calls.push(events); return resp; } };
}

// Capture console output so log lines are asserted, not leaked into test output.
function capture() {
  const logs = [], errs = [];
  const pl = console.log, pe = console.error;
  console.log = (...a) => logs.push(a.join(' '));
  console.error = (...a) => errs.push(a.join(' '));
  return { logs, errs, restore() { console.log = pl; console.error = pe; } };
}

async function run(args) {
  const cap = capture();
  try { return { r: await handleWebhook(args), cap }; } finally { cap.restore(); }
}

test('authorize accepts the exact Bearer token and rejects others', () => {
  assert.equal(authorize({ authorization: 'Bearer secret-token' }, 'secret-token'), true);
  assert.equal(authorize({ Authorization: 'Bearer secret-token' }, 'secret-token'), true);
  assert.equal(authorize({ authorization: 'Bearer wrong' }, 'secret-token'), false);
  assert.equal(authorize({}, 'secret-token'), false);
  assert.equal(authorize({ authorization: 'Bearer x' }, ''), false);
});

test('buildEvent maps the payload to a Data Manager event with RFC3339 timestamp', () => {
  const ev = buildEvent({ hash: 'GCLID1', order_reference: 'OR1', order_date_time: '2026-01-01 05:00:00' }, ENV, 13.99, NOW);
  assert.deepEqual(ev, {
    adIdentifiers: { gclid: 'GCLID1' },
    transactionId: 'OR1',
    eventTimestamp: '2026-01-01T05:00:00+03:00',
    conversionValue: 13.99,
    currency: 'RON',
    eventSource: 'WEB',
  });
});

test('buildEvent falls back to now-based timestamp when order_date_time is missing', () => {
  const ev = buildEvent({ hash: 'G', order_reference: 'OR1' }, ENV, 1, NOW);
  assert.equal(ev.eventTimestamp, '2026-01-02T03:00:00+03:00');
});

test('handleWebhook returns 401 on a bad token and never calls Google', async () => {
  const client = fakeClient();
  const { r } = await run({ query: { hash: 'g', type: 'order_add', order_reference: 'OR1' }, headers: { authorization: 'Bearer nope' }, env: ENV, client });
  assert.deepEqual([r.status, r.action], [401, 'unauthorized']);
  assert.equal(client.calls.length, 0);
});

test('handleWebhook skips (200) when there is no gclid', async () => {
  const client = fakeClient();
  const { r } = await run({ query: { type: 'order_add', order_reference: 'OR1', commissions: '5' }, headers: AUTH, env: ENV, client });
  assert.deepEqual([r.status, r.action, r.reason], [200, 'skip', 'no-gclid']);
  assert.equal(client.calls.length, 0);
});

test('handleWebhook skips (200) when there is no order_reference (needed as transactionId)', async () => {
  const client = fakeClient();
  const { r } = await run({ query: { type: 'order_add', hash: 'G', commissions: '5' }, headers: AUTH, env: ENV, client });
  assert.deepEqual([r.status, r.action, r.reason], [200, 'skip', 'no-order-ref']);
  assert.equal(client.calls.length, 0);
});

test('handleWebhook ingests an upload on order_add and logs success', async () => {
  const client = fakeClient();
  const { r, cap } = await run({
    query: { type: 'order_add', hash: 'G', order_reference: 'OR1', order_date_time: '2026-01-01 05:00:00', commissions: '13.99', status: 'pending' },
    headers: AUTH, env: ENV, client, now: NOW,
  });
  assert.deepEqual([r.status, r.action], [200, 'upload']);
  assert.equal(client.calls[0][0].adIdentifiers.gclid, 'G');
  assert.equal(client.calls[0][0].conversionValue, 13.99);
  assert.equal(cap.errs.length, 0);
  assert.match(cap.logs[0], /upload ok order=OR1 gclid=G 13\.99 RON/);
});

test('handleWebhook coerces a non-numeric commissions value to 0', async () => {
  const client = fakeClient();
  const { r } = await run({
    query: { type: 'order_add', hash: 'G', order_reference: 'OR1', commissions: 'not-a-number' },
    headers: AUTH, env: ENV, client, now: NOW,
  });
  assert.equal(r.action, 'upload');
  assert.equal(client.calls[0][0].conversionValue, 0);
});

test('handleWebhook restates the value on an approving update (same transactionId)', async () => {
  const client = fakeClient();
  const { r, cap } = await run({
    query: { hash: 'G', order_reference: 'OR1', status: 'approved', commissions: '20.5' },
    headers: AUTH, env: ENV, client, now: NOW,
  });
  assert.deepEqual([r.status, r.action], [200, 'restate']);
  assert.equal(client.calls[0][0].transactionId, 'OR1');
  assert.equal(client.calls[0][0].conversionValue, 20.5);
  assert.match(cap.logs[0], /restate ok order=OR1/);
});

test('handleWebhook soft-retracts a canceled order by ingesting value 0', async () => {
  const client = fakeClient();
  const { r, cap } = await run({
    query: { hash: 'G', order_reference: 'OR1', status: 'canceled', commissions: '13.99' },
    headers: AUTH, env: ENV, client, now: NOW,
  });
  assert.deepEqual([r.status, r.action], [200, 'retract']);
  assert.equal(client.calls[0][0].conversionValue, 0);
  assert.match(cap.logs[0], /retract ok order=OR1/);
});

test('handleWebhook is a noop for a non-add update with no commissions', async () => {
  const client = fakeClient();
  const { r } = await run({ query: { hash: 'G', order_reference: 'OR1', status: 'pending' }, headers: AUTH, env: ENV, client, now: NOW });
  assert.equal(r.action, 'noop');
  assert.equal(client.calls.length, 0);
});

test('handleWebhook still returns 200/upload but logs an error when Data Manager rejects the event', async () => {
  const client = fakeClient({ status: 400, json: { error: { message: 'bad request' } } });
  const { r, cap } = await run({
    query: { type: 'order_add', hash: 'G', order_reference: 'OR1', order_date_time: '2026-01-01 05:00:00', commissions: '13.99' },
    headers: AUTH, env: ENV, client, now: NOW,
  });
  assert.deepEqual([r.status, r.action], [200, 'upload']);
  assert.equal(cap.logs.length, 0);
  assert.equal(cap.errs.length, 1);
  assert.match(cap.errs[0], /Google Ads upload failed 400/);
});
