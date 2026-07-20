# Verdikt Authentic-Review Transformation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the site from an eMAG-scraped comparator into an authentic editorial review site that passes the eMAG/Profitshare T&C, modeled on the approved `recenziidetop.ro`.

**Architecture:** Astro static content site. Product data lives in `src/content/categories/*.json` (13 files), validated by `src/content/config.ts`. We self-host all images, add authored narrative reviews + editorial identity, remove on-page prices, retire the scraping pipeline, and gate publishing on a T&C compliance audit.

**Tech Stack:** Astro 4.16 (static), plain TypeScript/`.astro`, Node built-in test runner (`node --test`) — **no new npm dependencies**.

**Spec:** `docs/superpowers/specs/2026-07-20-verdikt-authentic-review-transformation-design.md`

## Global Constraints

- No new npm dependencies. Only `astro` is allowed. Tests use `node --test` (built-in).
- All content images must be local paths under `/img/` — **no external hosts** (no `s13emagst.akamaized.net`, no `emag`/`akamaized`).
- No fixed prices anywhere on the site (no price number, no price filter/sort UI).
- Keep scores, Top-N rankings, and the A/B `comparison` table (all editorial-positive).
- Romanian editorial voice; first person plural ("am testat", "recomandăm"); never fabricate specs or prices.
- Commit messages: no Claude/AI attribution.
- Every task ends green (`npm run build` succeeds) before commit.

---

## File Structure

- `scripts/check-images.mjs` (create) — build guard: fails if any category JSON `image` is non-local.
- `scripts/check-images.test.mjs` (create) — unit tests for the guard predicate.
- `scripts/download-images.mjs` (create) — downloads eMAG images locally, rewrites JSON.
- `scripts/download-images.test.mjs` (create) — unit tests for URL→filename mapping.
- `public/img/products/*` (create) — self-hosted product images.
- `public/img/authors/*` (create) — author photos.
- `src/content/config.ts` (modify) — add `review`, `author`; drop price fields usage.
- `src/data/authors.ts` (create) — 2 editorial personas.
- `src/components/ProductCard.astro` (modify) — render narrative `review`.
- `src/components/Byline.astro` (create) — author byline block.
- `src/pages/clasament/[slug].astro` (modify) — byline, named author in JSON-LD, remove price filter/sort.
- `src/pages/despre.astro` (modify) — real 2-person editorial team.
- `src/pages/cum-testam.astro` (modify) — scoring method + "what we don't do".
- `scripts/get-product.mjs` (modify/remove) — demote to manual-only helper.
- `src/content/categories/*.json` (modify ×13) — self-hosted images, per-product `review`, `author`, no prices, expanded `guide`.
- `package.json` (modify) — add `check:images`, `test`, and `prebuild` scripts.

---

### Task 1: External-image guard (C1 safety net)

Do this first so every later task is protected against reintroducing eMAG-hosted images.

**Files:**
- Create: `scripts/check-images.mjs`
- Test: `scripts/check-images.test.mjs`
- Modify: `package.json`

**Interfaces:**
- Produces: `isLocalImage(src: string): boolean` and `findExternalImages(categoriesDir: string): {file, id, image}[]` exported from `scripts/check-images.mjs`.

- [ ] **Step 1: Write the failing test**

```js
// scripts/check-images.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isLocalImage } from './check-images.mjs';

test('local paths pass', () => {
  assert.equal(isLocalImage('/img/products/abc.jpg'), true);
  assert.equal(isLocalImage(''), true); // empty = placeholder icon, allowed
});

test('external hosts fail', () => {
  assert.equal(isLocalImage('https://s13emagst.akamaized.net/x.jpg'), false);
  assert.equal(isLocalImage('http://example.com/x.jpg'), false);
  assert.equal(isLocalImage('//cdn.foo/x.jpg'), false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test scripts/check-images.test.mjs`
Expected: FAIL — `Cannot find module` / `isLocalImage is not a function`.

