/**
 * Prerender script for BalkanEstateAI.
 *
 * Run after `vite build`: node scripts/prerender.mjs dist
 *
 * The app is a client-rendered SPA. For each public page listed below this
 * writes a static HTML file — the built index.html with the page's own head
 * (title, description, canonical, hreflang, Open Graph, JSON-LD) and a
 * crawlable version of its content inside #root — so search engines, Google's
 * ad crawler and AI search engines see real pages without running JavaScript.
 * React replaces #root on mount (createRoot), so visitors see the app.
 *
 * URL scheme: every page lives under a language prefix. For each page and
 * language it writes dist/{lang}/{path}/index.html. The English file is also
 * written to dist/{path}/index.html so an old unprefixed link still gets the
 * right HTML before the SPA redirects it; its canonical points at /en/{path}.
 *
 * dist/index.html is left as a neutral shell (no canonical): Cloudflare Pages
 * serves it for every URL that has no file of its own, so it must not claim to
 * be the home page.
 *
 * Detail pages (listings, articles, profiles) are rendered per request by the
 * Pages Functions in /functions, and listed in the listings sitemap the API
 * generates. This script writes dist/sitemap.xml for the static pages.
 *
 * What is deliberately NOT prerendered: search/filter URLs with query strings
 * (Cloudflare Pages ignores the query when picking a file, so they were never
 * served, and templated "property in {city}" pages are thin content), and the
 * user's private pages.
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import {
  SITE_URL,
  SITE_NAME,
  LANGUAGES,
  DEFAULT_LANG,
  ROBOTS_INDEX,
  buildHead,
  renderPage,
  hasShellMarkers,
  escapeHtml,
  pageUrl,
  HREFLANG,
} from './lib/page-shell.mjs';
import { COUNTRY_GUIDES, GUIDES_LAST_UPDATED } from '../src/features/guides/data/countryGuides.js';

const DIST_DIR = process.argv[2] || 'dist';
const BUILD_DATE = new Date().toISOString().slice(0, 10);

const templatePath = join(DIST_DIR, 'index.html');
let template;
try {
  template = readFileSync(templatePath, 'utf-8');
} catch {
  console.error(`❌ ${templatePath} not found. Run 'vite build' first.`);
  process.exit(1);
}
if (!hasShellMarkers(template) || !template.includes('<div id="root">')) {
  console.error(`❌ ${templatePath} is missing the page-head/page-body markers (see index.html).`);
  process.exit(1);
}

// ─── Shared content ──────────────────────────────────────────────────────────

const link = (lang, path, text) => `<a href="${escapeHtml(pageUrl(lang, path))}">${escapeHtml(text)}</a>`;
const list = (items) => `<ul>${items.map((i) => `<li>${i}</li>`).join('')}</ul>`;

const NAV_LABEL = {
  en: 'Explore', sq: 'Eksploro', sr: 'Istražite', bg: 'Разгледай', hr: 'Istraži',
  bs: 'Istraži', mk: 'Истражи', me: 'Istraži', ro: 'Explorează', el: 'Εξερευνήστε',
};

function siteNav(lang) {
  return `<nav aria-label="${escapeHtml(NAV_LABEL[lang] || NAV_LABEL.en)}">${list([
    link(lang, '/search', 'Property for sale'),
    link(lang, '/rentals', 'Property for rent'),
    link(lang, '/explore-cities', 'City pages'),
    link(lang, '/guides', 'Buying guides'),
    link(lang, '/mortgage-calculator', 'Mortgage calculator'),
    link(lang, '/valuation', 'Property price estimate'),
    link(lang, '/agents', 'Real estate agents'),
    link(lang, '/agencies', 'Real estate agencies'),
    link(lang, '/blog', 'Blog'),
    link(lang, '/about', 'About BalkanEstateAI'),
    link(lang, '/contact', 'Contact'),
    link(lang, '/privacy', 'Privacy Policy'),
    link(lang, '/terms', 'Terms of Service'),
    link(lang, '/cookies', 'Cookie Policy'),
  ])}</nav>`;
}

function guideLinks(lang) {
  return list(COUNTRY_GUIDES.map((g) => link(lang, `/guides/${g.slug}`, `Buying property in ${g.country}`)));
}

const FEATURES = [
  'Map-based search for homes for sale and rent, with filters for price, size, rooms and property type',
  'Listing pages with photos, floor plans, 360° virtual tours and 3D building views',
  'Sunlight and shadow simulation and the orientation of each property',
  'Nearby schools, shops and transport, with distance measurement',
  'Mortgage and rent-versus-buy calculators',
  'Country buying guides covering foreign ownership, taxes and the legal steps',
  'Agent and agency profiles, and viewing requests sent from a listing',
];

const COUNTRY_LIST = 'Albania, Bosnia and Herzegovina, Bulgaria, Croatia, Greece, Kosovo, Montenegro, North Macedonia, Romania and Serbia';

const organization = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
};

function webPage(lang, path, name, description, type = 'WebPage', extra = {}) {
  return {
    ...organization,
    '@type': type,
    '@id': `${pageUrl(lang, path)}#webpage`,
    url: pageUrl(lang, path),
    name,
    description,
    inLanguage: lang,
    isPartOf: { '@id': `${SITE_URL}/#website` },
    ...extra,
  };
}

// ─── Pages ───────────────────────────────────────────────────────────────────
// Each page: path, title (without site name), description, body(lang) and
// optionally englishOnly (content written in English only: every language URL
// exists, but the canonical is the English one and there are no hreflang
// alternates, so ten identical copies do not compete with each other).

/** @type {Array<{ path: string, title: string, description: string, body: (lang: string) => string, type?: string, englishOnly?: boolean, priority?: string, changefreq?: string, jsonLd?: (lang: string) => object[] }>} */
const PAGES = [
  {
    path: '/',
    title: 'Property for Sale and Rent in the Balkans',
    description: `Search property for sale and rent in ${COUNTRY_LIST}, with maps, floor plans, virtual tours, calculators and country buying guides.`,
    priority: '1.0',
    changefreq: 'daily',
    body: (lang) => `
      <h1>Property for sale and rent in the Balkans</h1>
      <p>${SITE_NAME} is a property marketplace for ${COUNTRY_LIST}. Owners, agents and agencies publish homes for sale and rent; buyers and renters search, compare and contact them directly.</p>
      <h2>What you can do</h2>${list(FEATURES.map(escapeHtml))}
      <h2>Country buying guides</h2>${guideLinks(lang)}`,
  },
  {
    path: '/search',
    title: 'Property for Sale in the Balkans — Map Search',
    description: `Search apartments, houses, villas and land for sale in ${COUNTRY_LIST} on an interactive map.`,
    type: 'CollectionPage',
    priority: '0.9',
    changefreq: 'daily',
    body: (lang) => `
      <h1>Property for sale in the Balkans</h1>
      <p>Search listings for sale on an interactive map. Filter by country, city, price, size, number of rooms and property type, or describe what you want in plain language. Each listing links to the seller or agent.</p>
      <p>New to buying in the region? Start with a country guide:</p>${guideLinks(lang)}`,
  },
  {
    path: '/rentals',
    title: 'Property for Rent in the Balkans',
    description: 'Search apartments and houses for rent across the Balkans on an interactive map, and contact owners and agents directly.',
    type: 'CollectionPage',
    priority: '0.8',
    changefreq: 'daily',
    body: () => `
      <h1>Property for rent in the Balkans</h1>
      <p>Search apartments and houses for rent on an interactive map. Filter by city, monthly rent, size and rooms, and send a viewing request from the listing.</p>`,
  },
  {
    path: '/explore-cities',
    title: 'City Pages — Prices and Neighbourhoods Across the Balkans',
    description: 'City pages with price history, districts and economic indicators for cities across the Balkans.',
    priority: '0.7',
    changefreq: 'weekly',
    body: () => `
      <h1>Explore cities</h1>
      <p>Each city page brings together price history, districts and economic indicators, with the listings currently available in that city.</p>`,
  },
  {
    path: '/guides',
    title: 'Property Buying Guides for the Balkans',
    description: 'How buying property works in 10 Balkan countries: foreign ownership rules, taxes, the legal steps and the official registries to check.',
    englishOnly: true,
    priority: '0.8',
    changefreq: 'monthly',
    body: (lang) => `
      <h1>Property buying guides</h1>
      <p>How buying property works in each country we cover: who can buy, the taxes, the legal steps and which official registry to check. Last updated <time datetime="${GUIDES_LAST_UPDATED}">${GUIDES_LAST_UPDATED}</time>.</p>
      ${guideLinks(lang)}
      <p>General information, not legal or tax advice. Confirm the current rules with a licensed local lawyer or notary.</p>`,
  },
  ...COUNTRY_GUIDES.map((g) => ({
    path: `/guides/${g.slug}`,
    title: `How to Buy Property in ${g.country} — Buyer's Guide`,
    description: `How to buy property in ${g.country}: foreign ownership, taxes, residency, the legal steps and the official registry to check.`,
    englishOnly: true,
    type: 'Article',
    priority: '0.7',
    changefreq: 'monthly',
    body: (lang) => `
      <article>
        <h1>How to buy property in ${escapeHtml(g.country)}</h1>
        <p>By ${SITE_NAME} · Last updated <time datetime="${GUIDES_LAST_UPDATED}">${GUIDES_LAST_UPDATED}</time></p>
        <dl>
          <dt>Foreign ownership</dt><dd>${escapeHtml(g.foreignBuy)}</dd>
          <dt>Annual tax</dt><dd>${escapeHtml(g.tax)}</dd>
          <dt>Transfer tax</dt><dd>${escapeHtml(g.transferTax)}</dd>
          <dt>Residency</dt><dd>${escapeHtml(g.residency)}</dd>
        </dl>
        <h2>Key points for buyers</h2>${list(g.highlights.map(escapeHtml))}
        <h2>Buying process, step by step</h2><ol>${g.legalProcess.map((s) => `<li>${escapeHtml(s)}</li>`).join('')}</ol>
        <h2>Check before you buy</h2>${list(g.cautions.map(escapeHtml))}
        <h2>Cities</h2>${list(g.topCities.map((c) => link(lang, `/explore-cities/${encodeURIComponent(c)}/${encodeURIComponent(g.searchCountry)}`, c)))}
        <p>${link(lang, `/search?country=${encodeURIComponent(g.searchCountry)}`, `Property for sale in ${g.country}`)}</p>
        <h2>Official sources</h2>${list(g.sources.map((s) => (s.url ? `<a href="${escapeHtml(s.url)}" rel="noopener">${escapeHtml(s.name)}</a>` : escapeHtml(s.name))))}
        <p>General information, not legal or tax advice. Rules and rates change and can depend on your nationality and the municipality; confirm them with a licensed local lawyer or notary and the official registry.</p>
      </article>
      <h2>Other country guides</h2>${guideLinks(lang)}`,
    jsonLd: (lang) => [{
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: `How to buy property in ${g.country}`,
      dateModified: GUIDES_LAST_UPDATED,
      inLanguage: 'en',
      url: pageUrl(DEFAULT_LANG, `/guides/${g.slug}`),
      author: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL },
      publisher: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL },
      citation: g.sources.filter((s) => s.url).map((s) => s.url),
      about: { '@type': 'Country', name: g.country },
      mainEntityOfPage: pageUrl(lang, `/guides/${g.slug}`),
    }],
  })),
  {
    path: '/mortgage-calculator',
    title: 'Mortgage Calculator',
    description: 'Estimate monthly mortgage repayments for a property purchase, and compare renting with buying.',
    priority: '0.6',
    changefreq: 'monthly',
    body: () => `
      <h1>Mortgage calculator</h1>
      <p>Enter the price, deposit, interest rate and term to estimate the monthly repayment and the total interest. The rent-versus-buy calculator compares the cost of renting with buying over time.</p>
      <p>Results are estimates; your bank's offer depends on your income, residency and the property.</p>`,
  },
  {
    path: '/valuation',
    title: 'Property Price Estimate',
    description: 'Get an automated indication of a property\'s value from comparable listings and its location. Not a professional valuation.',
    priority: '0.6',
    changefreq: 'monthly',
    body: () => `
      <h1>Property price estimate</h1>
      <p>Enter a property's location, type and size to get an automated indication of its value based on comparable listings. It is an estimate, not a professional valuation.</p>`,
  },
  {
    path: '/agents',
    title: 'Real Estate Agents in the Balkans',
    description: 'Find real estate agents working in Albania, Montenegro, Serbia, North Macedonia, Croatia and the rest of the region, with their listings and contact details.',
    type: 'CollectionPage',
    priority: '0.7',
    changefreq: 'weekly',
    body: () => `<h1>Real estate agents</h1><p>Browse agent profiles with their current listings, the areas they cover and how to contact them.</p>`,
  },
  {
    path: '/agencies',
    title: 'Real Estate Agencies in the Balkans',
    description: 'Browse real estate agencies across the Balkans, with their agents, listings and contact details.',
    type: 'CollectionPage',
    priority: '0.7',
    changefreq: 'weekly',
    body: () => `<h1>Real estate agencies</h1><p>Browse agency profiles with their agents, their current listings and how to contact them.</p>`,
  },
  {
    path: '/blog',
    title: 'Blog — Property in the Balkans',
    description: 'Articles about buying, renting and owning property in the Balkans.',
    type: 'CollectionPage',
    priority: '0.6',
    changefreq: 'weekly',
    body: () => `<h1>Blog</h1><p>Articles about buying, renting and owning property in the Balkans.</p>`,
  },
  {
    path: '/how-it-works',
    title: 'How BalkanEstateAI Works',
    description: 'How searching, listing and contacting sellers works on BalkanEstateAI, for buyers, sellers, agents and agencies.',
    priority: '0.5',
    changefreq: 'monthly',
    body: () => `<h1>How it works</h1><p>How searching, listing and contacting sellers works, for buyers, renters, private sellers, agents and agencies.</p>${list(FEATURES.map(escapeHtml))}`,
  },
  {
    path: '/about',
    title: 'About Us',
    description: 'Who operates BalkanEstateAI, what the property marketplace offers, where its listings come from, how to report a listing and how to contact us.',
    englishOnly: true,
    type: 'AboutPage',
    priority: '0.5',
    changefreq: 'monthly',
    body: (lang) => `
      <h1>About BalkanEstateAI</h1>
      <p>${SITE_NAME} is an online property marketplace for ${COUNTRY_LIST}. It is operated by BalkanEstate AI DOOEL.</p>
      <h2>Where listings come from</h2>
      <p>Listings are created by property owners, agents and agencies with an account. Some listings are imported from agency feeds or other websites and show their original source.</p>
      <h2>What we check</h2>
      <p>We do not inspect properties or verify each listing's details; the person who publishes a listing is responsible for it. Every listing page has a link to report it.</p>
      <h2>Contact</h2>
      <p>${link(lang, '/contact', 'Contact form')} · <a href="mailto:info@balkanestateai.com">info@balkanestateai.com</a> · <a href="mailto:support@balkanestateai.com">support@balkanestateai.com</a></p>`,
  },
  {
    path: '/contact',
    title: 'Contact BalkanEstateAI',
    description: 'Contact BalkanEstateAI support, report a listing, or ask about advertising and agency plans.',
    type: 'ContactPage',
    priority: '0.4',
    changefreq: 'yearly',
    body: () => `
      <h1>Contact us</h1>
      <p>Use the contact form for support, to report a listing, or about advertising and agency plans.</p>
      <p>Email: <a href="mailto:contact@balkanestateai.com">contact@balkanestateai.com</a> · Support: <a href="mailto:support@balkanestateai.com">support@balkanestateai.com</a></p>`,
  },
  {
    path: '/privacy',
    title: 'Privacy Policy',
    description: 'How BalkanEstateAI collects, uses and protects personal data, including cookies, analytics and advertising.',
    priority: '0.3',
    changefreq: 'yearly',
    body: () => `
      <h1>Privacy Policy</h1>
      <p>How we collect, use, share and protect personal data, the legal bases we rely on, how long we keep data, and your rights. It also explains our use of cookies, analytics and advertising, including Google AdSense, and how to opt out of personalised ads.</p>
      <p>Privacy requests: <a href="mailto:privacy@balkanestateai.com">privacy@balkanestateai.com</a></p>`,
  },
  {
    path: '/terms',
    title: 'Terms of Service',
    description: 'The terms that apply to using BalkanEstateAI, publishing listings and paid plans.',
    priority: '0.3',
    changefreq: 'yearly',
    body: () => `<h1>Terms of Service</h1><p>The terms that apply to using the site, publishing listings, and paid plans for agents and agencies.</p>`,
  },
  {
    path: '/cookies',
    title: 'Cookie Policy',
    description: 'Which cookies BalkanEstateAI uses, what they are for, and how to change your choices.',
    priority: '0.3',
    changefreq: 'yearly',
    body: () => `<h1>Cookie Policy</h1><p>Which cookies the site uses — necessary, preference, analytics and marketing (advertising) cookies — and how to change your choice at any time.</p>`,
  },
];

