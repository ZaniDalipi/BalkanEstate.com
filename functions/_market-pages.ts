/**
 * Crawler HTML for the market landing pages:
 *
 *   /:lang/property-for-sale[/:country[/:city]]
 *   /:lang/property-for-rent[/:country[/:city]]
 *
 * Search engines and AI crawlers (which do not run JavaScript) get the page
 * the app would render — heading, figures, listings, city links, buying-guide
 * link — with its title, canonical, hreflang and JSON-LD, from the same API
 * response and the same text builders (src/features/market-pages/utils) the
 * React page uses. People get the SPA untouched.
 *
 * A page with too few of our own listings is served `noindex` and is left out
 * of the sitemap; an unknown country or a city with no listings is a 404 that
 * links to the next best page.
 */
import { LANGUAGES, ROBOTS_INDEX, ROBOTS_NOINDEX, buildHead, escapeHtml, pageUrl } from '../scripts/lib/page-shell.mjs';
import {
  API_BASE,
  SITE_NAME,
  breadcrumb,
  configureOgMedia,
  contentImage,
  fetchApi,
  isCrawler,
  passThrough,
  respond,
  siteLinks,
  type PagesContext,
  type RenderedPage,
} from './_og-utils';
import { marketTranslator } from './_market-i18n';
import { COUNTRY_GUIDES } from '../src/features/guides/data/countryGuides.js';
import type {
  MarketDeal,
  MarketHub,
  MarketListingRow,
  MarketPageData,
  MarketPlaceSummary,
} from '../src/features/market-pages/types';
import { isMarketCountrySlug, isMarketSlug, marketPath, otherDeal } from '../src/features/market-pages/utils/marketRoutes';
import { listingPath, marketCollectionJsonLd } from '../src/features/market-pages/utils/marketJsonLd';
import {
  countryLabel,
  formatDate,
  formatEuro,
  marketFacts,
  marketHeadText,
  marketIntro,
  placeLabel,
  typeLabel,
  type Translate,
} from '../src/features/market-pages/utils/marketPageText';

/** Guides are written in English and canonical under /en. */
const GUIDE_LANG = 'en';

const link = (lang: string, path: string, text: string): string =>
  `<a href="${escapeHtml(pageUrl(lang, path))}">${escapeHtml(text)}</a>`;

const searchPath = (deal: MarketDeal, query: Record<string, string>): string =>
  `${deal === 'rent' ? '/rentals' : '/search'}?${new URLSearchParams(query).toString()}`;

/** The country's buying guide, by the country name the guides use. */
const guideFor = (countryName: string) => COUNTRY_GUIDES.find((g) => g.country === countryName);

function listingItem(lang: string, listing: MarketListingRow): string {
  const path = listingPath(listing);
  if (!path) return '';
  const title = listing.title?.trim() || [listing.propertyType, listing.city].filter(Boolean).join(' – ') || SITE_NAME;
  const facts = [
    typeof listing.price === 'number' && listing.price > 0 && !listing.isNegotiable ? formatEuro(listing.price, lang) : '',
    typeof listing.sqft === 'number' && listing.sqft > 0 ? `${listing.sqft} m²` : '',
    listing.city ?? '',
  ].filter(Boolean);
  const src = contentImage(listing.images?.[0]?.url || listing.imageUrl, 400);
  return `<li>${src ? `<img src="${escapeHtml(src)}" alt="${escapeHtml(title)}" width="400" loading="lazy" />` : ''}${link(
    lang,
    path,
    title,
  )}${facts.length ? ` — ${escapeHtml(facts.join(' · '))}` : ''}</li>`;
}

function placeLinks(lang: string, deal: MarketDeal, countrySlug: string, places: MarketPlaceSummary[]): string {
  return `<ul>${places
    .map((p) => `<li>${link(lang, marketPath(deal, countrySlug, p.slug), p.name)} (${p.count})</li>`)
    .join('')}</ul>`;
}

function statsSection(t: Translate, lang: string, deal: MarketDeal, page: Pick<MarketPageData, 'stats' | 'generatedAt'>): string {
  const facts = marketFacts(t, lang, deal, page.stats);
  const types = page.stats.typeCounts.slice(0, 8);
  return `<section>
        <h2>${escapeHtml(t('marketPages:stats.title', { defaultValue: 'At a glance' }))}</h2>
        <dl>${facts.map((f) => `<dt>${escapeHtml(f.label)}</dt><dd>${escapeHtml(f.value)}</dd>`).join('')}</dl>
        ${page.stats.priceMedian === null && page.stats.listingCount > 0
          ? `<p>${escapeHtml(t('marketPages:stats.none', { defaultValue: 'Not enough priced listings yet' }))}</p>`
          : ''}
        ${types.length
          ? `<h3>${escapeHtml(t('marketPages:stats.types', { defaultValue: 'Property types' }))}</h3><ul>${types
              .map((ty) => `<li>${escapeHtml(typeLabel(t, ty.type))}: ${ty.count}</li>`)
              .join('')}</ul>`
          : ''}
        <p>${escapeHtml(t('marketPages:stats.note', {
          date: formatDate(page.generatedAt, lang),
          defaultValue: 'Asking prices of live listings on {{date}}, not sale prices or valuations.',
        }))}</p>
      </section>`;
}

