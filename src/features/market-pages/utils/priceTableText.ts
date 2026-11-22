/**
 * Words, cells and JSON-LD of the "Property prices in the Balkans" page,
 * shared by the React page and the crawler HTML (relative imports only, like
 * marketPageText.ts).
 */
import type { PriceFigures, PriceTable } from '../types';
import { formatDate, formatEuro, type Translate } from './marketPageText';
import { MARKET_SITE_URL, siteUrl } from './marketJsonLd';

/** Language-less path of the page, and where its CSV is served on the site's own host. */
export const PRICES_PATH = '/property-prices';
export const PRICES_CSV_URL = `${MARKET_SITE_URL}/property-prices.csv`;

/** "€1,450", or "–" when too few listings back the figure. */
export const priceCell = (value: number | null, lang: string): string => (value === null ? '–' : formatEuro(value, lang));

export interface PriceColumn {
  key: string;
  label: string;
  value: (figures: { sale: PriceFigures; rent: PriceFigures }) => number | null;
  /** Counts are plain numbers, not euros. */
  count?: boolean;
}

/** The table's columns, sale then rent, in the reader's language. */
export const priceColumns = (t: Translate): PriceColumn[] => [
  { key: 'saleListings', label: t('marketPages:prices.listings', { defaultValue: 'Listings' }), value: (f) => f.sale.listingCount, count: true },
  { key: 'saleMedian', label: t('marketPages:prices.medianPrice', { defaultValue: 'Median price' }), value: (f) => f.sale.priceMedian },
  { key: 'salePerSqm', label: t('marketPages:prices.perSqm', { defaultValue: 'Price per m²' }), value: (f) => f.sale.pricePerSqmMedian },
  { key: 'rentListings', label: t('marketPages:prices.listings', { defaultValue: 'Listings' }), value: (f) => f.rent.listingCount, count: true },
  { key: 'rentMedian', label: t('marketPages:prices.medianRent', { defaultValue: 'Median rent / month' }), value: (f) => f.rent.priceMedian },
  { key: 'rentPerSqm', label: t('marketPages:prices.rentPerSqm', { defaultValue: 'Rent per m²' }), value: (f) => f.rent.pricePerSqmMedian },
];

export interface PriceHeadText {
  heading: string;
  /** Without the site name. */
  title: string;
  intro: string;
  description: string;
}

export const priceHeadText = (t: Translate, lang: string, generatedAt: string): PriceHeadText => {
  const date = formatDate(generatedAt, lang);
  const intro = t('marketPages:prices.intro', {
    date,
    defaultValue: 'Median asking prices and rents of the live listings on BalkanEstateAI, by country and city, as of {{date}}.',
  });
  return {
    heading: t('marketPages:prices.heading', { defaultValue: 'Property prices in the Balkans' }),
    title: t('marketPages:prices.seoTitle', { defaultValue: 'Property Prices in the Balkans – Price per m² by Country and City' }),
    intro,
    description: `${intro} ${t('marketPages:prices.metaTail', {
      defaultValue: 'Price per m², median asking price and median monthly rent for ten countries, with the method and a CSV download.',
    })}`,
  };
};

/** The method, as four plain statements. */
export const priceMethod = (t: Translate, minSample: number): string[] => [
  t('marketPages:prices.method1', { defaultValue: 'Asking prices of the listings live on BalkanEstateAI on the date above — not completed sales, valuations or official statistics.' }),
  t('marketPages:prices.method2', { defaultValue: 'Each figure is a median: half of the listings ask more, half ask less.' }),
  t('marketPages:prices.method3', { defaultValue: 'Price per m² uses listings that state an area of at least 15 m². Weekly rents are converted to monthly; nightly stays are left out.' }),
  t('marketPages:prices.method4', { min: minSample, defaultValue: 'A figure is shown only when at least {{min}} listings back it.' }),
];

/**
 * schema.org Dataset: what Google Dataset Search and answer engines read to
 * know the table is data, who publishes it, when, and where the CSV is.
 */
export const priceDatasetJsonLd = (lang: string, table: PriceTable, head: PriceHeadText) => ({
  '@context': 'https://schema.org',
  '@type': 'Dataset',
  '@id': `${siteUrl(lang, PRICES_PATH)}#dataset`,
  name: head.heading,
  description: head.description,
  url: siteUrl(lang, PRICES_PATH),
  inLanguage: lang === 'me' ? 'sr-ME' : lang,
  isAccessibleForFree: true,
  dateModified: table.generatedAt,
  temporalCoverage: table.generatedAt.slice(0, 10),
  creator: { '@type': 'Organization', '@id': `${MARKET_SITE_URL}/#organization`, name: 'BalkanEstateAI', url: MARKET_SITE_URL },
  spatialCoverage: table.countries.map((c) => ({ '@type': 'Country', name: c.name })),
  variableMeasured: [
    'Median asking price (EUR)',
    'Median asking price per square metre (EUR)',
    'Median monthly asking rent (EUR)',
    'Median monthly asking rent per square metre (EUR)',
    'Number of live listings',
  ],
  measurementTechnique: 'Median of asking prices of live listings; price per m² from listings stating at least 15 m²',
  distribution: [{ '@type': 'DataDownload', encodingFormat: 'text/csv', contentUrl: PRICES_CSV_URL }],
});