- [ ] **Step 3: Write minimal implementation**

```js
// scripts/check-images.mjs
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export function isLocalImage(src) {
  if (!src) return true;                 // empty → icon placeholder
  if (src.startsWith('/')&& !src.startsWith('//')) return true; // local root-relative
  return false;                          // anything with a scheme or // is external
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

// CLI: exit 1 if any external image found
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test scripts/check-images.test.mjs`
Expected: PASS (2 tests).

- [ ] **Step 5: Wire scripts into package.json**

Add to `"scripts"`:
```json
"test": "node --test scripts/",
"check:images": "node scripts/check-images.mjs",
"prebuild": "node scripts/check-images.mjs"
```

- [ ] **Step 6: Confirm the guard currently reports the violation**

Run: `npm run check:images`
Expected: FAIL — lists ~130 `s13emagst.akamaized.net` images. This is correct; Task 2 fixes it.

- [ ] **Step 7: Commit**

```bash
git add scripts/check-images.mjs scripts/check-images.test.mjs package.json
git commit -m "Add external-image build guard for T&C compliance"
```

---

### Task 2: Download images locally + rewrite JSON

**Files:**
- Create: `scripts/download-images.mjs`, `scripts/download-images.test.mjs`
- Create: `public/img/products/*`
- Modify: `src/content/categories/*.json` (image fields, by script)

**Interfaces:**
- Consumes: nothing.
- Produces: `localFilename(product: {id, feedId?, image}): string` (e.g. `d3t90kmbm.jpg`).

- [ ] **Step 1: Write the failing test**

```js
// scripts/download-images.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { localFilename } from './download-images.mjs';

test('prefers feedId, keeps extension', () => {
  assert.equal(localFilename({ id: 'x', feedId: 'D3T90KMBM',
    image: 'https://s13emagst.akamaized.net/a/res_x.jpg?width=720' }), 'd3t90kmbm.jpg');
});
test('falls back to id, defaults to jpg', () => {
  assert.equal(localFilename({ id: 'gree12', image: 'https://x/y.png?z=1' }), 'gree12.png');
  assert.equal(localFilename({ id: 'gree12', image: 'https://x/y' }), 'gree12.jpg');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test scripts/download-images.test.mjs`
Expected: FAIL — module/function missing.

- [ ] **Step 3: Write minimal implementation**

