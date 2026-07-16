/**
 * Affiliate link handling.
 *
 * Profitshare's "link simplu" is a fixed short link per product and does NOT
 * accept a ?url= override, so it can't be used as a reusable deeplink base.
 * The scalable way with Profitshare is their auto-convert SCRIPT: buttons point
 * to normal eMAG product URLs, and the script (loaded after cookie consent in
 * CookieConsent.astro) rewrites them into tracked affiliate links at runtime.
 *
 * mode:
 *  - 'script'   → emit the raw store URL; the Profitshare auto-script converts it. (default)
 *  - 'deeplink' → wrap each URL in `deeplinkBase` (only for networks that honour ?url=,
 *                 e.g. a 2Performant quicklink).
 */
export const AFFILIATE = {
  mode: 'script' as 'script' | 'deeplink',
  // Used only when mode === 'deeplink':
  deeplinkBase: 'https://event.2performant.com/events/click?ad_type=quicklink&aff_code=AFF_CODE&unique=UNIQUE&redirect_to=',
};

export function deeplink(dest: string): string {
  // Already an affiliate link? leave it as-is (lets you hand-place a Profitshare
  // "link simplu" in a product's emagUrl if you ever want to).
  if (/profitshare\.ro|2performant\.com/.test(dest)) return dest;
  if (AFFILIATE.mode === 'deeplink') return AFFILIATE.deeplinkBase + encodeURIComponent(dest);
  return dest; // script mode
}

/** rel value for every outbound affiliate link (SEO + disclosure best practice). */
export const AFFILIATE_REL = 'sponsored nofollow noopener';