// ─── Write files ─────────────────────────────────────────────────────────────

function outputPathFor(lang, path) {
  const segments = path === '/' ? [] : path.replace(/^\//, '').split('/');
  return join(DIST_DIR, ...(lang ? [lang] : []), ...segments, 'index.html');
}

function write(file, html) {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, html, 'utf-8');
}

function renderFor(page, lang) {
  const canonicalLang = page.englishOnly ? DEFAULT_LANG : lang;
  const title = `${page.title} | ${SITE_NAME}`;
  const head = buildHead({
    lang,
    path: page.path,
    title,
    description: page.description,
    robots: ROBOTS_INDEX,
    canonicalLang,
    alternates: !page.englishOnly,
    ogType: page.type === 'Article' ? 'article' : 'website',
    jsonLd: [
      webPage(canonicalLang, page.path, page.title, page.description, page.type === 'Article' ? 'WebPage' : (page.type || 'WebPage'), {
        dateModified: BUILD_DATE,
      }),
      ...(page.jsonLd ? page.jsonLd(lang) : []),
    ],
  });
  const body = `<main id="prerendered-content">${page.body(lang)}${siteNav(lang)}</main>`;
  // English-only pages are English documents whatever the URL prefix.
  return renderPage(template, { lang: canonicalLang, head, body });
}