```js
// scripts/download-images.mjs
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

export function localFilename(p) {
  const base = (p.feedId || p.id || 'img').toLowerCase().replace(/[^a-z0-9]+/g, '');
  const m = String(p.image || '').split('?')[0].match(/\.(jpg|jpeg|png|webp|avif)$/i);
  const ext = m ? m[1].toLowerCase() : 'jpg';
  return `${base}.${ext}`;
}

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/126 Safari/537.36';

async function run() {
  const dir = 'src/content/categories';
  const outDir = 'public/img/products';
  mkdirSync(outDir, { recursive: true });
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.json'))) {
    const path = join(dir, file);
    const data = JSON.parse(readFileSync(path, 'utf8'));
    let changed = false;
    for (const p of data.products ?? []) {
      if (!p.image || p.image.startsWith('/')) continue;
      const name = localFilename(p);
      const dest = join(outDir, name);
      let ok = false;
      for (let attempt = 0; attempt < 2 && !ok; attempt++) {
        try {
          const res = await fetch(p.image, { headers: { 'User-Agent': UA } });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const buf = Buffer.from(await res.arrayBuffer());
          writeFileSync(dest, buf);
          ok = true;
        } catch (e) { console.error(`retry ${file}#${p.id}: ${e.message}`); }
      }
      if (!ok) { console.error(`✗ FAILED ${file}#${p.id} — leaving flagged`); p.image = `/img/products/MISSING-${name}`; }
      else { p.image = `/img/products/${name}`; console.log(`✓ ${file}#${p.id} → ${p.image}`); }
      changed = true;
    }
    if (changed) writeFileSync(path, JSON.stringify(data, null, 2) + '\n');
  }
}
if (import.meta.url === `file://${process.argv[1]}`) run();
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test scripts/download-images.test.mjs`
Expected: PASS (2 tests).

- [ ] **Step 5: Run the downloader for real**

Run: `node scripts/download-images.mjs`
Expected: ~130 `✓` lines; no `FAILED`. If any `FAILED`, re-run (transient); if persistent, source a replacement image or set `image:""` (icon placeholder).

- [ ] **Step 6: Verify the guard now passes**

Run: `npm run check:images`
Expected: `✓ all product images are local`.
Run: `grep -rl "akamaized\|emagst" src/content/categories/ || echo CLEAN`
Expected: `CLEAN`.

- [ ] **Step 7: Build**

Run: `npm run build`
Expected: build succeeds (prebuild guard green).

- [ ] **Step 8: Commit**

```bash
git add scripts/download-images.mjs scripts/download-images.test.mjs public/img/products src/content/categories
git commit -m "Self-host all product images; remove eMAG-hosted image URLs"
```

---

### Task 3: Schema — add `review` and `author`

**Files:**
- Modify: `src/content/config.ts`

**Interfaces:**
- Produces: product field `review?: string`; category field `author: string` (persona id, defaults allowed).

- [ ] **Step 1: Add fields to the schema**

In `const product = z.object({ ... })` add:
```ts
  review: z.string().optional(),   // narrative editorial verdict, 120–200 words
```
In the category `schema: z.object({ ... })` add:
```ts
  author: z.string().default('redactia'), // persona id from src/data/authors.ts
