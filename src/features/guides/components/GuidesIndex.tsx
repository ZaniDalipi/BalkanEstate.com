import React, { useId, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { SEO } from '@/src/components/seo';
import { AdSlot } from '@/src/features/promo';
import { navigate, localizePath } from '@/src/app/router/navigation';
import { paths } from '@/src/app/router/paths';
import { AcademicCapIcon, MagnifyingGlassIcon, XMarkIcon, GlobeAltIcon, CurrencyEuroIcon, ArrowTrendingUpIcon } from '@/constants';
import { COUNTRY_GUIDES } from '../data/countryGuides';
import type { GuideSort } from '../types/guide.types';
import { filterGuides, formatEuro, formatPercent, parseGuideSort, sortGuides } from '../utils/guideSelectors';
import { GuideCard } from './GuideCard';
import { GuideComparisonTable } from './GuideComparisonTable';
import { GuideDisclaimer } from './GuideDisclaimer';
import { GuideCta } from './GuideCta';
import { useCountryName } from './useCountryName';

const MAX_QUERY_LENGTH = 200;
const PROCESS_STEPS = [1, 2, 3, 4, 5] as const;

/** `/guides` — every country, searchable and sortable, plus a comparison table. */
const GuidesIndex: React.FC = () => {
  const { t, i18n } = useTranslation('common');
  const countryName = useCountryName();
  const locale = i18n.language || 'en';
  const searchId = useId();
  const sortId = useId();
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<GuideSort>('name');

  const visible = useMemo(
    () => sortGuides(filterGuides(COUNTRY_GUIDES, query, countryName), sort, countryName),
    [query, sort, countryName],
  );
  const sortedForTable = useMemo(() => sortGuides(COUNTRY_GUIDES, sort, countryName), [sort, countryName]);

  const stats = useMemo(() => {
    const minPrice = Math.min(...COUNTRY_GUIDES.map((g) => g.avgPricePerSqm.min));
    const maxYield = Math.max(...COUNTRY_GUIDES.map((g) => g.rentalYield.max));
    return {
      minPrice: formatEuro(minPrice, locale),
      maxYield: formatPercent(maxYield, locale),
    };
  }, [locale]);

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://balkanestateai.com';

  return (
    <>
      <SEO
        title={t('common:guides.seoTitle', 'Property Buying Guides - How to Buy Real Estate in the Balkans')}
        description={t('common:guides.seoDescription', 'Complete guides to buying property in 10 Balkan countries. Legal process, foreign ownership rules, taxes, and investment insights for Montenegro, Albania, Serbia, Greece, and more.')}
        type="website"
      />
      <Helmet>
        <script type="application/ld+json">
          {JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'CollectionPage',
            name: t('common:guides.title', 'Property Buying Guides'),
            url: `${origin}${localizePath(paths.guides())}`,
            publisher: { '@type': 'Organization', name: 'BalkanEstateAI' },
            mainEntity: {
              '@type': 'ItemList',
              numberOfItems: COUNTRY_GUIDES.length,
              itemListElement: COUNTRY_GUIDES.map((guide, i) => ({
                '@type': 'ListItem',
                position: i + 1,
                url: `${origin}${localizePath(paths.guide(guide.slug))}`,
                name: t('common:guides.howToBuy', 'How to Buy Property in {{country}}', { country: countryName(guide) }),
              })),
            },
          })}
        </script>
      </Helmet>

      {/* Hero */}
      <header className="relative overflow-hidden bg-gradient-to-br from-primary-dark via-primary to-primary-dark text-white">
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/10 blur-3xl" aria-hidden="true" />
        <div className="absolute -bottom-32 -left-16 h-80 w-80 rounded-full bg-white/10 blur-3xl" aria-hidden="true" />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16 lg:py-20">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wider ring-1 ring-white/25">
            <AcademicCapIcon className="h-4 w-4" aria-hidden="true" />
            {t('common:guides.heroBadge', 'For foreign buyers')}
          </span>
          <h1 className="mt-4 text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight">
            {t('common:guides.title', 'Property Buying Guides')}
          </h1>
          <p className="mt-4 max-w-3xl text-base sm:text-lg text-white/80 leading-relaxed">
            {t('common:guides.subtitle', 'Everything you need to know about buying real estate in the Balkans. Legal requirements, taxes, foreign ownership rules, and investment insights for all 10 countries.')}
          </p>

          <dl className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-3xl">
            {[
              { icon: GlobeAltIcon, label: t('common:guides.statCountries', 'Countries covered'), value: String(COUNTRY_GUIDES.length) },
              { icon: CurrencyEuroIcon, label: t('common:guides.statPricesFrom', 'Prices from (per m²)'), value: stats.minPrice },
              { icon: ArrowTrendingUpIcon, label: t('common:guides.statYieldUpTo', 'Rental yields up to'), value: stats.maxYield },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-center gap-3 rounded-2xl bg-white/10 px-4 py-3 ring-1 ring-white/15 backdrop-blur-sm">
                <Icon className="h-6 w-6 flex-shrink-0 text-white/80" aria-hidden="true" />
                <div>
                  <dt className="text-xs text-white/80">{label}</dt>
                  <dd className="text-lg font-bold">{value}</dd>
                </div>
              </div>
            ))}
          </dl>
        </div>
      </header>

      <AdSlot page="guides" placement="in-content" className="max-w-6xl mx-auto px-4 sm:px-6 my-6" />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 pb-16">
        {/* Search + sort */}
        <section aria-labelledby="guides-list-heading" className="pt-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 id="guides-list-heading" className="text-2xl sm:text-3xl font-bold text-neutral-900">
                {t('common:guides.chooseCountry', 'Choose a country')}
              </h2>
              <p className="mt-1 text-sm text-neutral-500" aria-live="polite">
                {t('common:guides.resultsCount', 'Guides shown: {{count}}', { count: visible.length })}
              </p>
            </div>
            <form
              role="search"
              className="flex flex-col gap-3 sm:flex-row sm:items-end"
              onSubmit={(e) => e.preventDefault()}
            >
              <div className="relative sm:w-72">
                <label htmlFor={searchId} className="sr-only">
                  {t('common:guides.searchLabel', 'Search guides')}
                </label>
                <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-neutral-400" aria-hidden="true" />
                <input
                  id={searchId}
                  type="search"
                  value={query}
                  maxLength={MAX_QUERY_LENGTH}
                  onChange={(e) => setQuery(e.target.value.slice(0, MAX_QUERY_LENGTH))}
                  placeholder={t('common:guides.searchPlaceholder', 'Search by country or city…')}
                  className="w-full rounded-xl border border-neutral-300 bg-white py-2.5 pl-10 pr-10 text-sm shadow-sm placeholder:text-neutral-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                  autoComplete="off"
                  enterKeyHint="search"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
                    aria-label={t('common:guides.clearSearch', 'Clear search')}
                  >
                    <XMarkIcon className="h-4 w-4" aria-hidden="true" />
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <label htmlFor={sortId} className="text-sm font-medium text-neutral-600 whitespace-nowrap">
                  {t('common:guides.sortLabel', 'Sort by')}
                </label>
                <select
                  id={sortId}
                  value={sort}
                  onChange={(e) => setSort(parseGuideSort(e.target.value))}
                  className="w-full sm:w-auto rounded-xl border border-neutral-300 bg-white py-2.5 pl-3 pr-8 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="name">{t('common:guides.sortName', 'Name (A–Z)')}</option>
                  <option value="price-asc">{t('common:guides.sortPrice', 'Price (lowest first)')}</option>
                  <option value="yield-desc">{t('common:guides.sortYield', 'Rental yield (highest first)')}</option>
                </select>
              </div>
            </form>
          </div>

          {visible.length > 0 ? (
            <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {visible.map((guide) => (
                <li key={guide.slug} className="flex">
                  <div className="flex-1 [&>a]:h-full"><GuideCard guide={guide} /></div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-6 rounded-2xl border border-dashed border-neutral-300 bg-white px-6 py-12 text-center">
              <MagnifyingGlassIcon className="mx-auto h-10 w-10 text-neutral-300" aria-hidden="true" />
              <p className="mt-3 text-base font-semibold text-neutral-900">
                {t('common:guides.noResultsTitle', 'No guides match your search')}
              </p>
              <p className="mt-1 text-sm text-neutral-500">
                {t('common:guides.noResultsHint', 'Try a country name like Montenegro, or a city like Budva.')}
              </p>
              <button
                type="button"
                onClick={() => setQuery('')}
                className="mt-5 inline-flex items-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-dark"
              >
                {t('common:guides.clearSearch', 'Clear search')}
              </button>
            </div>
          )}
        </section>

        {/* Comparison */}
        <section aria-labelledby="guides-compare-heading" className="mt-16">
          <h2 id="guides-compare-heading" className="text-2xl font-bold text-neutral-900">
            {t('common:guides.comparisonTitle', 'Compare countries at a glance')}
          </h2>
          <p className="mt-1 mb-5 text-sm text-neutral-500">
            {t('common:guides.comparisonSubtitle', 'Typical prices and gross rental yields. Tap a country for the full guide.')}
          </p>
          <GuideComparisonTable guides={sortedForTable} />
        </section>

        {/* How buying works */}
        <section aria-labelledby="guides-process-heading" className="mt-16">
          <h2 id="guides-process-heading" className="text-2xl font-bold text-neutral-900">
            {t('common:guides.processTitle', 'How buying works across the Balkans')}
          </h2>
          <p className="mt-1 mb-6 text-sm text-neutral-500">
            {t('common:guides.processSubtitle', 'The details differ by country, but almost every purchase follows these five stages.')}
          </p>
          <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {PROCESS_STEPS.map((n) => (
              <li key={n} className="relative rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
                  {n}
                </span>
                <h3 className="mt-3 font-semibold text-neutral-900">{t(`common:guides.step${n}Title`)}</h3>
                <p className="mt-1 text-sm leading-relaxed text-neutral-600">{t(`common:guides.step${n}Desc`)}</p>
              </li>
            ))}
          </ol>
        </section>

        <GuideDisclaimer className="mt-12" />
      </main>

      <GuideCta onSearch={() => navigate(paths.search())} />
    </>
  );
};

export default GuidesIndex;
