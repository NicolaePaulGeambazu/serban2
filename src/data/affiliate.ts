/**
 * Affiliate deeplink builder.
 *
 * eMAG's Romanian affiliate program runs through Profitshare (owned by eMAG)
 * and 2Performant. Both give you a "deeplink" / "quicklink" base that wraps a
 * destination URL and attaches your tracking so you get the commission.
 *
 * 1. Pick your network below.
 * 2. Paste your real base from the network dashboard (Profitshare: Tools → Deeplink).
 * Links are built at BUILD TIME (static), so there is no client-side JS and the
 * markup already carries rel="sponsored nofollow".
 */
export const AFFILIATE = {
  network: 'profitshare' as 'profitshare' | '2performant',
  // Profitshare deeplink base (the id is tied to your account; ?url= sets the destination):
  profitshareBase: 'https://l.profitshare.ro/l/16182361?url=',
  // 2Performant quicklink — replace AFF_CODE / UNIQUE with your values:
  twoPBase:
    'https://event.2performant.com/events/click?ad_type=quicklink&aff_code=AFF_CODE&unique=UNIQUE&redirect_to=',
  // While these still contain the placeholders, deeplink() returns the raw eMAG
  // URL so local/dev links work. Real tracking kicks in once you paste your base.
};

function isConfigured(base: string): boolean {
  return !/PROFITSHARE_ID|AFF_CODE|UNIQUE/.test(base);
}

export function deeplink(dest: string): string {
  const base =
    AFFILIATE.network === '2performant' ? AFFILIATE.twoPBase : AFFILIATE.profitshareBase;
  if (!isConfigured(base)) return dest; // not set up yet → link straight to eMAG
  return base + encodeURIComponent(dest);
}

/** rel value for every outbound affiliate link (SEO + disclosure best practice). */
export const AFFILIATE_REL = 'sponsored nofollow noopener';
