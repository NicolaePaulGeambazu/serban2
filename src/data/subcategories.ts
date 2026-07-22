// Sub-ranking segments per category — the single source of truth used by:
//  - src/pages/clasament/[cat]/[seg].astro (generates the segment pages)
//  - src/pages/clasament/[slug].astro (segment chips on the category page)
//  - src/pages/index.astro (segment cards in each homepage category row)
//
// A category can be segmented by brand (Bosch/Dyson/…) or by a spec value
// (12.000 BTU, 20.000 mAh, 9 kg, 60 cm, …). A segment only becomes a page/card
// when at least one product matches it, so empty segments are skipped.

type Product = { name: string; specs?: { value: string; label: string }[] };

// Normalise: lowercase, strip diacritics and separators so "24.000 mAh" and
// "12000 BTU" match cleanly by substring.
export function norm(s: string): string {
  return s
    .toLowerCase()
    .replace(/ă|â/g, 'a').replace(/î/g, 'i').replace(/ș|ş/g, 's').replace(/ț|ţ/g, 't')
    .replace(/[\s.,\-\/]/g, '');
}
function hay(p: Product): string {
  return norm(p.name + ' ' + (p.specs || []).map((s) => `${s.value} ${s.label}`).join(' '));
}

export type SegmentDef = { slug: string; label: string; keywords: string[] };
export type CategoryConfig = { kind: 'brand' | 'spec'; navLabel: string; segments: SegmentDef[] };

export const CATEGORY_SEGMENTS: Record<string, CategoryConfig> = {
  'aspiratoare-verticale': {
    kind: 'brand', navLabel: 'Pe brand',
    segments: [
      { slug: 'bosch', label: 'Bosch', keywords: ['bosch'] },
      { slug: 'dyson', label: 'Dyson', keywords: ['dyson'] },
      { slug: 'philips', label: 'Philips', keywords: ['philips'] },
    ],
  },
  'aer-conditionat': {
    kind: 'spec', navLabel: 'Pe putere',
    segments: [
      { slug: '9000-btu', label: '9.000 BTU', keywords: ['9000btu'] },
      { slug: '12000-btu', label: '12.000 BTU', keywords: ['12000btu'] },
      { slug: '18000-btu', label: '18.000 BTU', keywords: ['18000btu'] },
    ],
  },
  'baterii-externe': {
    kind: 'spec', navLabel: 'Pe capacitate',
    segments: [
      { slug: '10000-mah', label: '10.000 mAh', keywords: ['10000mah'] },
      { slug: '20000-mah', label: '20.000 mAh', keywords: ['20000mah'] },
      { slug: '25000-mah', label: '24–25.000 mAh', keywords: ['24000mah', '25000mah'] },
    ],
  },
  'uscatoare': {
    kind: 'spec', navLabel: 'Pe capacitate',
    segments: [
      { slug: '7-kg', label: '7 kg', keywords: ['7kg'] },
      { slug: '8-kg', label: '8 kg', keywords: ['8kg'] },
      { slug: '9-kg', label: '9 kg', keywords: ['9kg'] },
    ],
  },
  'masini-de-spalat': {
    kind: 'spec', navLabel: 'Pe capacitate',
    segments: [
      { slug: '8-kg', label: '8 kg', keywords: ['8kg'] },
      { slug: '9-kg', label: '9 kg', keywords: ['9kg'] },
      { slug: '10-11-kg', label: '10–11 kg', keywords: ['10kg', '11kg'] },
    ],
  },
  'masini-spalat-vase': {
    kind: 'spec', navLabel: 'Pe lățime',
    segments: [
      { slug: '60-cm', label: '60 cm', keywords: ['60cm'] },
      { slug: '45-cm', label: '45 cm', keywords: ['45cm'] },
    ],
  },
  'frigidere': {
    kind: 'spec', navLabel: 'Pe tip',
    segments: [
      { slug: 'combina', label: 'Combină', keywords: ['combinafrigorific'] },
      { slug: 'incorporabile', label: 'Încorporabile', keywords: ['incorporabila'] },
      { slug: 'side-by-side', label: 'Side-by-side', keywords: ['sidebyside'] },
    ],
  },
  'dezumidificatoare': {
    kind: 'spec', navLabel: 'Pe capacitate',
    segments: [
      { slug: 'pana-14l', label: 'până la 14 L/24h', keywords: ['10l24h', '12l24h', '13l24h', '14l24h'] },
      { slug: '20-25l', label: '20–25 L/24h', keywords: ['20l24h', '22l24h', '25l24h'] },
    ],
  },
};

export function productMatchesSegment(p: Product, seg: SegmentDef): boolean {
  const h = hay(p);
  return seg.keywords.some((k) => h.includes(norm(k)));
}

/** Segments for a category that actually have ≥1 product, with the match count. */
export function segmentsWithProducts(catId: string, products: Product[]): (SegmentDef & { count: number })[] {
  const cfg = CATEGORY_SEGMENTS[catId];
  if (!cfg) return [];
  return cfg.segments
    .map((s) => ({ ...s, count: products.filter((p) => productMatchesSegment(p, s)).length }))
    .filter((s) => s.count > 0);
}
