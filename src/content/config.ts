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
  features: z.array(z.string()).default([]), // e.g. ["mop","autogolire","silentios"]
  specs: z.array(z.object({ value: z.string(), label: z.string() })).default([]),
  scores: z.array(z.object({ label: z.string(), pct: z.number() })).default([]),
  pros: z.array(z.string()).default([]),
  cons: z.array(z.string()).default([]),
  emagUrl: z.string(),             // real product URL on eMAG (wrapped in affiliate deeplink at build)
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
    priceBuckets: z.array(z.object({ key: z.string(), label: z.string() })).default([]),
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

export const collections = { categories, guides };
