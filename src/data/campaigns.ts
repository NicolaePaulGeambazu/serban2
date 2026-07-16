/**
 * eMAG campaign calendar. The strip picks the active campaign (or the next
 * upcoming one) automatically from today's date — no scraping needed.
 * Add campaigns from the official eMAG calendar as they're announced.
 * `url` should be your affiliate deeplink to the campaign landing page.
 */
export interface Campaign {
  name: string;
  start: string; // YYYY-MM-DD
  end: string; // YYYY-MM-DD (inclusive)
  url: string;
}

export const campaigns: Campaign[] = [
  { name: 'Crazy Days', start: '2026-07-14', end: '2026-07-16', url: '#' },
  { name: 'Stock Busters', start: '2026-08-25', end: '2026-08-27', url: '#' },
  { name: 'Black Friday', start: '2026-11-13', end: '2026-11-16', url: '#' },
];
