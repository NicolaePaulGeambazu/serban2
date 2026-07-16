# Verdikt

A fast, SEO-first **product-comparison affiliate site** for the Romanian market (eMAG), built with [Astro](https://astro.build). Static output, zero JavaScript by default, content-driven — everything you edit day-to-day lives in simple data files.

> The demo brand, copy, products and prices are **fictional**. Replace them with your own before launch.

---

## Quick start

```bash
npm install      # a local .npmrc pins the public npm registry
npm run dev      # http://localhost:4321  (live reload)
npm run build    # static site into ./dist
npm run preview  # serve the built ./dist locally
```

Node 18+ required.

---

## The two files you'll touch most

### 1. Products, prices & rankings → `src/content/categories/*.json`

**One JSON file = one ranking page** at `/clasament/<filename>/`. To edit a product, change its fields. To add a product, copy a block in the `products` array and give it a new `id`. To add a whole new category, copy `templates/category-template.json` into `src/content/categories/my-category.json` — a new page appears automatically, no code changes.

Key product fields:

| Field | What it does |
|-------|--------------|
| `id` | Unique on the page; used for the anchor (`#p1`) |
| `rank` | Position in the list |
| `name`, `tag` | Product name + the little label ("Cea mai bună alegere") |
| `win` | `true` on the winner → gold border + award seal |
| `score` | 0–10, drives the dial |
| `price`, `oldPrice`, `priceNote` | Price block (lei) |
| `image` | Product photo URL (leave `""` to show a placeholder icon) |
| `features` | Tags used by the on-page filters |
| `specs`, `scores`, `pros`, `cons` | Card content |
| `emagUrl` | The **real eMAG product URL** — wrapped in your affiliate link automatically |

### 2. Affiliate links → `src/data/affiliate.ts`

Set your network once and every "Vezi prețul pe eMAG" button uses it — no per-link editing.

```ts
export const AFFILIATE = {
  network: 'profitshare',                                 // or '2performant'
  profitshareBase: 'https://l.profitshare.ro/l/YOUR_ID?url=',
  twoPBase: 'https://event.2performant.com/events/click?...&redirect_to=',
};
```

Until you paste a real base, buttons link straight to eMAG (so dev works). Links are built **at build time**, already carry `rel="sponsored nofollow noopener"` and open in a new tab.

---

## Other things you can customize

| What | Where |
|------|-------|
| Site name, tagline, domain, email, stats | `src/data/site.ts` |
| Domain for canonical/sitemap/OG | `SITE` in `astro.config.mjs` **and** `site.url` |
| Header / footer menus | `src/data/navigation.ts` |
| eMAG campaign banner calendar | `src/data/campaigns.ts` |
| Buying-guide articles | `src/content/guides/*.md` (Markdown) |
| Colors, fonts, spacing | CSS variables at the top of `src/styles/global.css` |
| Category icons | add an SVG to `src/components/Icon.astro`, use its name in the category `icon` field |
| Legal text | `src/pages/legal/*.astro` (fill the `[placeholders]`) |

---

## Deploy (free tiers work)

The site is fully static. Point any host at:

- **Build command:** `npm run build`
- **Output directory:** `dist`

Recommended: **Cloudflare Pages**, **Netlify**, or **Vercel**. On the first deploy, set your real domain, then update `SITE` in `astro.config.mjs` and `site.url` in `src/data/site.ts` so canonicals, the sitemap and OG tags are correct.

Also: submit `https://your-domain/sitemap.xml` in Google Search Console.

---

## Keeping prices fresh (the honest version)

Prices in the JSON are **starting values**. The card copy says "preț orientativ — cel exact e pe eMAG", and the button always sends the user to the live eMAG price, so nothing is ever a lie even if a number is a few days old.

When you want real automation, two paths:

1. **Affiliate product feed** — Profitshare/2Performant provide product feeds (CSV/XML) with current prices. A small scheduled script can read the feed and rewrite the `price`/`oldPrice` fields in the category JSON, then trigger a rebuild. This is the clean, ToS-friendly route.
2. **Rebuild on a schedule** — host a cron (GitHub Actions, Cloudflare Cron) that runs the update script + `npm run build` nightly.

Until then, avoid promising things you can't keep automatically (e.g. "we'll email you when the price drops") — that needs path #1 first.

---

## What's already built for SEO & affiliate

- **SEO:** unique `<title>`/meta per page, canonical URLs, Open Graph + Twitter tags, `robots.txt`, `sitemap.xml`, and JSON-LD structured data (`Organization`, `WebSite`, `BreadcrumbList`, `ItemList`+`Product`+`Offer` on rankings, `FAQPage`, `Article` on guides). Semantic headings, one `<h1>` per page.
- **Speed / Core Web Vitals:** static HTML, CSS inlined, ~0 JS on most pages, hover-prefetch, lazy images. This directly helps rankings.
- **Affiliate best practice:** central config, `rel="sponsored nofollow noopener"`, a visible affiliate-disclosure line on every ranking, a full `/legal/afiliere/` page, and consent-gated tracking.
- **Trust / E-E-A-T:** a real methodology page, scoring weights, author attribution, honest pros/cons and "what we don't do" — the signals Google rewards for commercial content.
- **Conversion:** quick-pick cards up top, winner seal, sticky mobile "see price" bar, clear CTAs, comparison filters/sort.
- **Consent:** custom, self-hosted cookie manager (no paid CMP), with per-category toggles and hooks to load analytics/affiliate tags only after consent.

## Before you launch — checklist

- [ ] Replace demo products/prices with real ones (`src/content/categories/`)
- [ ] Set your affiliate base (`src/data/affiliate.ts`)
- [ ] Set brand + domain (`src/data/site.ts`, `astro.config.mjs`)
- [ ] Fill legal `[placeholders]` (company name, address, DPO email, dates)
- [ ] Add a default social share image and set `ogImage` (see note below)
- [ ] Wire real analytics inside the consent `apply()` hook (`src/components/CookieConsent.astro`)
- [ ] Submit the sitemap in Google Search Console

> **OG image:** social shares currently use text-only cards. Add a 1200×630 PNG to `public/` and pass `ogImage="/og.png"` from a page (or set a default in `Base.astro`) for richer link previews.

---

## Project structure

```
src/
  content/
    categories/      product rankings (one JSON per page)  ← edit here
    guides/          buying-guide articles (Markdown)
    config.ts        data schema (validated at build)
  data/              site, affiliate, campaigns, navigation config
  components/        Header, Footer, ProductCard, CookieConsent, ...
  layouts/Base.astro page shell + SEO
  pages/             routes (home, /clasament/[slug], /ghiduri, legal, ...)
  styles/global.css  design system (all the CSS)
templates/           copy-paste category template
public/              robots.txt, favicon
```
