/**
 * eMAG campaigns from the Profitshare campaigns API, with tracked affiliate
 * links. Shared by scripts/sync-campaigns.mjs (daily snapshot) and
 * api/campaigns.js (live). `psRequest` is injected so this is unit-testable.
 */
export const EMAG = 35; // Profitshare advertiser id

/**
 * @param psRequest  signed Profitshare client (scripts/ps-api.mjs)
 * @param knownUrls  Map<campaignId, trackedUrl> — reused so we only create links for new campaigns
 * @returns sorted [{ id, name, start, end, url }]; throws on API failure
 */
export async function fetchEmagCampaigns(psRequest, knownUrls = new Map()) {
  const feed = [];
  for (let page = 1, pages = 1; page <= pages; page++) {
    const r = await psRequest('GET', 'affiliate-campaigns', `page=${page}`);
    if (r.status !== 200 || !r.json?.result) throw new Error(`campaigns page ${page}: HTTP ${r.status} ${r.text?.slice(0, 200)}`);
    pages = r.json.result.paginator.totalPages;
    feed.push(...r.json.result.campaigns.filter((c) => c.advertiser_id === EMAG));
  }

  const campaigns = [];
  for (const c of feed) {
    let url = knownUrls.get(c.id);
    if (!url) {
      const body = `0[name]=${encodeURIComponent(c.name.slice(0, 60))}&0[url]=${encodeURIComponent(c.url)}`;
      const r = await psRequest('POST', 'affiliate-links/', '', body);
      url = r.json?.result?.[0]?.ps_url;
      if (!url) throw new Error(`no link for "${c.name}": HTTP ${r.status} ${r.text?.slice(0, 200)}`);
    }
    campaigns.push({
      id: c.id,
      name: c.name.split(',')[0].trim(), // "Crazy Days, 23 octombrie - 1 noiembrie" -> "Crazy Days"
      start: c.startDate.slice(0, 10),
      end: c.endDate.slice(0, 10),
      url,
    });
  }
  return campaigns.sort((a, b) => a.start.localeCompare(b.start));
}
