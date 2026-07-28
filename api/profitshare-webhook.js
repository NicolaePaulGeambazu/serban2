/**
 * ProfitShare Webhooks receiver (Order Add / Order Update). ProfitShare sends a
 * GET with the order params and, if configured, `Authorization: Bearer {token}`
 * plus `User-Agent: ProfitshareWebhooks/v1.0`. We upload/adjust the matching
 * Google Ads conversion. Static-site-safe: this is a standalone Vercel Function.
 */
import { makeClient } from '../lib/google-ads.mjs';
import { handleWebhook } from '../lib/webhook-core.mjs';

export async function handler(req, res) {
  const env = process.env;
  const ua = (req.headers || {})['user-agent'] || '';
  if (!ua.startsWith('ProfitshareWebhooks/')) console.warn('profitshare-webhook: unexpected user-agent', ua);
  try {
    const client = makeClient(env);
    const result = await handleWebhook({ query: req.query || {}, headers: req.headers || {}, env, client });
    return res.status(result.status).json({ ok: result.status < 400, action: result.action, reason: result.reason });
  } catch (e) {
    console.error('profitshare-webhook error:', e);
    // 200 on internal error: keep ProfitShare from hammering retries; we log for ourselves.
    return res.status(200).json({ ok: false, error: 'internal' });
  }
}

export default handler;