let written = 0;
for (const page of PAGES) {
  for (const lang of LANGUAGES) {
    const html = renderFor(page, lang);
    write(outputPathFor(lang, page.path), html);
    written++;
    // Unprefixed copy for old links. Never the root: dist/index.html is the
    // neutral SPA shell (see header comment).
    if (lang === DEFAULT_LANG && page.path !== '/') {
      write(outputPathFor('', page.path), html);
      written++;
    }
  }
}

// Neutral shell: generic head (no canonical — this file answers for every URL
// without a file of its own), plus a short description and the site
// navigation for anything that reads it without JavaScript.
const shellBody = `<main id="prerendered-content">
      <h1>${SITE_NAME}</h1>
      <p>Property marketplace for ${COUNTRY_LIST}.</p>
      ${siteNav(DEFAULT_LANG)}
    </main>`;
write(templatePath, renderPage(template, {
  lang: DEFAULT_LANG,
  head: template.slice(
    template.indexOf('<!--page-head:start-->') + '<!--page-head:start-->'.length,
    template.indexOf('<!--page-head:end-->'),
  ).trim(),
  body: shellBody,
}));

// ─── Sitemap (static pages) ──────────────────────────────────────────────────
// Only canonical, indexable URLs: every language for translated pages, the
// English URL only for English-only pages. Listings, articles and profiles are
// in /sitemap-listings.xml (generated by the API, proxied by a Pages Function).

