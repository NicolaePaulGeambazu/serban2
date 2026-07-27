// Shared helpers for sourcing full-res eMAG product images WITHOUT hitting
// www.emag.ro (which is behind AWS WAF and blocks datacenter IPs). Instead we
// read the akamaized CDN image URLs out of Bing image search — Bing indexes each
// eMAG product's gallery and exposes the original media URL (murl) plus the
// source page URL (purl), so we match by the product's eMAG code. The akamaized
// CDN itself is NOT behind the WAF, so downloads work.
import { execFileSync } from 'node:child_process';
import { writeFileSync, readFileSync, rmSync } from 'node:fs';

const BING_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// One Bing image search; returns akamaized media URLs whose source page URL
// contains the eMAG product code (exact-product match).
async function bingSearch(query, code) {
  const q = encodeURIComponent(query);
  const res = await fetch(`https://www.bing.com/images/search?q=${q}&form=HDRSC2&first=1`, {
    headers: { 'User-Agent': BING_UA, 'Accept-Language': 'ro-RO,ro;q=0.9,en;q=0.8' },
  });
  const html = await res.text();
  const de = (s) => s.replace(/&quot;/g, '"').replace(/&amp;/g, '&');
  const out = [];
  const seen = new Set();
  for (const m of html.matchAll(/class="iusc"[^>]*\sm="([^"]+)"/g)) {
    let o;
    try { o = JSON.parse(de(m[1])); } catch { continue; }
    const purl = o.purl || '';
    const murl = (o.murl || '').split('?')[0]; // strip resize query → full-res original
    if (!/akamaized\.net\/products\//.test(murl)) continue;
    if (code && !new RegExp(code, 'i').test(purl)) continue;
    if (seen.has(murl)) continue;
    seen.add(murl);
    out.push(murl);
  }
  return out;
}

// Build progressively looser queries: eMAG titles are long and carry
// parentheticals / spec strings that can bury the exact product in Bing. Fall
// back to a trimmed name and finally the bare product code.
function queryVariants(name, code) {
  const noParen = String(name).replace(/\([^)]*\)/g, ' ').replace(/\s+/g, ' ').trim();
  const short = noParen.split(/[,–-]/)[0].split(' ').slice(0, 7).join(' ').trim();
  const qs = [`${name} emag`, `${noParen} emag`, `${short} emag`];
  if (code) qs.push(`${code} emag`, `${short} ${code}`);
  return [...new Set(qs.map((s) => s.trim()).filter(Boolean))];
}

// DuckDuckGo image search fallback — different index coverage than Bing, same
// idea: keep akamaized results whose source page URL carries the eMAG code.
async function ddgSearch(query, code) {
  const tok = await (await fetch(`https://duckduckgo.com/?q=${encodeURIComponent(query)}`, {
    headers: { 'User-Agent': BING_UA },
  })).text();
  const vqd = (tok.match(/vqd=["']?([0-9-]+)["']?/) || [])[1];
  if (!vqd) return [];
  const j = await (await fetch(
    `https://duckduckgo.com/i.js?l=ro-ro&o=json&q=${encodeURIComponent(query)}&vqd=${vqd}`,
    { headers: { 'User-Agent': BING_UA, Referer: 'https://duckduckgo.com/' } },
  )).json();
  const out = [], seen = new Set();
  for (const r of j.results || []) {
    const murl = (r.image || '').split('?')[0];
    if (!/akamaized\.net\/products\//.test(murl)) continue;
    if (code && !new RegExp(code, 'i').test(r.url || '') && !new RegExp(code, 'i').test(murl)) continue;
    if (seen.has(murl)) continue;
    seen.add(murl);
    out.push(murl);
  }
  return out;
}

// Return akamaized candidate URLs for a product: try Bing query variants first,
// then DuckDuckGo, until one source yields code-matched results.
export async function bingCandidates(name, code) {
  for (const q of queryVariants(name, code)) {
    const hits = await bingSearch(q, code);
    if (hits.length) return hits;
    await sleep(700);
  }
  for (const q of queryVariants(name, code)) {
    try {
      const hits = await ddgSearch(q, code);
      if (hits.length) return hits;
    } catch { /* DDG hiccup — try next variant */ }
    await sleep(700);
  }
  return [];
}

export async function download(url) {
  const res = await fetch(url, { headers: { 'User-Agent': BING_UA } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 500) throw new Error(`too small (${buf.length}b)`);
  return buf;
}

// Intrinsic width via sips (returns 0 on failure).
export function widthOf(path) {
  try {
    const out = execFileSync('sips', ['-g', 'pixelWidth', path], { encoding: 'utf8' });
    return Number((out.match(/pixelWidth:\s*(\d+)/) || [])[1]) || 0;
  } catch { return 0; }
}

// Parse a 24-bit / 32-bit uncompressed BMP into {w,h,px:[r,g,b,...]}.
function parseBmp(buf) {
  const off = buf.readUInt32LE(10);
  const w = buf.readInt32LE(18);
  const h = Math.abs(buf.readInt32LE(22));
  const bpp = buf.readUInt16LE(28);
  const bytesPP = bpp / 8;
  const rowSize = Math.floor((bpp * w + 31) / 32) * 4; // rows padded to 4 bytes
  const px = [];
  for (let y = 0; y < h; y++) {
    const row = off + (h - 1 - y) * rowSize; // BMP rows are bottom-up
    for (let x = 0; x < w; x++) {
      const p = row + x * bytesPP;
      px.push(buf[p + 2], buf[p + 1], buf[p]); // BGR → RGB
    }
  }
  return { w, h, px };
}

// "Clean cutout" score in [0,1]: fraction of border pixels that are near-white.
// Product cutouts sit on white with white margins; lifestyle/collage shots don't.
export function cutoutScore(imgPath, scratch) {
  const bmp = `${scratch}.bmp`;
  try {
    execFileSync('sips', ['-s', 'format', 'bmp', '-Z', '32', imgPath, '--out', bmp], { stdio: 'ignore' });
    const { w, h, px } = parseBmp(readFileSync(bmp));
    const at = (x, y) => { const i = (y * w + x) * 3; return px[i] > 238 && px[i + 1] > 238 && px[i + 2] > 238; };
    let white = 0, total = 0;
    for (let x = 0; x < w; x++) { total += 2; if (at(x, 0)) white++; if (at(x, h - 1)) white++; }
    for (let y = 0; y < h; y++) { total += 2; if (at(0, y)) white++; if (at(w - 1, y)) white++; }
    return total ? white / total : 0;
  } catch { return 0; }
  finally { try { rmSync(bmp); } catch { /* ignore */ } }
}

// Re-encode `buf` to `destPath`, forcing it to the destination's existing
// extension (jpg/png) so we never change the referenced /img/products path.
export function saveAs(buf, destPath, scratchBase) {
  const ext = destPath.toLowerCase().endsWith('.png') ? 'png' : 'jpeg';
  const tmp = `${scratchBase}.src`;
  writeFileSync(tmp, buf);
  execFileSync('sips', ['-s', 'format', ext, tmp, '--out', destPath], { stdio: 'ignore' });
  try { rmSync(tmp); } catch { /* ignore */ }
}
