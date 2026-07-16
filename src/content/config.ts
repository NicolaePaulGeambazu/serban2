import { defineCollection, z } from 'astro:content';

const product = z.object({
  id: z.string(),
  rank: z.number(),
  name: z.string(),
  tag: z.string(),
  win: z.boolean().optional(),
  score: z.number(),               // 0–10
  price: z.number(),               // lei
  oldPrice: z.number().optional(),
  priceNote: z.string().optional(),
  image: z.string().optional(),    // product photo URL (falls back to an icon if empty)
  feedId: z.string().optional(),   // eMAG product id — used by scripts/sync-products.mjs to auto-update price/image/stock
  inStock: z.boolean().optional(), // updated by the feed sync (true/false)
  features: z.array(z.string()).default([]), // e.g. ["mop","autogolire","silentios"]
  specs: z.array(z.object({ value: z.string(), label: z.string() })).default([]),
  scores: z.array(z.object({ label: z.string(), pct: z.number() })).default([]),
  pros: z.array(z.string()).default([]),
  cons: z.array(z.string()).default([]),
  emagUrl: z.string(),             // real product URL on eMAG
  affiliateUrl: z.string().optional(), // tracked Profitshare link, filled by scripts/sync-links.mjs
});

const categories = defineCollection({
  type: 'data',
  schema: z.object({
    title: z.string(),             // <title> / card title
    h1: z.string(),
    parent: z.string(),            // breadcrumb parent label, e.g. "Electrocasnice"
    icon: z.string().default('circle'),
    order: z.number().default(100),
    intro: z.string(),
    updated: z.string(),           // ISO date
    productsCount: z.number(),
    reviewsRead: z.number(),
    quickPicks: z.array(z.object({ label: z.string(), productId: z.string(), win: z.boolean().optional() })).default([]),
    priceBuckets: z.array(z.object({ key: z.string(), label: z.string(), min: z.number().optional(), max: z.number().optional() })).default([]),
    featureFilters: z.array(z.object({ key: z.string(), label: z.string() })).default([]),
    guide: z.array(z.object({ h3: z.string(), body: z.string(), callout: z.string().optional() })).default([]),
    faq: z.array(z.object({ q: z.string(), a: z.string() })).default([]),
    conclusion: z.string(),
    products: z.array(product),
  }),
});

const guides = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    kicker: z.string(),            // category label shown on card
    updated: z.string(),           // ISO date
    order: z.number().default(100),
  }),
});

const comparisons = defineCollection({
  type: 'data',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    updated: z.string(),
    order: z.number().default(100),
    category: z.string(), // category id (json filename) the two products live in
    a: z.string(),        // product id
    b: z.string(),        // product id
    intro: z.string(),
    verdictA: z.string(), // when to pick A
    verdictB: z.string(), // when to pick B
    faq: z.array(z.object({ q: z.string(), a: z.string() })).default([]),
  }),
});

export const collections = { categories, guides, comparisons };
