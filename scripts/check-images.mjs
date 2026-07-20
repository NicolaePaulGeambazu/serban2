import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export function isLocalImage(src) {
  if (!src) return true;
  if (src.startsWith('/') && !src.startsWith('//')) return true;
  return false;
}

export function findExternalImages(dir) {
  const bad = [];
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.json'))) {
    const data = JSON.parse(readFileSync(join(dir, file), 'utf8'));
    for (const p of data.products ?? []) {
      if (!isLocalImage(p.image ?? '')) bad.push({ file, id: p.id, image: p.image });
    }
  }
  return bad;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const dir = 'src/content/categories';
  const bad = findExternalImages(dir);
  if (bad.length) {
    console.error(`✗ ${bad.length} external image(s) found:`);
    for (const b of bad) console.error(`  ${b.file} #${b.id} → ${b.image}`);
    process.exit(1);
  }
  console.log('✓ all product images are local');
}
