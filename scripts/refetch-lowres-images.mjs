#!/usr/bin/env node
// MANUAL ONE-OFF HELPER — NOT part of the build. Re-fetches product images that
// were downloaded before the resize-strip fix (c3b620d) and are stuck at a small
// resolution (typically 450px). For each product whose local image is narrower
// than MIN_WIDTH, it re-reads the eMAG page, grabs the full-res `res_` original,
// and overwrites the local file — but ONLY if the new image is strictly wider,
// so we never downgrade a good asset.
//
// Usage:
//   node scripts/refetch-lowres-images.mjs [--min 800] [--dry]
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';

const args = process.argv.slice(2);
const DRY = args.includes('--dry');
const minIdx = args.indexOf('--min');
const MIN_WIDTH = minIdx >= 0 ? Number(args[minIdx + 1]) : 800;

// eMAG serves a captcha stub to plain server UAs, so we pose as real browsers.
// Rotate the UA (and matching client-hint headers) each request so the WAF sees
// a varied fingerprint rather than one hammering client.
const BROWSERS = [
  {
    ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    hints: {},
  },
  {
    ua: 'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36',
    hints: { 'sec-ch-ua': '"Chromium";v="126", "Google Chrome";v="126", "Not-A.Brand";v="99"', 'sec-ch-ua-mobile': '?1', 'sec-ch-ua-platform': '"Android"' },
  },
  {
    ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
    hints: { 'sec-ch-ua': '"Chromium";v="126", "Google Chrome";v="126", "Not-A.Brand";v="99"', 'sec-ch-ua-mobile': '?0', 'sec-ch-ua-platform': '"macOS"' },
  },
  {
    ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36 Edg/125.0.0.0',
    hints: { 'sec-ch-ua': '"Microsoft Edge";v="125", "Chromium";v="125", "Not.A/Brand";v="24"', 'sec-ch-ua-mobile': '?0', 'sec-ch-ua-platform': '"Windows"' },
  },
  {
    ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:127.0) Gecko/20100101 Firefox/127.0',
    hints: {},
  },
];
const REFERERS = ['https://www.google.com/', 'https://www.google.ro/', 'https://www.emag.ro/', 'https://www.bing.com/'];
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

function browserHeaders() {
  const b = pick(BROWSERS);
  return {
    'User-Agent': b.ua,
    'Accept-Language': 'ro-RO,ro;q=0.9,en;q=0.8',
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    Referer: pick(REFERERS),
    'Upgrade-Insecure-Requests': '1',
    ...b.hints,
  };
}

// eMAG is behind AWS WAF: rapid sequential fetches trip an IP-based captcha wall.
// Throttle every page load and back off hard when we hit the captcha stub.
const THROTTLE_MS = 4000;   // base gap between product page loads
const CAPTCHA_BACKOFF_MS = 90_000; // wait after hitting the WAF before retrying
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const jitter = (ms) => ms + Math.floor(Math.random() * ms * 0.5);

function decodeEntities(s) {
  return String(s || '')
    .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#0?39;/g, "'")
    .replace(/&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ').trim();
}

function findProductLd(html) {
  const blocks = [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  for (const b of blocks) {
    let data;
    try { data = JSON.parse(b[1].trim()); } catch { continue; }
    const arr = Array.isArray(data) ? data : (data['@graph'] || [data]);
    for (const node of arr) {
      const t = node && node['@type'];
      if (t === 'Product' || (Array.isArray(t) && t.includes('Product'))) return node;
    }
  }
  return null;
}

async function fullResImageUrl(pageUrl) {
  const res = await fetch(pageUrl, { headers: browserHeaders() });
  const html = await res.text();
  if (/<title>eMAG Captcha<\/title>/i.test(html) || /captcha-sdk\.awswaf\.com/.test(html)) {
    const err = new Error('WAF captcha');
    err.captcha = true;
    throw err;
  }
  const ld = findProductLd(html);
  const ogMatch = html.match(/<meta property=["']og:image["'] content=["']([^"']+)["']/i);
  let image = (Array.isArray(ld?.image) ? ld.image[0] : ld?.image)
    || (ogMatch ? decodeEntities(ogMatch[1]) : '');
  // Strip the resize query on akamaized URLs to get the full-res original.
  if (/akamaized\.net\/products\//.test(image)) image = image.split('?')[0];
  return image;
}

function widthOf(path) {
  try {
    const out = execFileSync('sips', ['-g', 'pixelWidth', path], { encoding: 'utf8' });
    return Number((out.match(/pixelWidth:\s*(\d+)/) || [])[1]) || 0;
  } catch { return 0; }
}

async function run() {
  const dir = 'src/content/categories';
  const outDir = 'public/img/products';
  let checked = 0, upgraded = 0, unchanged = 0, failed = 0;

  for (const file of readdirSync(dir).filter((f) => f.endsWith('.json'))) {
    for (const p of JSON.parse(readFileSync(join(dir, file), 'utf8')).products ?? []) {
      if (!p.image?.startsWith('/img/products/') || !p.emagUrl) continue;
      const dest = join('public', p.image);
      const curW = widthOf(dest);
      if (!curW || curW >= MIN_WIDTH) continue;
      checked++;

      // Up to 4 attempts: captcha → long backoff, other errors → short retry.
      let done = false;
      for (let attempt = 1; attempt <= 4 && !done; attempt++) {
        await sleep(jitter(THROTTLE_MS));
        try {
          const url = await fullResImageUrl(p.emagUrl);
          if (!url) throw new Error('no image URL found on page');
          const res = await fetch(url, { headers: browserHeaders() });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const buf = Buffer.from(await res.arrayBuffer());
          if (buf.length < 500) throw new Error(`too small (${buf.length}b)`);

          // Write to a temp path, measure, keep only if strictly wider.
          const tmp = join(outDir, `.refetch-tmp-${p.feedId || p.id}`);
          writeFileSync(tmp, buf);
          const newW = widthOf(tmp);
          if (newW > curW) {
            if (!DRY) writeFileSync(dest, buf);
            console.log(`✓ ${file}#${p.id}: ${curW}px → ${newW}px${DRY ? ' (dry)' : ''}`);
            upgraded++;
          } else {
            console.log(`· ${file}#${p.id}: ${curW}px, source only ${newW}px — kept`);
            unchanged++;
          }
          execFileSync('rm', ['-f', tmp]);
          done = true;
        } catch (e) {
          if (e.captcha) {
            console.error(`  … WAF captcha on ${p.id}, backing off ${CAPTCHA_BACKOFF_MS / 1000}s (attempt ${attempt}/4)`);
            await sleep(CAPTCHA_BACKOFF_MS);
          } else if (attempt === 4) {
            console.error(`✗ ${file}#${p.id} (${curW}px): ${e.message}`);
            failed++;
          }
        }
      }
    }
  }
  console.log(`\nDONE: ${checked} low-res checked · ${upgraded} upgraded · ${unchanged} already-max · ${failed} failed`);
  if (failed) process.exitCode = 1;
}

if (import.meta.url === `file://${process.argv[1]}`) run();