/** One country or city page. */
export function buildMarketPlacePage(page: MarketPageData, lang: string): RenderedPage {
  const t = marketTranslator(lang);
  const { deal, country, city } = page;
  const place = { country, city };
  const path = marketPath(deal, country.slug, city?.slug);
  const head = marketHeadText(t, lang, deal, place, page.stats);
  const countryText = countryLabel(t, country);
  const guide = guideFor(country.name);

  const crumbs = breadcrumb(lang, [
    { name: t(`marketPages:switch.${deal}`, { defaultValue: deal === 'sale' ? 'For sale' : 'For rent' }), path: marketPath(deal) },
    ...(city ? [{ name: countryText, path: marketPath(deal, country.slug) }] : []),
    { name: city ? city.name : countryText },
  ]);

  const listings = page.listings.map((l) => listingItem(lang, l)).filter(Boolean);
  const citiesHeading = city
    ? t('marketPages:cities.other', { country: countryText, defaultValue: 'Other cities in {{country}}' })
    : t('marketPages:cities.country', { country: countryText, defaultValue: 'Cities in {{country}}' });
  const searchQuery: Record<string, string> = { country: country.name, ...(city ? { city: city.name } : {}) };

  const body = `<main id="prerendered-content">
      ${crumbs.html}
      <h1>${escapeHtml(head.heading)}</h1>
      <p>${escapeHtml(marketIntro(t, deal, place))}</p>
      <p>${link(lang, marketPath(otherDeal(deal), country.slug, city?.slug), t(`marketPages:switch.${otherDeal(deal)}`, {
        defaultValue: deal === 'sale' ? 'For rent' : 'For sale',
      }))}</p>
      ${statsSection(t, lang, deal, page)}
      <section>
        <h2>${escapeHtml(t('marketPages:listings.title', { defaultValue: 'Latest listings' }))}</h2>
        ${listings.length
          ? `<ul>${listings.join('')}</ul>`
          : `<p>${escapeHtml(t('marketPages:empty.title', { defaultValue: 'No listings here yet' }))}</p>`}
        <p>${link(lang, searchPath(deal, searchQuery), t(`marketPages:listings.viewAll.${deal}`, {
          place: placeLabel(t, place),
          defaultValue: deal === 'sale' ? 'See every property for sale in {{place}} on the map' : 'See every property for rent in {{place}} on the map',
        }))}</p>
      </section>
      ${page.cities.length ? `<section><h2>${escapeHtml(citiesHeading)}</h2>${placeLinks(lang, deal, country.slug, page.cities)}</section>` : ''}
      ${guide ? `<p>${link(GUIDE_LANG, `/guides/${guide.slug}`, t('marketPages:guide.link', {
        country: countryText,
        defaultValue: "How to buy property in {{country}} – buyer's guide (English)",
      }))}</p>` : ''}
      ${siteLinks(lang)}
    </main>`;

  return {
    lang,
    head: buildHead({
      lang,
      path,
      title: `${head.title} | ${SITE_NAME}`,
      description: head.description,
      robots: page.indexable ? ROBOTS_INDEX : ROBOTS_NOINDEX,
      alternates: page.indexable,
      jsonLd: [crumbs.jsonLd, marketCollectionJsonLd({ lang, path, name: head.heading, description: head.description, listings: page.listings, total: page.stats.listingCount })],
    }),
    body,
  };
}

