#!/usr/bin/env node
// MANUAL ONE-OFF HELPER — NOT part of the build.
//
// Upgrades low-res product images WITHOUT touching www.emag.ro (behind AWS WAF,
// blocks datacenter IPs). For each product whose local image is narrower than
// MIN_WIDTH it: (1) reads the akamaized CDN image URLs out of Bing image search,
// matched to the product's eMAG code; (2) downloads the full-res originals from
// the CDN (which is NOT WAF-protected); (3) scores each for "clean cutout on
// white" and picks the best; (4) overwrites the local file only if the new image
// is strictly wider — so we never downgrade or swap in a busy lifestyle shot.
//
// Usage:
//   node scripts/refetch-via-bing.mjs [--min 800] [--dry] [--max N]
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { bingCandidates, download, widthOf, cutoutScore, saveAs } from './lib-bing-image.mjs';

const args = process.argv.slice(2);
const DRY = args.includes('--dry');
const num = (flag, def) => { const i = args.indexOf(flag); return i >= 0 ? Number(args[i + 1]) : def; };
const MIN_WIDTH = num('--min', 800);   // treat images narrower than this as low-res
const MAX_CANDS = num('--max', 8);     // how many Bing candidates to fetch per product
const MIN_SCORE = 0.5;                 // require a reasonably clean-on-white image
const THROTTLE_MS = 1500;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const jitter = (ms) => ms + Math.floor(Math.random() * ms * 0.6);

async function bestFor(p, scratch) {
  const cands = await bingCandidates(p.name, p.feedId || p.id);
  const scored = [];
  for (const url of cands.slice(0, MAX_CANDS)) {
    try {
      const buf = await download(url);
      const tmp = `${scratch}.cand`;
      writeFileSync(tmp, buf);
      const w = widthOf(tmp);
      if (!w) continue;
      scored.push({ url, buf, w, score: cutoutScore(tmp, scratch) });
    } catch { /* skip bad candidate */ }
  }
  // Prefer clean cutouts, then the widest.
  scored.sort((a, b) => (b.score - a.score) || (b.w - a.w));
  return scored.find((c) => c.score >= MIN_SCORE) || null;
}

async function run() {
  const dir = 'src/content/categories';
  const scratchBase = process.env.SCRATCH || '/tmp/refetch-bing';
  let checked = 0, upgraded = 0, kept = 0, nohit = 0;

  for (const file of readdirSync(dir).filter((f) => f.endsWith('.json'))) {
    const path = join(dir, file);
    const data = JSON.parse(readFileSync(path, 'utf8'));
    // We only overwrite image files (same /img/products path), never product
    // data, so the category JSON is left untouched — no spurious reformat diff.
    for (const p of data.products ?? []) {
      if (!p.image?.startsWith('/img/products/')) continue;
      const dest = join('public', p.image);
      const curW = widthOf(dest);
      if (!curW || curW >= MIN_WIDTH) continue;
      checked++;
      await sleep(jitter(THROTTLE_MS));
      try {
        const best = await bestFor(p, `${scratchBase}-${p.feedId || p.id}`);
        if (!best) { console.log(`· ${file}#${p.id} (${curW}px): no clean Bing match — kept`); nohit++; continue; }
        if (best.w > curW) {
          if (!DRY) saveAs(best.buf, dest, `${scratchBase}-${p.feedId || p.id}`);
          console.log(`✓ ${file}#${p.id}: ${curW}px → ${best.w}px (score ${best.score.toFixed(2)})${DRY ? ' (dry)' : ''}`);
          upgraded++;
        } else {
          console.log(`· ${file}#${p.id} (${curW}px): best match only ${best.w}px — kept`);
          kept++;
        }
      } catch (e) {
        console.error(`✗ ${file}#${p.id} (${curW}px): ${e.message}`);
      }
    }
  }
  console.log(`\nDONE: ${checked} low-res · ${upgraded} upgraded · ${kept} already-max · ${nohit} no-match`);
}

if (import.meta.url === `file://${process.argv[1]}`) run();
