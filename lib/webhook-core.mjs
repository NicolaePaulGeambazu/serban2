/**
 * Pure logic for the ProfitShare → Google Ads webhook. No network here — the
 * Google Ads `client` and `now` are injected so this is fully unit-testable.
 */
import crypto from 'node:crypto';

function timingSafeEqualStr(a, b) {
  const ba = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

export function authorize(headers, expectedToken) {
  if (!expectedToken) return false;
  const raw = headers.authorization || headers.Authorization || '';
  const m = /^Bearer\s+(.+)$/.exec(raw);
  return m ? timingSafeEqualStr(m[1], expectedToken) : false;
}

function tz(env) { return env.GOOGLE_TZ_OFFSET || '+03:00'; }
function actionResource(env) {
  return `customers/${env.GOOGLE_ADS_CUSTOMER_ID}/conversionActions/${env.GOOGLE_ADS_CONVERSION_ACTION_ID}`;
}
function money(v) { return Number(parseFloat(v || '0').toFixed(2)); }

function fmtDateTime(date, offset) {
  const sign = offset[0] === '-' ? -1 : 1;
  const [oh, om] = offset.slice(1).split(':').map(Number);
  const d = new Date(date.getTime() + sign * (oh * 60 + om) * 60000);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())}${offset}`;
}

export function buildConversion(query, env) {
  if (!query.hash) return null;
  return {
    gclid: query.hash,
    orderId: query.order_reference,
    conversionAction: actionResource(env),
    conversionDateTime: `${(query.order_date_time || '').trim()}${tz(env)}`,
    conversionValue: money(query.commissions),
    currencyCode: 'RON',
  };
}

export function buildAdjustment(query, env, type, now) {
  const adj = {
    conversionAction: actionResource(env),
    adjustmentType: type,
    orderId: query.order_reference,
    adjustmentDateTime: fmtDateTime(now, tz(env)),
  };
  if (type === 'RESTATEMENT') {
    adj.restatementValue = { adjustedValue: money(query.commissions), currencyCode: 'RON' };
  }
  return adj;
}

export async function handleWebhook({ query, headers, env, client, now = new Date() }) {
  if (!authorize(headers, env.PROFITSHARE_WEBHOOK_TOKEN)) return { status: 401, action: 'unauthorized' };
  if (!query.hash) return { status: 200, action: 'skip', reason: 'no-gclid' };

  const status = String(query.status || '').toLowerCase();
  const type = String(query.type || '').toLowerCase();

  if (status === 'canceled' || status === 'cancelled') {
    if (!query.order_reference) return { status: 200, action: 'skip', reason: 'cancel-no-order-ref' };
    await client.adjustConversions([buildAdjustment(query, env, 'RETRACTION', now)]);
    return { status: 200, action: 'retract' };
  }
  if (type === 'order_add') {
    await client.uploadClickConversions([buildConversion(query, env)]);
    return { status: 200, action: 'upload' };
  }
  if (query.order_reference && query.commissions != null) {
    await client.adjustConversions([buildAdjustment(query, env, 'RESTATEMENT', now)]);
    return { status: 200, action: 'restate' };
  }
  return { status: 200, action: 'noop' };
}