/** The overview: every country with its biggest cities. */
export function buildMarketHubPage(hub: MarketHub, lang: string): RenderedPage {
  const t = marketTranslator(lang);
  const { deal } = hub;
  const path = marketPath(deal);
  const head = marketHeadText(t, lang, deal, {}, null);
  const indexable = hub.countries.some((c) => c.indexable);
  const crumbs = breadcrumb(lang, [{ name: t(`marketPages:switch.${deal}`, { defaultValue: deal === 'sale' ? 'For sale' : 'For rent' }) }]);
  const countLabel = (count: number) => t('marketPages:countries.count', { count, defaultValue: 'Listings: {{count}}' });

  const countries = [...hub.countries]
    .sort((a, b) => b.count - a.count)
    .map((c) => `<li>
          <h3>${link(lang, marketPath(deal, c.slug), countryLabel(t, c))}</h3>
          <p>${escapeHtml(countLabel(c.count))}</p>
          ${c.cities.length ? placeLinks(lang, deal, c.slug, c.cities) : ''}
        </li>`)
    .join('');

  const body = `<main id="prerendered-content">
      ${crumbs.html}
      <h1>${escapeHtml(head.heading)}</h1>
      <p>${escapeHtml(marketIntro(t, deal, {}))}</p>
      <p>${link(lang, marketPath(otherDeal(deal)), t(`marketPages:switch.${otherDeal(deal)}`, { defaultValue: deal === 'sale' ? 'For rent' : 'For sale' }))}</p>
      <section>
        <h2>${escapeHtml(t('marketPages:countries.title', { defaultValue: 'Countries' }))}</h2>
        <ul>${countries}</ul>
      </section>
      ${siteLinks(lang)}
    </main>`;

  return {
    lang,
    head: buildHead({
      lang,
      path,
      title: `${head.title} | ${SITE_NAME}`,
      description: head.description,
      robots: indexable ? ROBOTS_INDEX : ROBOTS_NOINDEX,
      alternates: indexable,
      jsonLd: [crumbs.jsonLd],
    }),
    body,
  };
}

/**
 * 404 for a country we do not cover, a malformed URL, or a city with no
 * listings — with a link to the next best page instead of a dead end: the
 * country's page for a city, the overview otherwise.
 */
export function marketNotFoundPage(lang: string, deal: MarketDeal, cityOfCountry?: string): RenderedPage {
  const t = marketTranslator(lang);
  const country = cityOfCountry && isMarketCountrySlug(cityOfCountry) ? cityOfCountry : undefined;
  const title = country
    ? t('marketPages:notFound.title', { defaultValue: 'No listings in this city right now' })
    : t('marketPages:notFound.page', { defaultValue: 'This page does not exist' });
  const back = country
    ? link(lang, marketPath(deal, country), t('marketPages:notFound.country', {
      country: countryLabel(t, { slug: country, name: country }),
      defaultValue: 'Property in {{country}}',
    }))
    : link(lang, marketPath(deal), marketHeadText(t, lang, deal, {}, null).heading);
  return {
    lang,
    status: 404,
    head: buildHead({ lang, title: `${title} | ${SITE_NAME}`, description: title, robots: 'noindex' }),
    body: `<main id="prerendered-content">
      <h1>${escapeHtml(title)}</h1>
      ${country ? `<p>${escapeHtml(t('marketPages:notFound.body', {
        defaultValue: 'We have no live listings in this city at the moment. Here are the listings across the rest of the country.',
      }))}</p>` : ''}
      <p>${back}</p>
      ${siteLinks(lang)}
    </main>`,
  };
}

const safeDecode = (segment: string): string => {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
};

export const isMarketLang = (lang: string): boolean => (LANGUAGES as readonly string[]).includes(lang);

/**
 * Serve /:lang/property-for-{sale|rent}/… to a crawler.
 * `segments` are the path parts after the deal segment.
 */
export async function handleMarketRequest(
  context: PagesContext,
  deal: MarketDeal,
  lang: string,
  segments: readonly string[],
): Promise<Response> {
  configureOgMedia(context.env);
  if (!isCrawler(context.request.headers.get('user-agent') || '')) return passThrough(context);

  const [country, city, ...extra] = segments.map((s) => safeDecode(s).trim().toLowerCase());
  if (extra.length > 0 || (country !== undefined && !isMarketSlug(country)) || (city !== undefined && !isMarketSlug(city))) {
    return respond(context, marketNotFoundPage(lang, deal));
  }

  if (!country) {
    const hub = await fetchApi<MarketHub>(`${API_BASE}/market-pages/${deal}`);
    if (hub.status !== 'ok') return passThrough(context);
    return respond(context, buildMarketHubPage(hub.data, lang));
  }

  const apiPath = [deal, country, city].filter(Boolean).map((s) => encodeURIComponent(s as string)).join('/');
  const result = await fetchApi<MarketPageData>(`${API_BASE}/market-pages/${apiPath}`);
  if (result.status === 'not-found') return respond(context, marketNotFoundPage(lang, deal, city ? country : undefined));
  if (result.status === 'error' || !result.data?.country) return passThrough(context);
  return respond(context, buildMarketPlacePage(result.data, lang));
}
