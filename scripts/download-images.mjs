import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

export function localFilename(p) {
  const base = (p.feedId || p.id || 'img').toLowerCase().replace(/[^a-z0-9]+/g, '');
  const m = String(p.image || '').split('?')[0].match(/\.(jpg|jpeg|png|webp|avif)$/i);
  const ext = m ? m[1].toLowerCase() : 'jpg';
  return `${base}.${ext}`;
}

function cleanUrl(u) {
  return String(u).replace(/&amp;/g, '&').replace(/&#0?38;/g, '&').trim();
}

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/126 Safari/537.36';

async function run() {
  const dir = 'src/content/categories';
  const outDir = 'public/img/products';
  mkdirSync(outDir, { recursive: true });
  let okCount = 0, failCount = 0;
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.json'))) {
    const path = join(dir, file);
    const data = JSON.parse(readFileSync(path, 'utf8'));
    let changed = false;
    for (const p of data.products ?? []) {
      if (!p.image || p.image.startsWith('/')) continue;
      const name = localFilename(p);
      const dest = join(outDir, name);
      const url = cleanUrl(p.image);
      let ok = false;
      for (let attempt = 0; attempt < 3 && !ok; attempt++) {
        try {
          const res = await fetch(url, { headers: { 'User-Agent': UA } });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const buf = Buffer.from(await res.arrayBuffer());
          if (buf.length < 500) throw new Error(`too small (${buf.length}b)`);
          writeFileSync(dest, buf);
          ok = true;
        } catch (e) { console.error(`retry ${file}#${p.id}: ${e.message}`); }
      }
      if (!ok) { console.error(`✗ FAILED ${file}#${p.id} — leaving external URL so the guard flags it`); failCount++; }
      else { p.image = `/img/products/${name}`; console.log(`✓ ${file}#${p.id} → ${p.image}`); okCount++; }
      changed = true;
    }
    if (changed) writeFileSync(path, JSON.stringify(data, null, 2) + '\n');
  }
  console.log(`\nDONE: ${okCount} ok, ${failCount} failed`);
  if (failCount) process.exitCode = 1;
}
if (import.meta.url === `file://${process.argv[1]}`) run();
