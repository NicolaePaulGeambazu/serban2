import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fetchEmagCampaigns } from './campaigns.mjs';

const camp = (id, advertiser_id, name, start) => ({
  id, advertiser_id, name, startDate: `${start} 07:00:00`, endDate: `${start} 23:59:00`, url: `https://www.emag.ro/c/${id}`,
});

test('keeps only eMAG, walks pages, reuses known links, creates the rest, sorts by start', async () => {
  const pages = {
    'page=1': [camp(2, 35, 'Black Friday, 6 noiembrie', '2026-11-06'), camp(9, 124829, 'Mathaus', '2026-06-05')],
    'page=2': [camp(1, 35, 'Crazy Days, 23 octombrie - 1 noiembrie', '2026-10-23')],
  };
  const posts = [];
  const ps = async (verb, path, qs, body) => {
    if (verb === 'POST') { posts.push(body); return { status: 200, json: { result: [{ ps_url: 'https://l.profitshare.ro/l/new' }] } }; }
    return { status: 200, json: { result: { paginator: { totalPages: 2 }, campaigns: pages[qs] } } };
  };
  const out = await fetchEmagCampaigns(ps, new Map([[1, 'https://l.profitshare.ro/l/known']]));
  assert.deepEqual(out, [
    { id: 1, name: 'Crazy Days', start: '2026-10-23', end: '2026-10-23', url: 'https://l.profitshare.ro/l/known' },
    { id: 2, name: 'Black Friday', start: '2026-11-06', end: '2026-11-06', url: 'https://l.profitshare.ro/l/new' },
  ]);
  assert.equal(posts.length, 1);
});

test('throws on API failure so callers keep their fallback', async () => {
  await assert.rejects(fetchEmagCampaigns(async () => ({ status: 0, json: null, text: 'Missing' })));
});
