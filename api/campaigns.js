/**
 * Live eMAG campaigns for the campaign strip, so a new campaign shows up without
 * a redeploy. The Profitshare key stays server-side; the CDN caches the answer for
 * an hour. Links from the build-time snapshot are reused by campaign id.
 */
import { psRequest } from '../scripts/ps-api.mjs';
import { fetchEmagCampaigns } from '../lib/campaigns.mjs';
import snapshot from '../src/data/campaigns.json' with { type: 'json' };

const known = new Map(snapshot.map((c) => [c.id, c.url]));

export async function handler(req, res) {
  try {
    const campaigns = await fetchEmagCampaigns(psRequest, known);
    for (const c of campaigns) known.set(c.id, c.url); // warm instances skip the Links API next time
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    return res.status(200).json(campaigns);
  } catch (e) {
    console.error('campaigns error:', e);
    // the strip keeps its build-time snapshot on any non-200
    return res.status(502).json({ error: 'upstream' });
  }
}

export default handler;
