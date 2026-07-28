/**
 * Pure logic for the ProfitShare → Google Ads (Data Manager API) webhook.
 * No network here — the Data Manager `client` and `now` are injected so this is
 * fully unit-testable.
 *
 * Event model (Data Manager `events:ingest`):
 *  - order_add        → ingest the conversion (pending value) for a fast signal.
 *  - approving update → ingest again with the SAME transactionId; Data Manager
 *                       overrides the recorded value (a restate).
 *  - canceled         → re-ingest the SAME transactionId with value 0. Data
 *                       Manager has no true retraction for events, so zeroing the
 *                       value is the best available "soft retract".
 * transactionId = order_reference, so webhook + cron + resends deduplicate.
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
function money(v) {
  const n = parseFloat(v);
  return Number.isFinite(n) ? Number(n.toFixed(2)) : 0;
}

const pad = (n) => String(n).padStart(2, '0');

// A JS Date → RFC3339 with the fixed offset, e.g. 2026-07-28T10:00:00+03:00.
function rfc3339FromDate(date, offset) {
  const sign = offset[0] === '-' ? -1 : 1;
  const [oh, om] = offset.slice(1).split(':').map(Number);
  const d = new Date(date.getTime() + sign * (oh * 60 + om) * 60000);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}${offset}`;
}

// Data Manager requires an RFC3339 eventTimestamp. ProfitShare sends
// "YYYY-MM-DD HH:mm:ss" (local, no offset); attach our offset and a 'T'. On an
// update where order_date_time is absent, fall back to now (ignored on a
// transactionId match anyway).
function eventTimestamp(query, env, now) {
  const raw = (query.order_date_time || '').trim();
  if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}$/.test(raw)) return `${raw.replace(' ', 'T')}${tz(env)}`;
  return rfc3339FromDate(now, tz(env));
}

// Build a Data Manager Event. Consent lives at the request level (google-ads.mjs).
export function buildEvent(query, env, value, now) {
  return {
    adIdentifiers: { gclid: query.hash },
    transactionId: query.order_reference,
    eventTimestamp: eventTimestamp(query, env, now),
    conversionValue: value,
    currency: 'RON',
    eventSource: 'WEB',
  };
}

// Log every money-moving Data Manager call: one line per event. A failure (non-2xx
// or an error body) is an error line — the ONLY signal, since we still return 200
// to ProfitShare; a success is an info line so the logs read as an audit trail.
function reportResult(label, detail, r) {
  const errBody = r?.json?.error ?? r?.json?.partialFailureError;
  if (!r || r.status < 200 || r.status >= 300 || errBody) {
    console.error('profitshare-webhook: Google Ads', label, 'failed', r?.status, detail, JSON.stringify(errBody ?? r?.json));
  } else {
    console.log('profitshare-webhook: Google Ads', label, 'ok', detail);
  }
}

export async function handleWebhook({ query, headers, env, client, now = new Date() }) {
  if (!authorize(headers, env.PROFITSHARE_WEBHOOK_TOKEN)) return { status: 401, action: 'unauthorized' };
  if (!query.hash) return { status: 200, action: 'skip', reason: 'no-gclid' };
  if (!query.order_reference) return { status: 200, action: 'skip', reason: 'no-order-ref' };

  const status = String(query.status || '').toLowerCase();
  const type = String(query.type || '').toLowerCase();

  let value, action;
  if (status === 'canceled' || status === 'cancelled') {
    value = 0; action = 'retract'; // soft retract — Data Manager can't remove an event
  } else if (type === 'order_add') {
    value = money(query.commissions); action = 'upload';
  } else if (query.commissions != null) {
    value = money(query.commissions); action = 'restate'; // same transactionId overrides value
  } else {
    return { status: 200, action: 'noop' };
  }

  const ev = buildEvent(query, env, value, now);
  const r = await client.ingestEvents([ev]);
  reportResult(action, `order=${ev.transactionId} gclid=${ev.adIdentifiers.gclid} ${ev.conversionValue} ${ev.currency}`, r);
  return { status: 200, action };
}