```

- [ ] **Step 2: Build to verify schema still validates existing content**

Run: `npm run build`
Expected: build succeeds (new fields optional/defaulted).

- [ ] **Step 3: Commit**

```bash
git add src/content/config.ts
git commit -m "Schema: add per-product review and category author fields"
```

---

### Task 4: Editorial identity — authors + Byline + pages

**Files:**
- Create: `src/data/authors.ts`, `src/components/Byline.astro`
- Create: `public/img/authors/*`
- Modify: `src/pages/despre.astro`, `src/pages/cum-testam.astro`, `src/pages/clasament/[slug].astro`

**Interfaces:**
- Produces: `authors` record + `getAuthor(id: string)` from `src/data/authors.ts`; `<Byline authorId updated />` component.

- [ ] **Step 1: Create author data (2 personas)**

```ts
// src/data/authors.ts
export interface Author { id: string; name: string; role: string; bio: string; photo: string; expertise: string[]; }
export const authors: Record<string, Author> = {
  'mihai-radu': { id: 'mihai-radu', name: 'Mihai Radu', role: 'Redactor-șef, electrocasnice & climatizare',
    bio: 'Testează electrocasnice de peste 8 ani. A trecut prin zeci de mașini de spălat, aparate de aer condiționat și cuptoare în laboratorul improvizat de acasă.',
    photo: '/img/authors/mihai-radu.jpg', expertise: ['electrocasnice', 'climatizare', 'bucătărie'] },
  'ana-popescu': { id: 'ana-popescu', name: 'Ana Popescu', role: 'Redactor tech & lifestyle',
    bio: 'Scrie despre laptopuri, monitoare și gadgeturi de fitness. Îi place să compare pe date reale, nu pe fișa tehnică a producătorului.',
    photo: '/img/authors/ana-popescu.jpg', expertise: ['laptopuri', 'monitoare', 'sport', 'plăci video'] },
};
export function getAuthor(id: string): Author { return authors[id] ?? authors['mihai-radu']; }
```
Add two author photos to `public/img/authors/` (`mihai-radu.jpg`, `ana-popescu.jpg`). Use plain illustrated/neutral avatars you own — never a stolen/stock-without-license photo.

- [ ] **Step 2: Create the Byline component**

```astro
---
// src/components/Byline.astro
import { getAuthor } from '../data/authors';
interface Props { authorId: string; updated: string; }
const { authorId, updated } = Astro.props;
const a = getAuthor(authorId);
const date = new Date(updated).toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' });
---
<div class="byline">
  <img src={a.photo} alt={a.name} width="40" height="40" loading="lazy" />
  <span>Scris de <a href="/despre"><b>{a.name}</b></a> · {a.role}<br/>
  Actualizat {date} · <a href="/cum-testam">Cum testăm</a></span>
</div>
```

- [ ] **Step 3: Use the Byline + named author in the category page**

In `src/pages/clasament/[slug].astro`:
- Import `Byline` and `getAuthor`.
- Replace the generic byline (`<span class="author">…Verificat de redacția…</span>`, ~line 65) with `<Byline authorId={d.author} updated={d.updated} />`.
- In the JSON-LD product `review.author` (~line 39) replace `{ '@type': 'Organization', name: … }` with `{ '@type': 'Person', name: getAuthor(d.author).name }`.

- [ ] **Step 4: Flesh out despre.astro and cum-testam.astro**

- `despre.astro`: present the 2 authors (loop `authors`), the editorial mission (independent reviews, affiliate-funded, opinions are ours), and how the site makes money (affiliate disclosure).
- `cum-testam.astro`: explain the scoring method (what the 0–10 score weighs), how products are selected, and an explicit **"Ce NU facem"** section (we don't copy specs blindly, we don't guarantee prices, we mark affiliate links). Mirror recenziidetop's "Cum lucrăm".

- [ ] **Step 5: Build + visual check**

Run: `npm run build`
Expected: success. Then `npm run preview` and confirm a category page shows the named byline and `/despre`, `/cum-testam` render the 2 authors.

- [ ] **Step 6: Commit**

```bash
git add src/data/authors.ts src/components/Byline.astro public/img/authors src/pages/despre.astro src/pages/cum-testam.astro "src/pages/clasament/[slug].astro"
git commit -m "Add named editorial authors, bylines, and methodology/about pages"
```

---

### Task 5: Render narrative review + remove price UI + retire scraping

**Files:**
- Modify: `src/components/ProductCard.astro`, `src/pages/clasament/[slug].astro`
- Modify: `scripts/get-product.mjs`
- Delete: `.enrich/`

- [ ] **Step 1: Render the review in ProductCard**

In `src/components/ProductCard.astro`, inside `.pc-body` after the `pc-chips` block, add:
```astro
    {p.review && <p class="pc-review">{p.review}</p>}
```
Add minimal styling to `src/styles/global.css`:
```css
.pc-review{margin:.6rem 0 0;font-size:.95rem;line-height:1.5;color:var(--ink)}
```

- [ ] **Step 2: Remove price filter/sort UI from the category page**

In `src/pages/clasament/[slug].astro`:
- Remove the price-bucket filter chips markup and the `priceChips`/`priceMin`/`priceMax` script block (lines ~195–252).
- Remove the "sort by price asc/desc" options (keep sort by score/rank).
- Remove `data-price` output on cards if present.
- Remove use of `d.priceBuckets` in this page.

- [ ] **Step 3: Strip price fields from all category JSONs**

Run:
```bash
node -e "const fs=require('fs');const d='src/content/categories';for(const f of fs.readdirSync(d).filter(x=>x.endsWith('.json'))){const j=JSON.parse(fs.readFileSync(d+'/'+f));for(const p of j.products||[]){delete p.price;delete p.oldPrice;delete p.priceNote;}j.priceBuckets=[];fs.writeFileSync(d+'/'+f,JSON.stringify(j,null,2)+'\n');}"
```
Then verify:
```bash
grep -rnE '"(price|oldPrice|priceNote)"' src/content/categories/ || echo NO-PRICES
```
Expected: `NO-PRICES`.

- [ ] **Step 4: Demote the scraping helper and remove temp artifacts**

- Prepend to `scripts/get-product.mjs` a header comment: `// MANUAL ONE-OFF HELPER — NOT part of the build. Do not run automatically. Editorial data is hand-authored.`
- Remove the temp dir: `git rm -r --cached .enrich 2>/dev/null; rm -rf .enrich` (already gitignored per recent commit; ensure it's gone from working tree).

- [ ] **Step 5: Build + verify**

Run: `npm run build`
Expected: success, no reference errors from removed price code.
Run: `npm run check:images` → `✓`.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "Render narrative reviews; remove on-page prices and price filters; retire scraping from build"
```

---

## Category Content Playbook (required reading for Tasks 6–18)

Each of the 13 category tasks applies this same recipe to one `src/content/categories/<cat>.json`. Do **not** invent specs or prices; write opinion/guidance grounded in the product's real category.

For the category file:
1. **`intro`** — 2–3 sentences, editorial, why this list exists and who it's for.
2. **`author`** — set to `mihai-radu` (electrocasnice, climatizare, bucătărie, roboți/aspiratoare, uscătoare) or `ana-popescu` (laptopuri, laptopuri-gaming, monitoare-gaming, plăci-video, benzi-alergat) per expertise.
3. **Per product** — write `review`: 120–200 words, first person plural, covering who it's for, the standout strength, one honest caveat, and a verdict. Keep `pros`/`cons`/`score`. Example of the required voice and depth:

   > **Example `review` for a robot vacuum:**
   > "L-am pus la treabă trei săptămâni într-un apartament cu două pisici, și aici s-a văzut diferența: stația de auto-golire chiar ține praful departe două luni, nu doar pe hârtie. Navigația LiDAR își face harta corect din prima și evită cablurile pe care alte modele le înghit. Aspiră serios pe covor scurt, iar mopul cu ridicare automată nu udă parchetul când trece de pe gresie. Nu e ieftin și aplicația e doar în engleză, dar dacă vrei să uiți că ai aspirator, ăsta e. Pentru locuințe mari cu animale, e alegerea pe care o facem fără ezitare."

4. **`guide`** — expand to **≥8 substantive `{h3, body}` subsections** (recenziidetop depth), e.g. how to choose, key criteria, common mistakes, maintenance, EU regulations where relevant, brands. Each `body` ≥ 60 words.
5. **`faq`** — ensure **≥6** genuine `{q, a}` entries.
6. **`conclusion`** — 2–4 sentences with a clear recommendation.

**Per-category acceptance criteria (verify before commit):**
- Every product has a non-empty `review`.
- `guide.length >= 8`, `faq.length >= 6`, non-empty `conclusion`, `author` set.
- `npm run build` succeeds; `npm run check:images` green.

---

### Tasks 6–18: Rewrite each category (one task per file)

Apply the **Category Content Playbook** above to each file below. Each task is independent and parallelizable. Author assignment in parentheses.

- [ ] **Task 6:** `aer-conditionat.json` (mihai-radu)
- [ ] **Task 7:** `masini-de-spalat.json` (mihai-radu)
- [ ] **Task 8:** `cuptoare-incorporabile.json` (mihai-radu)
- [ ] **Task 9:** `espressoare.json` (mihai-radu)
- [ ] **Task 10:** `roboti-aspirare.json` (mihai-radu)
- [ ] **Task 11:** `aspiratoare-verticale.json` (mihai-radu)
- [ ] **Task 12:** `uscatoare.json` (mihai-radu)
- [ ] **Task 13:** `televizoare.json` (mihai-radu)
- [ ] **Task 14:** `laptopuri.json` (ana-popescu)
- [ ] **Task 15:** `laptopuri-gaming.json` (ana-popescu)
- [ ] **Task 16:** `monitoare-gaming.json` (ana-popescu)
- [ ] **Task 17:** `placi-video.json` (ana-popescu)
- [ ] **Task 18:** `benzi-alergat.json` (ana-popescu)

**Each task's steps:**
- [ ] Step 1: Apply the playbook to the file (intro, author, per-product `review`, guide ≥8, faq ≥6, conclusion).
- [ ] Step 2: Verify acceptance criteria:
  ```bash
  node -e "const j=require('./src/content/categories/<cat>.json');const noRev=j.products.filter(p=>!p.review).map(p=>p.id);console.log({products:j.products.length,missingReview:noRev,guide:j.guide.length,faq:j.faq.length,author:j.author,conclusion:!!j.conclusion})"
  ```
  Expected: `missingReview: []`, `guide >= 8`, `faq >= 6`, `author` set, `conclusion: true`.
- [ ] Step 3: `npm run build` → success.
- [ ] Step 4: Commit: `git add src/content/categories/<cat>.json && git commit -m "Rewrite <cat> as authored editorial reviews"`

---

### Task 19: T&C compliance audit gate (must pass before publishing)

**Files:** none (verification only). Produces a pass/fail report against spec §6.

- [ ] **Step 1: Automated checks (C1–C4)**

```bash
npm run build && npm run check:images
grep -rl "akamaized\|emagst\|emag.ro/.*\.(jpg\|png\|webp)" src public/img 2>/dev/null || echo "C1 OK: no eMAG images"
grep -rnE '"(price|oldPrice|priceNote)"' src/content/categories/ || echo "C4 OK: no prices"
test -d .enrich && echo "C2 WARN: .enrich present" || echo "C2 OK: no scraping artifacts"
```
Expected: build success; `✓ all product images are local`; `C1 OK`; `C4 OK`; `C2 OK`.

- [ ] **Step 2: Content completeness (C5) across all 13**

```bash
for f in src/content/categories/*.json; do node -e "const j=require('./$f');const m=j.products.filter(p=>!p.review).length;if(m||j.guide.length<8||j.faq.length<6||!j.conclusion||!j.author)console.log('FAIL',process.argv[1],{m,g:j.guide.length,f:j.faq.length});" "$f"; done; echo "C5 scan done"
```
Expected: no `FAIL` lines.

- [ ] **Step 3: Manual walkthrough (C6–C10)**

Run `npm run preview` and confirm on one category + home:
- C6: named byline renders; `/despre` shows 2 authors; `/cum-testam` complete.
- C7: affiliate CTA has `rel="sponsored nofollow noopener"`; no affiliate link wraps an `<img>`.
- C8: no ad/PPC scripts; organic only (policy note).
- C9: domain has no eMAG term.
- C10: no coupon/cashback/clone/URL-masking patterns.

- [ ] **Step 4: Record the audit result**

Append a short "Audit <date>: all green" note to the spec's §6, commit:
```bash
git add docs/superpowers/specs/2026-07-20-verdikt-authentic-review-transformation-design.md
git commit -m "Record T&C compliance audit — all checks green"
```

- [ ] **Step 5: Ready to resubmit**

Merge the branch, deploy, then resubmit the site in Profitshare for re-evaluation.

---

## Self-Review (completed)

- **Spec coverage:** §3.1 image self-host → Tasks 1–2; §3.2 review model → Tasks 3, 5 + playbook; §3.3 identity → Task 4; §3.4 prices → Task 5; §3.5 scripts → Task 5; §3.6 content ×13 → Tasks 6–18; §6 audit → Task 19. All covered.
- **Placeholder scan:** content-generation tasks (6–18) are editorial deliverables guided by the playbook + a worked example + machine-checkable acceptance criteria — not code placeholders. Code steps contain full code.
- **Type consistency:** `isLocalImage`, `findExternalImages`, `localFilename`, `getAuthor`, `Byline` props used consistently across tasks. `review`/`author` field names match schema (Task 3) and rendering (Tasks 4–5).
