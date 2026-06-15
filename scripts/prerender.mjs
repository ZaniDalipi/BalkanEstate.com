/**
 * Prerender Script for BalkanEstateAI
 *
 * Generates static HTML files for critical SEO routes at build time.
 * This ensures search engine crawlers see fully-rendered HTML with
 * meta tags, structured data, and content — even without JavaScript.
 *
 * Run after `vite build`: node scripts/prerender.mjs
 *
 * For each route, it injects the correct <title>, <meta description>,
 * canonical URL, Open Graph tags, and JSON-LD structured data directly
 * into the HTML template. The React app then hydrates on top.
 *
 * Generates language variants for all 10 supported languages,
 * with correct og:locale, html lang, and hreflang tags per language.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { dirname, join } from 'path';

const DIST_DIR = process.argv[2] || 'dist';
const BASE_URL = 'https://balkanestateai.com';
const SITE_NAME = 'BalkanEstateAI';

// ─── Multi-language configuration ────────────────────────────────────────────
const LANGUAGES = ['en', 'sq', 'sr', 'bg', 'hr', 'bs', 'mk', 'me', 'ro', 'el'];
const OG_LOCALE_MAP = {
  en: 'en_US', sq: 'sq_AL', sr: 'sr_RS', bg: 'bg_BG',
  hr: 'hr_HR', bs: 'bs_BA', mk: 'mk_MK', me: 'sr_ME',
  ro: 'ro_RO', el: 'el_GR',
};

// Read the built index.html as template
const templatePath = join(DIST_DIR, 'index.html');
if (!existsSync(templatePath)) {
  console.error(`❌ ${templatePath} not found. Run 'vite build' first.`);
  process.exit(1);
}
const template = readFileSync(templatePath, 'utf-8');

// ─── Routes to prerender ─────────────────────────────────────────────────────
// Each route gets a static HTML file with SEO-optimized meta tags.
// Prioritized by keyword opportunity score.

const routes = [
  // Homepage
  {
    path: '/',
    title: `${SITE_NAME} - Property for Sale in the Balkans | Houses, Apartments & Villas`,
    description: 'Find property for sale across 11 Balkan countries. Browse apartments in Tirana, villas in Montenegro, houses in Belgrade, real estate in North Macedonia, and more. AI-powered search, 10 languages.',
  },
  // Main search
  {
    path: '/search',
    title: `Property for Sale in the Balkans - Houses, Apartments & Villas | ${SITE_NAME}`,
    description: 'Search property for sale across 11 Balkan countries. AI-powered search for apartments, houses, villas, and land in Montenegro, Albania, Serbia, North Macedonia, Croatia, and more.',
  },

  // ── Tier 1: Kosovo, N. Macedonia, Albania ────────────────────────
  {
    path: '/search?country=Kosovo',
    title: `Property for Sale in Kosovo - Houses, Apartments & Land | ${SITE_NAME}`,
    description: 'Find property for sale in Kosovo. Browse apartments, houses, villas, and land listings in Pristina, Prizren, and across Kosovo. AI-powered search.',
  },
  {
    path: '/search?country=North+Macedonia',
    title: `Real Estate North Macedonia - Property for Sale in Skopje & Ohrid | ${SITE_NAME}`,
    description: 'Find real estate in North Macedonia. Browse apartments, houses, and land for sale in Skopje, Ohrid, and across the country. AI-powered property search.',
  },
  {
    path: '/search?country=Albania',
    title: `Buy Property in Albania - Apartments, Villas & Land for Sale | ${SITE_NAME}`,
    description: 'Buy property in Albania. Find apartments for sale in Tirana, villas on the Albanian Riviera, and land across the country. Low prices, high ROI.',
  },
  {
    path: '/search?country=Albania&city=Tirana',
    title: `Apartments for Sale in Tirana - Buy Property in Albania's Capital | ${SITE_NAME}`,
    description: 'Find apartments for sale in Tirana, Albania. New builds, city center flats, and investment properties. Tirana apartment prices from €800/sqm.',
  },
  {
    path: '/search?country=North+Macedonia&city=Skopje',
    title: `Buy Property in Skopje - Apartments & Houses for Sale | ${SITE_NAME}`,
    description: 'Buy property in Skopje, North Macedonia. Find apartments, houses, and new builds for sale in the capital. Affordable prices, AI-powered search.',
  },
  {
    path: '/search?country=North+Macedonia&city=Ohrid',
    title: `Ohrid Real Estate - Property for Sale by UNESCO Lake | ${SITE_NAME}`,
    description: 'Explore Ohrid real estate. Find lakeside apartments, houses, and villas for sale by UNESCO Lake Ohrid.',
  },
  {
    path: '/search?country=Albania&city=Saranda',
    title: `Sarande Property for Sale - Albanian Riviera Real Estate | ${SITE_NAME}`,
    description: 'Discover Sarande property for sale on the Albanian Riviera. Seaside apartments, luxury villas, and investment properties with sea views.',
  },

  // ── Tier 2: Montenegro, Bosnia ───────────────────────────────────
  {
    path: '/search?country=Montenegro',
    title: `Property for Sale in Montenegro - Real Estate, Villas & Apartments | ${SITE_NAME}`,
    description: 'Find property for sale in Montenegro. Browse luxury villas in Budva, apartments in Kotor, land on the coast, and new builds in Tivat.',
  },
  {
    path: '/search?country=Montenegro&city=Budva',
    title: `Apartments for Sale in Budva - Montenegro Coastal Property | ${SITE_NAME}`,
    description: 'Find apartments for sale in Budva, Montenegro. Coastal properties, sea view apartments, and luxury residences on the Budva Riviera.',
  },
  {
    path: '/search?country=Montenegro&city=Kotor',
    title: `Apartments for Sale in Kotor - UNESCO Bay Property | ${SITE_NAME}`,
    description: 'Discover apartments for sale in Kotor, Montenegro. Property in the UNESCO Bay of Kotor. Old town apartments, new builds, and sea view homes.',
  },
  {
    path: '/search?country=Montenegro&city=Tivat',
    title: `Property for Sale in Tivat - Porto Montenegro Real Estate | ${SITE_NAME}`,
    description: 'Browse property for sale in Tivat, Montenegro. Luxury apartments near Porto Montenegro, new builds, and coastal residences.',
  },
  {
    path: '/search?country=Montenegro&city=Podgorica',
    title: `Buy Apartment in Podgorica - Montenegro Capital Property | ${SITE_NAME}`,
    description: 'Buy apartment in Podgorica, Montenegro. Affordable capital city property, new builds, and investment opportunities.',
  },
  {
    path: '/search?country=Bosnia',
    title: `Property for Sale in Bosnia and Herzegovina - Real Estate BiH | ${SITE_NAME}`,
    description: 'Find property for sale in Bosnia and Herzegovina. Browse apartments in Sarajevo, houses in Mostar, and affordable real estate across BiH.',
  },
  {
    path: '/search?country=Bosnia&city=Sarajevo',
    title: `Apartments for Sale in Sarajevo - Bosnia Real Estate | ${SITE_NAME}`,
    description: 'Find apartments for sale in Sarajevo, Bosnia. Capital city property, new builds, and investment opportunities.',
  },

  // ── Tier 3: Serbia, Croatia, Bulgaria, Romania, Greece ───────────
  {
    path: '/search?country=Serbia',
    title: `Real Estate Serbia - Property for Sale in Belgrade & Beyond | ${SITE_NAME}`,
    description: 'Find real estate in Serbia. Browse apartments for sale in Belgrade, houses across Serbia, and investment properties.',
  },
  {
    path: '/search?country=Serbia&city=Belgrade',
    title: `Apartments for Sale in Belgrade - Serbia Real Estate | ${SITE_NAME}`,
    description: 'Find apartments for sale in Belgrade, Serbia. New Belgrade flats, city center apartments, and investment properties.',
  },
  {
    path: '/search?country=Croatia',
    title: `Property for Sale in Croatia - Coastal Homes, Apartments & Villas | ${SITE_NAME}`,
    description: 'Find property for sale in Croatia. Browse seaside apartments in Split, houses on the Dalmatian coast, villas in Dubrovnik.',
  },
  {
    path: '/search?country=Bulgaria',
    title: `Real Estate Bulgaria - Property & Apartments for Sale | ${SITE_NAME}`,
    description: 'Find real estate in Bulgaria. Affordable apartments in Sofia, Black Sea coast properties, and ski resort homes.',
  },
  {
    path: '/search?country=Romania',
    title: `Property for Sale in Romania - Bucharest & Cluj Real Estate | ${SITE_NAME}`,
    description: 'Find property for sale in Romania. Browse apartments in Bucharest, houses in Cluj-Napoca, and real estate across the country.',
  },
  {
    path: '/search?country=Greece',
    title: `Property for Sale in Greece - Islands, Athens & Coastal Homes | ${SITE_NAME}`,
    description: 'Find property for sale in Greece. Browse Athens apartments, island homes, and coastal villas. Golden visa eligible.',
  },
  {
    path: '/search?country=Slovenia',
    title: `Property for Sale in Slovenia - Ljubljana & Alpine Real Estate | ${SITE_NAME}`,
    description: 'Find property for sale in Slovenia. Browse apartments in Ljubljana, homes in Maribor, coastal property in Koper, and Alpine real estate near Bled.',
  },

  // ── Other pages ──────────────────────────────────────────────────
  {
    path: '/agents',
    title: `Real Estate Agents in the Balkans - Find Verified Agents | ${SITE_NAME}`,
    description: 'Find verified real estate agents across 11 Balkan countries. Connect with local property experts in Montenegro, Albania, Serbia, North Macedonia, and more.',
  },
  {
    path: '/agencies',
    title: `Real Estate Agencies in the Balkans | ${SITE_NAME}`,
    description: 'Browse real estate agencies across the Balkans. Find trusted agencies in Montenegro, Albania, Serbia, Croatia, and more.',
  },
  {
    path: '/rentals',
    title: `Rental Properties in the Balkans - Apartments & Houses for Rent | ${SITE_NAME}`,
    description: 'Find rental properties across the Balkans. Apartments and houses for rent in Montenegro, Serbia, Albania, Croatia, and more.',
  },
  {
    path: '/valuation',
    title: `AI Property Valuation - Free Estimate for Balkan Properties | ${SITE_NAME}`,
    description: 'Get a free AI-powered property valuation for any Balkan property. Instant price estimates based on comparable sales, location data, and market trends.',
  },
  {
    path: '/explore-cities',
    title: `City Guides - Explore Balkan Cities for Property | ${SITE_NAME}`,
    description: 'Explore city guides for property buyers. Neighborhood insights, price data, and lifestyle information for cities across the Balkans.',
  },
  {
    path: '/mortgage-calculator',
    title: `Mortgage Calculator - Calculate Property Payments | ${SITE_NAME}`,
    description: 'Calculate your mortgage payments for Balkan properties. Free mortgage calculator with interest rates for Montenegro, Serbia, Albania, and more.',
  },
  {
    path: '/guides',
    title: `Property Buying Guides - How to Buy Real Estate in the Balkans | ${SITE_NAME}`,
    description: 'Complete guides to buying property in 10 Balkan countries. Legal process, foreign ownership rules, taxes, and investment insights for Montenegro, Albania, Serbia, Greece, and more.',
  },

  // ── Rental pages ──────────────────────────────────────────────────
  {
    path: '/rentals?country=Montenegro',
    title: `Apartments for Rent in Montenegro - Monthly & Long-Term Rentals | ${SITE_NAME}`,
    description: 'Find apartments and houses for rent in Montenegro. Monthly rentals in Budva, Kotor, Tivat, Podgorica. Verified listings, instant contact.',
  },
  {
    path: '/rentals?country=Albania',
    title: `Apartments for Rent in Albania - Tirana & Coastal Rentals | ${SITE_NAME}`,
    description: 'Find apartments for rent in Albania. Tirana city rentals, Saranda beach apartments, and more. Affordable monthly rental prices.',
  },
  {
    path: '/rentals?country=Serbia',
    title: `Apartments for Rent in Belgrade & Serbia | ${SITE_NAME}`,
    description: 'Find apartments for rent in Serbia. Belgrade city center flats, New Belgrade apartments, and rentals across Serbia.',
  },
  {
    path: '/rentals?country=North+Macedonia',
    title: `Apartments for Rent in North Macedonia - Skopje Rentals | ${SITE_NAME}`,
    description: 'Find apartments for rent in North Macedonia. Skopje city rentals, Ohrid lakeside apartments, and affordable monthly rentals.',
  },
  {
    path: '/rentals?country=Kosovo',
    title: `Apartments for Rent in Kosovo - Pristina Rentals | ${SITE_NAME}`,
    description: 'Find apartments for rent in Kosovo. Pristina city center, Prizren old town, and monthly rental listings across Kosovo.',
  },

  // ── Property type pages ───────────────────────────────────────────
  {
    path: '/search?propertyType=apartment',
    title: `Apartments for Sale in the Balkans - Buy Flat | ${SITE_NAME}`,
    description: 'Find apartments for sale across 11 Balkan countries. City flats, new builds, and investment apartments in Montenegro, Albania, Serbia, and more.',
  },
  {
    path: '/search?propertyType=house',
    title: `Houses for Sale in the Balkans - Buy Home | ${SITE_NAME}`,
    description: 'Find houses for sale across the Balkans. Family homes, countryside houses, and traditional stone houses in Montenegro, Croatia, and more.',
  },
  {
    path: '/search?propertyType=villa',
    title: `Luxury Villas for Sale in the Balkans | ${SITE_NAME}`,
    description: 'Find luxury villas for sale in the Balkans. Sea view villas, pool villas, and exclusive properties in Montenegro, Croatia, Greece, and Albania.',
  },
  {
    path: '/search?propertyType=land',
    title: `Land for Sale in the Balkans - Building Plots & Agricultural Land | ${SITE_NAME}`,
    description: 'Find land for sale in the Balkans. Building plots, agricultural land, and development sites in Montenegro, Albania, Serbia, and more.',
  },
];

// ─── Generate prerendered HTML ───────────────────────────────────────────────

// ─── GEO content injection ───────────────────────────────────────────────────
// AI answer engines (ChatGPT/OAI-SearchBot, ClaudeBot, PerplexityBot, GPTBot,
// Google-Extended) largely DO NOT execute JavaScript. Because the app mounts
// with createRoot() (not hydrateRoot), React replaces #root on load — so we can
// safely seed #root with crawler-visible content + JSON-LD. Users see the React
// app the instant JS runs; crawlers get real, citable, per-page content.

const COUNTRIES = [
  { name: 'Montenegro', q: 'Montenegro', cities: ['Budva', 'Kotor', 'Tivat', 'Podgorica', 'Herceg Novi'] },
  { name: 'Albania', q: 'Albania', cities: ['Tirana', 'Saranda', 'Durres', 'Vlora'] },
  { name: 'Kosovo', q: 'Kosovo', cities: ['Pristina', 'Prizren'] },
  { name: 'North Macedonia', q: 'North Macedonia', cities: ['Skopje', 'Ohrid', 'Bitola'] },
  { name: 'Serbia', q: 'Serbia', cities: ['Belgrade', 'Novi Sad', 'Nis'] },
  { name: 'Croatia', q: 'Croatia', cities: ['Split', 'Dubrovnik', 'Zagreb'] },
  { name: 'Bosnia and Herzegovina', q: 'Bosnia', cities: ['Sarajevo', 'Mostar'] },
  { name: 'Bulgaria', q: 'Bulgaria', cities: ['Sofia', 'Burgas', 'Varna'] },
  { name: 'Romania', q: 'Romania', cities: ['Bucharest', 'Cluj-Napoca', 'Brasov'] },
  { name: 'Greece', q: 'Greece', cities: ['Athens', 'Thessaloniki', 'Crete'] },
  { name: 'Slovenia', q: 'Slovenia', cities: ['Ljubljana', 'Maribor', 'Koper', 'Bled'] },
];

const PROPERTY_TYPES = [
  { name: 'Apartments', q: 'apartment' },
  { name: 'Houses', q: 'house' },
  { name: 'Villas', q: 'villa' },
  { name: 'Land', q: 'land' },
  { name: 'Commercial', q: 'commercial' },
];

// Short UI labels translated per language (section headings only — high-confidence
// strings). FAQ answers are kept in English in this first iteration, matching the
// existing convention that prerendered meta copy is English across all locales.
const LABELS = {
  en: { country: 'Browse property by country', type: 'Property types', faq: 'Frequently asked questions', view: 'View listings', pages: 'Explore' },
  sq: { country: 'Shfletoni prona sipas shtetit', type: 'Llojet e pronave', faq: 'Pyetjet e shpeshta', view: 'Shiko listimet', pages: 'Eksploro' },
  sr: { country: 'Pretražite nekretnine po zemlji', type: 'Tipovi nekretnina', faq: 'Često postavljana pitanja', view: 'Pogledaj oglase', pages: 'Istražite' },
  bg: { country: 'Имоти по държава', type: 'Видове имоти', faq: 'Често задавани въпроси', view: 'Виж обявите', pages: 'Разгледай' },
  hr: { country: 'Pretraži nekretnine po državi', type: 'Vrste nekretnina', faq: 'Često postavljana pitanja', view: 'Pogledaj oglase', pages: 'Istraži' },
  bs: { country: 'Pretraži nekretnine po državi', type: 'Vrste nekretnina', faq: 'Često postavljana pitanja', view: 'Pogledaj oglase', pages: 'Istraži' },
  mk: { country: 'Имоти по земја', type: 'Типови на имоти', faq: 'Често поставувани прашања', view: 'Погледни огласи', pages: 'Истражи' },
  me: { country: 'Pretraži nekretnine po državi', type: 'Tipovi nekretnina', faq: 'Često postavljana pitanja', view: 'Pogledaj oglase', pages: 'Istraži' },
  ro: { country: 'Caută proprietăți după țară', type: 'Tipuri de proprietăți', faq: 'Întrebări frecvente', view: 'Vezi anunțurile', pages: 'Explorează' },
  el: { country: 'Αναζήτηση ακινήτων ανά χώρα', type: 'Τύποι ακινήτων', faq: 'Συχνές ερωτήσεις', view: 'Δείτε τις αγγελίες', pages: 'Εξερευνήστε' },
};

// FAQ sets (English). Keyed by page category. {country} is interpolated.
const FAQ_GENERAL = [
  { q: 'Which countries does BalkanEstateAI cover?', a: 'BalkanEstateAI lists property for sale and rent across all 11 Balkan countries: Albania, Bosnia and Herzegovina, Bulgaria, Croatia, Greece, Kosovo, Montenegro, North Macedonia, Romania, Serbia, and Slovenia — on a single platform.' },
  { q: 'Can foreigners buy property in the Balkans?', a: 'In most Balkan countries foreign nationals can buy property, though rules differ by country (some restrict agricultural land or require a local company for certain purchases). See our country-specific buying guides for the exact process.' },
  { q: 'What languages is BalkanEstateAI available in?', a: 'The platform is available in 10 languages: English, Albanian, Serbian, Bulgarian, Croatian, Bosnian, Macedonian, Montenegrin, Romanian, and Greek.' },
  { q: 'Is BalkanEstateAI free for buyers and renters?', a: 'Yes. Searching listings, using AI-powered natural-language search, and contacting agents is free for buyers and renters.' },
  { q: 'What makes BalkanEstateAI different from other portals?', a: 'It is the only single platform covering all 11 Balkan countries with AI-powered search and AI property valuations, whereas most competitors cover a few countries or run a separate site per country.' },
];

const faqCountry = (country) => [
  { q: `Can foreigners buy property in ${country}?`, a: `Foreign buyers can generally purchase property in ${country}, subject to that country's specific rules on residential vs. agricultural land. Read the ${country} buying guide on BalkanEstateAI for the legal process, taxes, and ownership requirements.` },
  { q: `How do I find property for sale in ${country}?`, a: `Browse all verified listings for ${country} on BalkanEstateAI. Filter by city, price, property type, and bedrooms, or use AI-powered natural-language search to describe exactly what you want.` },
  { q: `What types of property are available in ${country}?`, a: `Apartments, houses, villas, land, and commercial property are listed across ${country}. You can also estimate any property's value for free with the AI valuation tool.` },
  { q: `How much does property cost in ${country}?`, a: `Prices vary by city, location, and property type. Use BalkanEstateAI's free AI property valuation and live listings to see current ${country} market prices rather than relying on outdated figures.` },
];

const faqType = (type) => [
  { q: `Where can I buy ${type} in the Balkans?`, a: `BalkanEstateAI lists ${type} for sale across all 11 Balkan countries. Filter by country and city to find ${type} that match your budget and location.` },
  { q: `Can I get a price estimate for a ${type}?`, a: `Yes — use the free AI property valuation tool to estimate the value of any ${type} in the Balkans based on comparable listings and location data.` },
];

const faqRentals = [
  { q: 'How do I find apartments for rent in the Balkans?', a: 'Browse rental listings on BalkanEstateAI by country and city. Filter by price, bedrooms, and property type, and contact landlords or agents directly for free.' },
  { q: 'Are long-term and monthly rentals available?', a: 'Yes. The platform lists both long-term and monthly rental apartments and houses across the Balkans.' },
];

function faqForRoute(route) {
  const p = route.path;
  const country = COUNTRIES.find(c => p.includes(`country=${c.q.replace(/ /g, '+')}`) || p.includes(`country=${c.q}`));
  if (p.startsWith('/rentals')) return faqRentals;
  if (country) return faqCountry(country.name);
  const type = PROPERTY_TYPES.find(t => p.includes(`propertyType=${t.q}`));
  if (type) return faqType(type.name.toLowerCase());
  return FAQ_GENERAL;
}

// Build crawler-visible HTML for #root.
function buildBodyContent(route, lang, canonicalUrl) {
  const L = LABELS[lang] || LABELS.en;
  const prefix = lang === 'en' ? '' : `/${lang}`;
  const link = (path, text) => `<a href="${BASE_URL}${prefix}${path}">${escapeHtml(text)}</a>`;

  const countryLinks = COUNTRIES.map(c =>
    `<li>${link(`/search?country=${c.q.replace(/ /g, '+')}`, `${c.name}`)}${c.cities.length ? ` — ${c.cities.slice(0, 4).map(escapeHtml).join(', ')}` : ''}</li>`
  ).join('');
  const typeLinks = PROPERTY_TYPES.map(t =>
    `<li>${link(`/search?propertyType=${t.q}`, t.name)}</li>`
  ).join('');
  const pageLinks = [
    ['/search', 'Property search'], ['/rentals', 'Rentals'], ['/agents', 'Real estate agents'],
    ['/agencies', 'Agencies'], ['/explore-cities', 'City guides'], ['/valuation', 'AI property valuation'],
    ['/guides', 'Buying guides'], ['/mortgage-calculator', 'Mortgage calculator'],
  ].map(([p, t]) => `<li>${link(p, t)}</li>`).join('');

  const faqs = faqForRoute(route);
  const faqHtml = faqs.map(f =>
    `<div itemscope itemtype="https://schema.org/Question"><h3 itemprop="name">${escapeHtml(f.q)}</h3>` +
    `<div itemprop="acceptedAnswer" itemscope itemtype="https://schema.org/Answer"><p itemprop="text">${escapeHtml(f.a)}</p></div></div>`
  ).join('');

  // Visible while JS loads; React replaces it on mount (createRoot).
  return `
      <main id="prerendered-content">
        <h1>${escapeHtml(route.title.split(' | ')[0])}</h1>
        <p>${escapeHtml(route.description)}</p>
        <nav aria-label="${escapeHtml(L.country)}"><h2>${escapeHtml(L.country)}</h2><ul>${countryLinks}</ul></nav>
        <nav aria-label="${escapeHtml(L.type)}"><h2>${escapeHtml(L.type)}</h2><ul>${typeLinks}</ul></nav>
        <nav aria-label="${escapeHtml(L.pages)}"><h2>${escapeHtml(L.pages)}</h2><ul>${pageLinks}</ul></nav>
        <section itemscope itemtype="https://schema.org/FAQPage"><h2>${escapeHtml(L.faq)}</h2>${faqHtml}</section>
      </main>`;
}

// Build per-page JSON-LD: BreadcrumbList + CollectionPage + FAQPage.
function buildPageJsonLd(route, lang, canonicalUrl) {
  const prefix = lang === 'en' ? '' : `/${lang}`;
  const crumbs = [{ name: 'Home', url: `${BASE_URL}${prefix}/` }];
  const country = COUNTRIES.find(c => route.path.includes(`country=${c.q.replace(/ /g, '+')}`) || route.path.includes(`country=${c.q}`));
  if (country) crumbs.push({ name: country.name, url: canonicalUrl });
  const type = PROPERTY_TYPES.find(t => route.path.includes(`propertyType=${t.q}`));
  if (type && !country) crumbs.push({ name: type.name, url: canonicalUrl });
  if (!country && !type && route.path !== '/') {
    crumbs.push({ name: route.title.split(' | ')[0], url: canonicalUrl });
  }

  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({
      '@type': 'ListItem', position: i + 1, name: c.name, item: c.url,
    })),
  };

  const collectionPage = {
    '@context': 'https://schema.org',
    '@type': route.path.includes('/search') || route.path.includes('/rentals') ? 'CollectionPage' : 'WebPage',
    '@id': `${canonicalUrl}#webpage`,
    url: canonicalUrl,
    name: route.title,
    description: route.description,
    inLanguage: lang,
    isPartOf: { '@id': `${BASE_URL}/#website` },
    about: { '@id': `${BASE_URL}/#organization` },
  };

  const faqs = faqForRoute(route);
  const faqPage = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    inLanguage: lang,
    mainEntity: faqs.map(f => ({
      '@type': 'Question', name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };

  return [breadcrumb, collectionPage, faqPage]
    .map(s => `  <script type="application/ld+json">${JSON.stringify(s)}</script>`)
    .join('\n');
}

/**
 * Build hreflang link tags for a given page path across all languages.
 */
