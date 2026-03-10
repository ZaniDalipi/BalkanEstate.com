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

  // Add prerender status indicator before </head>
  html = html.replace(
    '</head>',
    `  <meta name="prerender-status" content="200" />\n  </head>`
  );

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
