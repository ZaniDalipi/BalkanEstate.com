/**
 * The words and figures of a market landing page — heading, page title, meta
 * description, the "at a glance" facts — built once for both the React page
 * and the HTML the Pages Function serves to crawlers, so the two never say
 * different things.
 *
 * Takes a translator instead of importing i18next: in the app it is i18next's
 * `t`, in the Pages Function a lookup over the same locale files. Relative
 * imports only (see marketRoutes.ts).
 */
import type { MarketCountryRef, MarketDeal, MarketStats } from '../types';
import { countryNameKey } from './marketRoutes';

export type TranslateOptions = { defaultValue?: string } & Record<string, string | number | undefined>;
export type Translate = (key: string, options?: TranslateOptions) => string;

/** Number and date formatting locale for each URL language ("me" is not a locale). */
const INTL_LOCALE: Record<string, string> = {
  en: 'en-US', sq: 'sq-AL', sr: 'sr-Cyrl-RS', mk: 'mk-MK', bs: 'bs-Latn-BA',
  hr: 'hr-HR', bg: 'bg-BG', ro: 'ro-RO', el: 'el-GR', me: 'sr-Latn-ME',
};

export const intlLocale = (lang: string): string => INTL_LOCALE[lang] ?? 'en-US';

/** "€120,000" in the reader's number format; small figures (rent per m²) keep one decimal. */
export const formatEuro = (value: number, lang: string): string =>
  new Intl.NumberFormat(intlLocale(lang), {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: Math.abs(value) < 100 ? 1 : 0,
  }).format(value);

export const formatCount = (value: number, lang: string): string =>
  new Intl.NumberFormat(intlLocale(lang)).format(value);

/** A date as the reader writes it, or '' for a value that is not a date. */
export const formatDate = (iso: string, lang: string): string => {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '' : new Intl.DateTimeFormat(intlLocale(lang), { dateStyle: 'long' }).format(date);
};

export const countryLabel = (t: Translate, country: Pick<MarketCountryRef, 'slug' | 'name'>): string =>
  t(`common:countries.${countryNameKey(country.slug)}`, { defaultValue: country.name });

export interface MarketPlace {
  country?: Pick<MarketCountryRef, 'slug' | 'name'> | null;
  city?: { name: string } | null;
}

/** "Tirana, Albania", "Albania", or "the Balkans" for the overview. */
export const placeLabel = (t: Translate, place: MarketPlace): string => {
  if (!place.country) return t('marketPages:theBalkans', { defaultValue: 'the Balkans' });
  const country = countryLabel(t, place.country);
  return place.city ? `${place.city.name}, ${country}` : country;
};

const HEADING_DEFAULT: Record<MarketDeal, string> = {
  sale: 'Property for sale in {{place}}',
  rent: 'Property for rent in {{place}}',
};
const SEO_TITLE_DEFAULT: Record<MarketDeal, string> = {
  sale: 'Property for Sale in {{place}} – Prices and Listings',
  rent: 'Property for Rent in {{place}} – Rents and Listings',
};
const HUB_INTRO_DEFAULT: Record<MarketDeal, string> = {
  sale: 'Homes, land and commercial property for sale in ten countries, by country and city. Figures are asking prices of the live listings on BalkanEstateAI.',
  rent: 'Homes and commercial property for rent in ten countries, by country and city. Figures are asking rents of the live listings on BalkanEstateAI.',
};
const PLACE_INTRO_DEFAULT: Record<MarketDeal, string> = {
  sale: "Apartments, houses, villas and land for sale in {{place}}, with photos, floor plans and the seller's contact.",
  rent: "Apartments and houses for rent in {{place}}, with photos, the monthly rent and the owner's or agent's contact.",
};

export const marketHeading = (t: Translate, deal: MarketDeal, place: MarketPlace): string =>
  t(`marketPages:heading.${deal}`, { place: placeLabel(t, place), defaultValue: HEADING_DEFAULT[deal] });

export const marketIntro = (t: Translate, deal: MarketDeal, place: MarketPlace): string =>
  place.country
    ? t(`marketPages:intro.place.${deal}`, { place: placeLabel(t, place), defaultValue: PLACE_INTRO_DEFAULT[deal] })
    : t(`marketPages:intro.hub.${deal}`, { defaultValue: HUB_INTRO_DEFAULT[deal] });

export interface MarketFact {
  key: 'listings' | 'median' | 'range' | 'perSqm';
  label: string;
  value: string;
}

/** The "at a glance" figures; price figures only when the API had enough prices. */
export const marketFacts = (t: Translate, lang: string, deal: MarketDeal, stats: MarketStats): MarketFact[] => {
  const facts: MarketFact[] = [
    {
      key: 'listings',
      label: t('marketPages:stats.listings', { defaultValue: 'Live listings' }),
      value: formatCount(stats.listingCount, lang),
    },
  ];
  if (stats.priceMedian !== null) {
    facts.push({
      key: 'median',
      label: t(`marketPages:stats.median.${deal}`, { defaultValue: deal === 'sale' ? 'Median asking price' : 'Median monthly rent' }),
      value: formatEuro(stats.priceMedian, lang),
    });
  }
  if (stats.priceLow !== null && stats.priceHigh !== null) {
    facts.push({
      key: 'range',
      label: t(`marketPages:stats.range.${deal}`, { defaultValue: deal === 'sale' ? 'Typical price range' : 'Typical rent range' }),
      value: `${formatEuro(stats.priceLow, lang)} – ${formatEuro(stats.priceHigh, lang)}`,
    });
  }
  if (stats.pricePerSqmMedian !== null) {
    facts.push({
      key: 'perSqm',
      label: t(`marketPages:stats.perSqm.${deal}`, { defaultValue: deal === 'sale' ? 'Median price per m²' : 'Median rent per m²' }),
      value: formatEuro(stats.pricePerSqmMedian, lang),
    });
  }
  return facts;
};

/** "Apartment", "Land" … in the reader's language; unknown types get a readable form of their key. */
export const typeLabel = (t: Translate, type: string): string => {
  if (type === 'other') return t('marketPages:typesOther', { defaultValue: 'Other' });
  const readable = type.charAt(0).toUpperCase() + type.slice(1).replace(/[-_]+/g, ' ');
  return t(`common:propertyTypes.${type}`, { defaultValue: readable });
};

/** Cut text at a word boundary. */
const truncate = (text: string, max: number): string => {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const space = cut.lastIndexOf(' ');
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).trim()}…`;
};

export interface MarketHeadText {
  heading: string;
  /** Page title without the site name (the <title> adds " | BalkanEstateAI"). */
  title: string;
  description: string;
}

/**
 * Heading, title and meta description. The description leads with the
 * figures a searcher compares ("Live listings: 42 · Median asking price:
 * €120,000") — label/value pairs, so no language needs plural forms.
 */
export const marketHeadText = (
  t: Translate,
  lang: string,
  deal: MarketDeal,
  place: MarketPlace,
  stats: MarketStats | null,
): MarketHeadText => {
  const placeText = placeLabel(t, place);
  const heading = marketHeading(t, deal, place);
  const title = t(`marketPages:seoTitle.${deal}`, { place: placeText, defaultValue: SEO_TITLE_DEFAULT[deal] });
  const facts = stats ? marketFacts(t, lang, deal, stats).filter((f) => f.key !== 'range') : [];
  const figures = facts.map((f) => `${f.label}: ${f.value}`).join(' · ');
  const description = truncate([figures && `${heading}. ${figures}.`, marketIntro(t, deal, place)].filter(Boolean).join(' '), 300);
  return { heading, title, description };
};