function buildHreflangTags(pagePath) {
  const tags = LANGUAGES.map(lang => {
    const href = pagePath === '/'
      ? (lang === 'en' ? BASE_URL : `${BASE_URL}/${lang}`)
      : `${BASE_URL}/${lang}${pagePath}`;
    return `    <link rel="alternate" hreflang="${lang}" href="${href}" />`;
  });
  const xDefault = pagePath === '/' ? BASE_URL : `${BASE_URL}${pagePath}`;
  tags.push(`    <link rel="alternate" hreflang="x-default" href="${xDefault}" />`);
  return tags.join('\n');
}

/**
 * Generate a prerendered HTML file for a given route and language.
 */
function prerenderPage(route, lang) {
  const isDefaultLang = lang === 'en';
  const langPrefix = isDefaultLang ? '' : `/${lang}`;
  const canonicalUrl = `${BASE_URL}${langPrefix}${route.path}`;
  const ogLocale = OG_LOCALE_MAP[lang] || 'en_US';

  let html = template;

  // Set html lang attribute
  html = html.replace(/<html lang="[^"]*"/, `<html lang="${lang}"`);

  // Replace title
  html = html.replace(
    /<title>[^<]*<\/title>/,
    `<title>${escapeHtml(route.title)}</title>`
  );

  // Replace meta description
  html = html.replace(
    /<meta name="description" content="[^"]*"/,
    `<meta name="description" content="${escapeHtml(route.description)}"`
  );

  // Replace meta title
  html = html.replace(
    /<meta name="title" content="[^"]*"/,
    `<meta name="title" content="${escapeHtml(route.title)}"`
  );

  // Replace meta language
  html = html.replace(
    /<meta name="language" content="[^"]*"/,
    `<meta name="language" content="${lang}"`
  );

  // Replace canonical
  html = html.replace(
    /<link rel="canonical" href="[^"]*"/,
    `<link rel="canonical" href="${escapeHtml(canonicalUrl)}"`
  );

  // Replace OG tags
  html = html.replace(
    /<meta property="og:title" content="[^"]*"/,
    `<meta property="og:title" content="${escapeHtml(route.title)}"`
  );
  html = html.replace(
    /<meta property="og:description" content="[^"]*"/,
    `<meta property="og:description" content="${escapeHtml(route.description)}"`
  );
  html = html.replace(
    /<meta property="og:url" content="[^"]*"/,
    `<meta property="og:url" content="${escapeHtml(canonicalUrl)}"`
  );
  html = html.replace(
    /<meta property="og:locale" content="[^"]*"/,
    `<meta property="og:locale" content="${ogLocale}"`
  );

  // Replace Twitter tags
  html = html.replace(
    /<meta name="twitter:title" content="[^"]*"/,
    `<meta name="twitter:title" content="${escapeHtml(route.title)}"`
  );
  html = html.replace(
    /<meta name="twitter:description" content="[^"]*"/,
    `<meta name="twitter:description" content="${escapeHtml(route.description)}"`
  );

  // Replace hreflang tags with page-specific ones
  html = html.replace(
    /\s*<!-- Hreflang for Multi-Region SEO -->[\s\S]*?<link rel="alternate" hreflang="x-default"[^>]*>/,
    `\n    <!-- Hreflang for Multi-Region SEO -->\n${buildHreflangTags(route.path)}`
  );

  // Inject per-page JSON-LD (BreadcrumbList + CollectionPage/WebPage + FAQPage),
  // a freshness signal, and prerender status indicator before </head>.
  const buildDate = new Date().toISOString();
  const pageJsonLd = buildPageJsonLd(route, lang, canonicalUrl);
  html = html.replace(
    '</head>',
    `${pageJsonLd}\n  <meta property="article:modified_time" content="${buildDate}" />\n  <meta name="prerender-status" content="200" />\n  </head>`
  );

  // Seed #root with crawler-visible content. React (createRoot) replaces this on
  // mount, so users are unaffected while JS-less AI crawlers get real content.
  const bodyContent = buildBodyContent(route, lang, canonicalUrl);
  html = html.replace('<div id="root"></div>', `<div id="root">${bodyContent}</div>`);

  // Determine output path
  let outputPath;
  const langDir = isDefaultLang ? '' : lang;

  if (route.path === '/') {
    // For the homepage, write to both dist/index.html AND dist/en/index.html
    // so that /en serves a prerendered file instead of relying on SPA fallback
    // (which can serve stale cached HTML after deployments)
    outputPath = isDefaultLang
      ? join(DIST_DIR, 'index.html')
      : join(DIST_DIR, lang, 'index.html');

    // Also write dist/{lang}/index.html for the default language
    if (isDefaultLang) {
      const langCopyPath = join(DIST_DIR, lang, 'index.html');
      const langCopyDir = dirname(langCopyPath);
      if (!existsSync(langCopyDir)) {
        mkdirSync(langCopyDir, { recursive: true });
      }
      writeFileSync(langCopyPath, html, 'utf-8');
      generated++;
    }
  } else if (route.path.includes('?')) {
    const [base, query] = route.path.split('?');
    const params = new URLSearchParams(query);
    const parts = langDir ? [langDir] : [];
    parts.push(base.replace(/^\//, ''));
    for (const [key, value] of params) {
      parts.push(key, value.replace(/\+/g, ' '));
    }
    outputPath = join(DIST_DIR, ...parts, 'index.html');
  } else {
    const parts = langDir ? [langDir] : [];
    parts.push(route.path.replace(/^\//, ''));
    outputPath = join(DIST_DIR, ...parts, 'index.html');
  }

  // Create directory and write file
  const dir = dirname(outputPath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(outputPath, html, 'utf-8');
  return outputPath;
}

let generated = 0;

// Generate English (default) pages first, then all other languages
for (const route of routes) {
  for (const lang of LANGUAGES) {
    prerenderPage(route, lang);
    generated++;
  }
}

console.log(`✅ Prerendered ${generated} pages (${routes.length} routes × ${LANGUAGES.length} languages) to ${DIST_DIR}/`);

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
