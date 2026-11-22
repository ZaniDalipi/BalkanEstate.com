/**
 * Crawler HTML for /:lang/property-prices — the price table as real HTML
 * tables, with its method, citation, CSV link and Dataset JSON-LD — built
 * from the same API response and text helpers as the React page.
 */
import { ROBOTS_INDEX, ROBOTS_NOINDEX, buildHead, escapeHtml, pageUrl } from '../scripts/lib/page-shell.mjs';
import {
  API_BASE,
  SITE_NAME,
  breadcrumb,
  fetchApi,
  isCrawler,
  passThrough,
  respond,
  siteLinks,
  type PagesContext,
  type RenderedPage,
} from './_og-utils';
import { marketTranslator } from './_market-i18n';
import type { PriceTable, PriceTableRow } from '../src/features/market-pages/types';
import { marketPath } from '../src/features/market-pages/utils/marketRoutes';
import { countryLabel, formatCount, formatDate, marketHeading } from '../src/features/market-pages/utils/marketPageText';
import {
  PRICES_CSV_URL,
  PRICES_PATH,
  priceCell,
  priceColumns,
  priceDatasetJsonLd,
  priceHeadText,
  priceMethod,
} from '../src/features/market-pages/utils/priceTableText';

const link = (lang: string, path: string, text: string): string =>
  `<a href="${escapeHtml(pageUrl(lang, path))}">${escapeHtml(text)}</a>`;

export function buildPricesPage(table: PriceTable, lang: string): RenderedPage {
  const t = marketTranslator(lang);
  const head = priceHeadText(t, lang, table.generatedAt);
  const columns = priceColumns(t);
  const crumbs = breadcrumb(lang, [{ name: t('marketPages:prices.crumb', { defaultValue: 'Property prices' }) }]);
  const hasFigures = table.countries.some((c) => c.sale.priceMedian !== null || c.rent.priceMedian !== null);

  const cells = (place: PriceTableRow) => columns
    .map((column) => {
      const value = column.value(place);
      return `<td>${escapeHtml(column.count ? formatCount(value ?? 0, lang) : priceCell(value, lang))}</td>`;
    })
    .join('');

  const tables = table.countries.map((country) => {
    const name = countryLabel(t, country);
    return `<section>
        <h2>${link(lang, marketPath('sale', country.slug), name)}</h2>
        <table>
          <thead>
            <tr><th scope="col" rowspan="2">${escapeHtml(t('marketPages:prices.place', { defaultValue: 'Place' }))}</th>
              <th scope="colgroup" colspan="3">${escapeHtml(t('marketPages:switch.sale', { defaultValue: 'For sale' }))}</th>
              <th scope="colgroup" colspan="3">${escapeHtml(t('marketPages:switch.rent', { defaultValue: 'For rent' }))}</th></tr>
            <tr>${columns.map((c) => `<th scope="col">${escapeHtml(c.label)}</th>`).join('')}</tr>
          </thead>
          <tbody>
            <tr><th scope="row">${escapeHtml(t('marketPages:prices.wholeCountry', { defaultValue: 'Whole country' }))}</th>${cells(country)}</tr>
            ${country.cities.map((city) => `<tr><th scope="row">${link(lang, marketPath('sale', country.slug, city.slug), city.name)}</th>${cells(city)}</tr>`).join('')}
          </tbody>
        </table>
      </section>`;
  }).join('');

  const body = `<main id="prerendered-content">
      ${crumbs.html}
      <h1>${escapeHtml(head.heading)}</h1>
      <p>${escapeHtml(head.intro)}</p>
      <p>${escapeHtml(t('marketPages:prices.notEnough', { min: table.minSample, defaultValue: '“–” means fewer than {{min}} listings with a price' }))}</p>
      ${tables}
      <section>
        <h2>${escapeHtml(t('marketPages:prices.methodTitle', { defaultValue: 'How the figures are calculated' }))}</h2>
        <ul>${priceMethod(t, table.minSample).map((p) => `<li>${escapeHtml(p)}</li>`).join('')}</ul>
      </section>
      <section>
        <h2>${escapeHtml(t('marketPages:prices.citeTitle', { defaultValue: 'Using these figures' }))}</h2>
        <p>${escapeHtml(t('marketPages:prices.cite', {
          date: formatDate(table.generatedAt, lang),
          defaultValue: 'You are welcome to quote them. Please cite “BalkanEstateAI, Property prices in the Balkans, {{date}}” with a link to this page.',
        }))}</p>
        <p><a href="${escapeHtml(PRICES_CSV_URL)}">${escapeHtml(t('marketPages:prices.download', { defaultValue: 'Download the table (CSV)' }))}</a></p>
      </section>
      <p>${link(lang, marketPath('sale'), marketHeading(t, 'sale', {}))} · ${link(lang, marketPath('rent'), marketHeading(t, 'rent', {}))}</p>
      ${siteLinks(lang)}
    </main>`;

  return {
    lang,
    head: buildHead({
      lang,
      path: PRICES_PATH,
      title: `${head.title} | ${SITE_NAME}`,
      description: head.description,
      robots: hasFigures ? ROBOTS_INDEX : ROBOTS_NOINDEX,
      alternates: hasFigures,
      jsonLd: [crumbs.jsonLd, priceDatasetJsonLd(lang, table, head)],
    }),
    body,
  };
}

/** Serve /:lang/property-prices to a crawler; people (and API failures) get the app. */
export async function handlePricesRequest(context: PagesContext, lang: string): Promise<Response> {
  if (!isCrawler(context.request.headers.get('user-agent') || '')) return passThrough(context);
  const result = await fetchApi<PriceTable>(`${API_BASE}/market-prices`);
  if (result.status !== 'ok' || !Array.isArray(result.data?.countries)) return passThrough(context);
  return respond(context, buildPricesPage(result.data, lang));
}
