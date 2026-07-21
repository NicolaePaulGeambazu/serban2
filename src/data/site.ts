export const site = {
  name: 'TopAlegeri',
  domain: 'topalegeri.ro',
  url: 'https://www.topalegeri.ro',
  tagline: 'Comparăm, cântărim și dăm verdictul.',
  description:
    'Recenzii și verdicte scrise de redacția noastră pentru piața din România — electrocasnice, electronice și fitness. Îți spunem pe scurt ce merită cumpărat și de ce, cu link direct către produs.',
  // Google Tag Manager container id ("GTM-XXXXXXX"). If set, GTM is used (manage GA4/Ads inside GTM).
  googleTagManagerId: 'GTM-MJZLLCZC',
  // GA4 Measurement ID ("G-XXXXXXXXXX") — used ONLY if GTM id above is empty. Empty = analytics off.
  googleAnalyticsId: '',
  // Paste the token from Google Search Console (HTML tag verification method). Empty = no tag.
  googleSiteVerification: 'omUxFErR4arMpS6M7HAf7BwmIldeFfU0YslovrOYgao',
  // Profitshare affiliate site-ownership verification id. Empty = no tag.
  profitshareId: 'a90e38a5e9cbb43e94c236ddb50ea3f8',
  locale: 'ro_RO',
  lang: 'ro',
  themeColor: '#0F1B2D',
  founded: 2026,
  stats: {
    products: '130+',
    rankings: '13',
    reviews: '130+',
  },
  social: {
    // completează cu profilurile reale înainte de lansare
    facebook: '',
    instagram: '',
    youtube: '',
  },
};

export type Site = typeof site;
