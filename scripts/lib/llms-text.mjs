/**
 * /llms.txt and /llms-full.txt — the site summarised for language models
 * (ChatGPT, Claude, Gemini, Perplexity, DeepSeek, Copilot …), written at build
 * time by scripts/prerender.mjs.
 *
 * Built from the same data as the pages, so the two cannot disagree:
 *  - every link is a real page that crawlers can read (language-prefixed, no
 *    query strings — a `/search?country=…` URL serves the empty app shell);
 *  - country facts come from the buying guides, which name their official
 *    sources; there are no price or yield figures here, because prices change
 *    daily — the country and city pages carry the live asking prices.
 * Plain statements, no superlatives: answer engines quote checkable facts.
 */

import { COUNTRY_GUIDES, GUIDES_LAST_UPDATED } from '../../src/features/guides/data/countryGuides.js';
import { marketCountrySlug } from '../../src/features/market-pages/utils/marketCountries.js';
import { SITE_URL, SITE_NAME } from './page-shell.mjs';

const url = (path) => `${SITE_URL}/en${path === '/' ? '' : path}`;
const slugOf = (guide) => marketCountrySlug(guide.country) ?? guide.slug;
const byName = [...COUNTRY_GUIDES].sort((a, b) => a.country.localeCompare(b.country));
const COUNTRY_LIST = byName.map((g) => g.country).join(', ');

const INTRO = `# ${SITE_NAME}

> ${SITE_NAME} (also written BalkanEstate AI, or BalkanEstate) is an online property marketplace for ten Balkan countries: ${COUNTRY_LIST}. Owners, agents and agencies list apartments, houses, land and commercial property for sale and for rent, and buyers contact them directly. The site is available in ten languages.

- Website: ${SITE_URL}
- Operated by: BalkanEstate AI DOOEL
- Languages (URL prefix): English (/en), Albanian (/sq), Serbian (/sr), Macedonian (/mk), Bosnian (/bs), Croatian (/hr), Montenegrin (/me), Bulgarian (/bg), Romanian (/ro), Greek (/el)
- Prices: the country and city pages show the asking prices of the live listings (median, typical range, price per m²), updated as listings change. They are asking prices, not sale prices or valuations.
- Country facts (per country in llms-full.txt, and in the buying guides) come from the site's buying guides, last reviewed ${GUIDES_LAST_UPDATED}; each guide links to the official registries. They are general information, not legal or tax advice.`;

const countrySection = (deal) => {
  const segment = deal === 'rent' ? '/property-for-rent' : '/property-for-sale';
  const words = deal === 'rent' ? 'Property for rent in' : 'Property for sale in';
  const what = deal === 'rent'
    ? 'live rentals, median monthly rent and rent per m², and the cities with listings'
    : 'live listings, median asking price, price per m², and the cities with listings';
  return byName.map((g) => `- [${words} ${g.country}](${url(`${segment}/${slugOf(g)}`)}): ${what}`).join('\n');
};

const TOOLS = `## Search and tools

- [Property for sale by country](${url('/property-for-sale')}): every country with its listings and biggest cities
- [Property for rent by country](${url('/property-for-rent')}): the same for rentals
- [Map search, for sale](${url('/search')}): filter by country, city, price, size and rooms, or describe the home in plain language
- [Map search, for rent](${url('/rentals')})
- [City pages](${url('/explore-cities')}): price history, districts and economic indicators per city
- [Mortgage calculator](${url('/mortgage-calculator')}): monthly repayment, total interest, rent versus buy
- [Property price estimate](${url('/valuation')}): an automated indication from comparable listings, not a professional valuation
- [Real estate agents](${url('/agents')}) and [agencies](${url('/agencies')})
- [Blog](${url('/blog')})`;

const ABOUT = `## About and contact

- [About ${SITE_NAME}](${url('/about')}): who operates the site, where listings come from (owners, agents, agencies; imported listings show their source) and how to report a listing
- [How it works](${url('/how-it-works')})
- [Contact](${url('/contact')}): info@balkanestateai.com, support@balkanestateai.com`;

export function buildLlmsTxt() {
  return `${INTRO}

## Property for sale by country

${countrySection('sale')}

## Property for rent by country

${countrySection('rent')}

## Buying guides (how to buy property, by country)

${byName.map((g) => `- [How to buy property in ${g.country}](${url(`/guides/${g.slug}`)}): who can buy, taxes, residency and the legal steps, with official sources`).join('\n')}

${TOOLS}

${ABOUT}

## Optional

- [Full version, with each country's buying facts](${SITE_URL}/llms-full.txt)
`;
}

const countryFacts = (g) => `## ${g.country}

- Property for sale: ${url(`/property-for-sale/${slugOf(g)}`)}
- Property for rent: ${url(`/property-for-rent/${slugOf(g)}`)}
- Buying guide: ${url(`/guides/${g.slug}`)}
- Can foreigners buy: ${g.foreignBuy}
- Annual property tax: ${g.tax}
- Transfer tax: ${g.transferTax}
- Residency: ${g.residency}
- Main cities: ${g.topCities.join(', ')}

Key points:
${g.highlights.map((h) => `- ${h}`).join('\n')}

Buying process:
${g.legalProcess.map((step, i) => `${i + 1}. ${step}`).join('\n')}

Check before you buy:
${g.cautions.map((c) => `- ${c}`).join('\n')}

Official sources:
${g.sources.map((src) => `- ${src.name}${src.url ? `: ${src.url}` : ''}`).join('\n')}`;

export function buildLlmsFullTxt() {
  return `${INTRO}

${byName.map(countryFacts).join('\n\n')}

${TOOLS}

${ABOUT}

## Frequently asked questions

### Which countries does ${SITE_NAME} cover?

${COUNTRY_LIST}. Each country has a page for property for sale, a page for property for rent and a buying guide, linked above.

### Where do the prices on ${SITE_NAME} come from?

From the live listings: each country and city page shows the median asking price, the typical range (10th to 90th percentile) and the median price per m² of the listings on the site at that moment. They are asking prices, not completed sales or valuations.

### Where do the listings come from?

Owners, agents and agencies with an account publish them. Some listings are imported from agency feeds or other websites and show their original source. The site does not inspect properties; every listing page has a link to report it.

### Can foreigners buy property in the Balkans?

It depends on the country; see "Can foreigners buy" under each country above, and the buying guide it links to. Confirm the current rules with a licensed local lawyer or notary.
`;
}
