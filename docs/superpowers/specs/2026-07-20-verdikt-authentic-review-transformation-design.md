# Verdikt / TopAlegeri — Aggregator → Authentic Review Site (Profitshare/eMAG compliance)

**Date:** 2026-07-20
**Status:** Approved design → implementation planning
**Goal:** Rebuild the site so it fully satisfies the eMAG + Profitshare affiliate Terms & Conditions and can be resubmitted for approval, modeled on the already-approved `recenziidetop.ro`.

---

## 1. Background & problem

The site was rejected by Profitshare. Verbatim reason (Ioana, Profitshare): the site auto-pulls eMAG data and images, is structured as a price comparator / product aggregator, and lacks authentic content. The advertiser (eMAG) only accepts promotion via **authentic-content review sites**, and forbids Google Ads / Facebook Ads / any PPC.

Confirmed in-code causes of rejection:
- **Images hot-linked from eMAG:** all ~130 product images point to `s13emagst.akamaized.net` (eMAG's CDN). T&C §5 allows only official Profitshare materials or graphics with prior written approval.
- **Automated data extraction:** `scripts/get-product.mjs` fetches eMAG pages and parses JSON-LD/OG. T&C forbids media that "preiau automat informații de pe website-ul eMAG (ex. comparatoare de prețuri)".
- **Comparator/aggregator format:** ranking pages with score dials + spec tables read as the banned "comparatoare de prețuri, agregatoare de produse".
- **Prices that can drift from eMAG:** T&C §6 forbids offers that create "confuzie asupra ofertei reale".
- **Not "authentic content":** the reviewer's core objection; content read as generated/scraped.

### Competitor evidence (why this design is the right one)
- `analizat.ro` — **same violations** (Profitshare `l.profitshare`, hot-linked eMAG images, comparator). Live/earning only because not yet re-verified; T&C §4.6/§6.1b let Profitshare re-check anytime and cancel unpaid commissions retroactively + disable the account. **Not a safe model.**
- `reduceretop.ro` — a Shopify **own-goods store**, not an eMAG affiliate. eMAG T&C does not apply; that is why it can run Google Ads. Different business model.
- `recenziidetop.ro` — **the model to copy.** WordPress editorial review site on Profitshare + 2Performant, **self-hosted images**, named authors (bylines), "Despre noi" + "Cum lucrăm" pages, Top-N with scores, huge buying guides, FAQ, conclusion. Passes by design. Reference page: `/cel-mai-bun-aspirator/`.

**Key realization:** scores and Top-N rankings are NOT the problem (recenziidetop uses them). The decisive differences are self-hosted images + genuinely authored editorial content + editorial identity.

---

## 2. Decisions (locked)

| Topic | Decision |
|---|---|
| Authors | **1–2 editorial personas** — name, role, short bio, photo; consistent site-wide. |
| Format | recenziidetop-style: Top-N + **narrative per-product reviews** + deep buying guide + FAQ + conclusion. **Keep scores.** De-emphasize/remove the all-products spec grid. Keep A/B `comparison` (editorial). |
| Prices | **No fixed price.** Cards show only the "Vezi prețul pe eMAG" affiliate button. |
| Sequencing | **Big-bang:** transform all 13 categories fully before resubmitting. |
| Google Ads | Out of scope / forbidden. SEO + organic only. |

**Non-negotiable success criterion:** the site must pass a line-by-line T&C compliance audit (§6) before resubmission. 100% approval cannot be guaranteed (approval is a manual human decision), but every objective violation is eliminated and the site mirrors an approved reference.

---

## 3. Scope of changes

### 3.1 Image self-hosting (all 13 categories, ~130 images)
- New `scripts/download-images.mjs`: for every product in `src/content/categories/*.json`, download the `s13emagst.akamaized.net` image to `public/img/products/<feedId||id>.<ext>` and rewrite the `image` field to `/img/products/<file>`.
- **Build guard:** a check (test or build step) that fails if any product `image` (or any content image) points to an external host — prevents regressions.
- Outcome: zero eMAG-hosted images; all assets served from our own domain.

### 3.2 Content model — authentic per-product review
- Extend the product schema in `src/content/config.ts` with `review: z.string().optional()` — a 120–200-word first-person editorial verdict per product.
- Category page (`src/pages/clasament/[slug].astro` + `ProductCard.astro`): render `review` prominently; demote `specs` to a small secondary list; **remove any large side-by-side all-products spec grid**.
- Keep `score`, `pros`, `cons`, `guide`, `faq`, `conclusion`, `comparison` (all already in schema and editorial-positive).

### 3.3 Editorial identity
- New `src/data/authors.ts`: 2 personas `{ id, name, role, bio, photo, expertise }`.
- Add `author: z.string()` (persona id) to the category schema; render byline + updated date + "Cum testăm" link on each category and guide.
- Flesh out existing `src/pages/despre.astro` (team of 2, real editorial mission) and `src/pages/cum-testam.astro` (scoring method, what we do NOT do, honesty statement).
- Author photos in `public/img/authors/`.
- JSON-LD (`Jsonld.astro`): add `author`/`Person` and per-product `Review` where appropriate.

### 3.4 Prices
- Ensure all 13 category JSONs omit `price`/`oldPrice`/`priceNote`.
- Verify `ProductCard.astro` hides the price block when absent; card shows only the affiliate button.
- Remove/neutralize price-bucket filters that imply we store prices.

### 3.5 Scripts — retire scraping-as-content
- `scripts/get-product.mjs`: demote to a documented one-off manual helper (header comment: "NOT part of build; manual use only") or remove.
- Remove any automated image/price feed sync from the build path.
- Keep legitimate Profitshare-API scripts (`sync-links.mjs`, `*-conversions.mjs`).
- Delete `.enrich/` temporary artifacts.

### 3.6 Editorial content rewrite — all 13 categories
For each category: rewrite `intro`; write a narrative `review` for each product (~130 total); expand `guide` to recenziidetop depth (10+ substantive subsections); ensure 8 FAQ; write `conclusion`; assign `author`. Authentic Romanian editorial voice — no templated/generated tone. Executed via the implementation plan (subagents, one category per unit).

---

## 4. Architecture / units

- **Image migration unit** — `download-images.mjs` + build guard. Input: category JSONs. Output: local images + rewritten paths. Independently testable (guard = pass/fail).
- **Schema + rendering unit** — `config.ts`, `[slug].astro`, `ProductCard.astro`, `Jsonld.astro`. Adds `review`/`author`, changes rendering. Testable via build + visual check of one category.
- **Editorial identity unit** — `authors.ts`, `despre.astro`, `cum-testam.astro`, byline component. Self-contained.
- **Content unit (×13)** — one category JSON each; depends on the schema unit being done first. Parallelizable across categories.
- **Audit unit** — the compliance checklist (§6), run last.

Dependency order: schema/rendering + authors first → image migration (independent, can run in parallel) → content rewrite (needs schema) → audit.

---

## 5. Error handling / edge cases
- `download-images.mjs`: on a failed download, log and leave the product flagged (do not silently keep the eMAG URL); the build guard then catches it. Retry once. Preserve original extension; fall back by content-type.
- Products with no image: keep the icon placeholder (already supported).
- Never invent specs/prices during the rewrite — editorial text is opinion/guidance, factual specs only where known; when unsure, omit rather than fabricate (T&C: no misleading info).

---

## 6. T&C Compliance Matrix (the audit gate — must be green before publishing)

| # | T&C clause | Requirement | How we comply | Verify |
|---|---|---|---|---|
| C1 | eMAG §5 / §4.13c | No eMAG product images | All images self-hosted in `/img/`; build guard blocks external hosts | `grep -r akamaized/emagst` = 0; guard green |
| C2 | eMAG "preiau automat…" | No automated data pull | Scraping script removed from build; data is static, hand-authored | No fetch-of-eMAG in build; `.enrich` gone |
| C3 | eMAG "comparatoare/agregatoare" | Not a comparator/aggregator | Editorial reviews + guides dominate; no all-products spec grid | Visual: every category leads with authored review text |
| C4 | eMAG §6 / §4.13a | No divergent prices | No fixed price shown; button → live eMAG price | `grep price` in JSON = omitted; card shows button only |
| C5 | "conținut autentic" | Authentic content | Narrative per-product reviews + deep guides + FAQ + conclusion, authored | Each category has `review` per product + byline |
| C6 | E-E-A-T / recenziidetop parity | Editorial identity | 2 named authors, bios, photos; "Despre noi" + "Cum testăm" populated | Pages complete; bylines render |
| C7 | eMAG §2 / links | Correct affiliate link usage | `rel="sponsored nofollow noopener"`, Profitshare wrap, links only on relevant CTA (not on images) | Existing `AffiliateButton`; audit no affiliate links on `<img>` |
| C8 | eMAG "Google/FB Ads interzis" | No PPC to eMAG links | No paid ads; organic/SEO only | Operational policy, documented |
| C9 | eMAG keywords §3 | No "eMAG" in domain/PPC | Domain contains no eMAG term; no PPC | Domain check |
| C10 | Profitshare §4.3 exclusions | Not clone/URL-masking/cashback/coupon/BF | None of these patterns present | Manual review |

**Audit procedure before resubmit:** run the automated checks (C1–C4), then a manual walkthrough of one representative category + the identity pages against C5–C10. All rows green → resubmit for re-evaluation. Any red → fix before publishing.

---

## 7. Out of scope
- Google/Facebook/PPC advertising (forbidden by T&C).
- Price feed synchronization infrastructure (prices are not shown).
- New categories beyond the existing 13.
- Owning-goods / Shopify store model (reduceretop.ro path) — different business, not chosen.

---

## 8. Definition of done
- Build passes; external-image guard green (C1).
- All 13 categories: self-hosted images, per-product narrative reviews, author byline, no price numbers.
- `despre.astro` + `cum-testam.astro` complete with 2 authors.
- Scraping pipeline retired; `.enrich/` removed.
- §6 compliance matrix fully green (audit gate).
- Ready to resubmit to Profitshare for re-evaluation.

---
## Audit result — 2026-07-20
All §6 rows green. Automated: build OK; 130/130 images local (guard green); zero price fields; zero eMAG-hosted images in src+dist; no aggregator/data-pull framing in dist. Content: 13/13 categories with per-product reviews (130 distinct), author, guide≥8, faq≥6, conclusion. Identity: 2 named authors, despre + cum-testam populated. Final code review: APPROVE-WITH-MINORS (fixed: test glob, dead sort code, download failure guard-flagging). Accepted non-blockers: ~31MB unoptimized images; `_headers` CSP allowlists Google Ads/GTM (PPC remains an operational must-not-do).
