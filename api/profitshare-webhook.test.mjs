import { test } from 'node:test';
import assert from 'node:assert/strict';
import { handler } from './profitshare-webhook.js';

function fakeRes() {
  return {
    _status: null, _json: null,
    status(s) { this._status = s; return this; },
    json(o) { this._json = o; return this; },
  };
}

test('handler returns 401 without a valid token (no Google env needed)', async () => {
  const prev = process.env.PROFITSHARE_WEBHOOK_TOKEN;
  process.env.PROFITSHARE_WEBHOOK_TOKEN = 'secret-token';
  const res = fakeRes();
  await handler({ query: { hash: 'g', type: 'order_add' }, headers: { authorization: 'Bearer nope' } }, res);
  assert.equal(res._status, 401);
  process.env.PROFITSHARE_WEBHOOK_TOKEN = prev;
});

test('handler skips (200) a request with no hash and never calls Google', async () => {
  const prev = process.env.PROFITSHARE_WEBHOOK_TOKEN;
  process.env.PROFITSHARE_WEBHOOK_TOKEN = 'secret-token';
  const res = fakeRes();
  await handler({ query: { type: 'order_add' }, headers: { authorization: 'Bearer secret-token' } }, res);
  assert.equal(res._status, 200);
  assert.equal(res._json.action, 'skip');
  process.env.PROFITSHARE_WEBHOOK_TOKEN = prev;
});