const urls = [];
for (const page of PAGES) {
  const langs = page.englishOnly ? [DEFAULT_LANG] : LANGUAGES;
  for (const lang of langs) {
    const alternates = page.englishOnly
      ? ''
      : LANGUAGES.map((l) => `\n    <xhtml:link rel="alternate" hreflang="${HREFLANG[l]}" href="${escapeHtml(pageUrl(l, page.path))}"/>`).join('') +
        `\n    <xhtml:link rel="alternate" hreflang="x-default" href="${escapeHtml(pageUrl(DEFAULT_LANG, page.path))}"/>`;
    urls.push(`  <url>
    <loc>${escapeHtml(pageUrl(lang, page.path))}</loc>${alternates}
    <lastmod>${page.path.startsWith('/guides') ? GUIDES_LAST_UPDATED : BUILD_DATE}</lastmod>
    <changefreq>${page.changefreq || 'monthly'}</changefreq>
    <priority>${page.priority || '0.5'}</priority>
  </url>`);
  }
}
writeFileSync(
  join(DIST_DIR, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls.join('\n')}
</urlset>
`,
  'utf-8',
);

console.log(`✅ Prerendered ${written} files for ${PAGES.length} pages × ${LANGUAGES.length} languages; sitemap.xml has ${urls.length} URLs`);
