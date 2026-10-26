#!/usr/bin/env node
/**
 * sync-campaigns.mjs — snapshot eMAG's current campaigns (with tracked affiliate
 * links) to src/data/campaigns.json. The campaign strip renders this at build
 * time and then refreshes live from /api/campaigns, which also reuses these links.
 *
 *   PROFITSHARE_API_USER=... PROFITSHARE_API_KEY=... node scripts/sync-campaigns.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { psRequest } from './ps-api.mjs';
import { fetchEmagCampaigns } from '../lib/campaigns.mjs';

const FILE = path.join(process.cwd(), 'src/data/campaigns.json');
const old = fs.existsSync(FILE) ? JSON.parse(fs.readFileSync(FILE, 'utf8')) : [];

const campaigns = await fetchEmagCampaigns(psRequest, new Map(old.map((c) => [c.id, c.url])));
fs.writeFileSync(FILE, JSON.stringify(campaigns, null, 2) + '\n');
console.log(`Done — ${campaigns.length} eMAG campaign(s):`, campaigns.map((c) => `${c.name} ${c.start}..${c.end}`).join('; '));
