import React from 'react';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { SEO } from '@/src/components/seo';
import { AdSlot } from '@/src/features/promo';
import { navigate, localizePath } from '@/src/app/router/navigation';
import { paths } from '@/src/app/router/paths';
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  BanknotesIcon,
  CalculatorIcon,
  ChartBarIcon,
  ChevronRightIcon,
  CurrencyEuroIcon,
  DocumentTextIcon,
  GlobeAltIcon,
  HomeIcon,
  MapPinIcon,
  ScaleIcon,
  UserGroupIcon,
} from '@/constants';
import { COUNTRY_GUIDES } from '../data/countryGuides';
import type { CountryGuide, GuideFactKey } from '../types/guide.types';
import { GUIDE_FACT_KEYS } from '../types/guide.types';
import { guideSources } from '../utils/guideSelectors';
import { GuideCta } from './GuideCta';
import { GuideDisclaimer } from './GuideDisclaimer';
import { GuideLink } from './GuideLink';
import { PriceStatValue } from './PriceStatValue';
import { SourceLinks } from './SourceLinks';
import { useCountryName } from './useCountryName';

interface CountryGuideDetailProps {
  guide: CountryGuide;
  /** Position in `COUNTRY_GUIDES`, for the previous / next links. */
  index: number;
}

const FACT_ICONS: Record<GuideFactKey, React.FC<{ className?: string }>> = {
  transferTax: ScaleIcon,
  annualTax: BanknotesIcon,
  foreignOwnership: GlobeAltIcon,
  residency: HomeIcon,
};

/** `/guides/:slug` — the official facts for one country, each with its source. */
const CountryGuideDetail: React.FC<CountryGuideDetailProps> = ({ guide, index }) => {
  const { t, i18n } = useTranslation('common');
  const countryName = useCountryName();
  const locale = i18n.language || 'en';
  const name = countryName(guide);
  const title = t('common:guides.howToBuy', 'How to Buy Property in {{country}}', { country: name });

  const prev = COUNTRY_GUIDES[(index - 1 + COUNTRY_GUIDES.length) % COUNTRY_GUIDES.length];
  const next = COUNTRY_GUIDES[(index + 1) % COUNTRY_GUIDES.length];
  const others = COUNTRY_GUIDES.filter((g) => g.slug !== guide.slug);
  const sources = guideSources(guide);
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://balkanestateai.com';
  const searchCountry = () => navigate(paths.search({ country: guide.country }));

  const factLabels: Record<GuideFactKey, string> = {
    transferTax: t('common:guides.transferTax', 'Transfer Tax'),
    annualTax: t('common:guides.annualTax', 'Annual Tax'),
    foreignOwnership: t('common:guides.foreignOwnership', 'Foreign Ownership'),
    residency: t('common:guides.residencyInfo', 'Residency Through Property'),
  };

  const tools = [
    { icon: CalculatorIcon, label: t('common:guides.toolMortgage', 'Mortgage calculator'), to: paths.mortgageCalculator() },
    { icon: ChartBarIcon, label: t('common:guides.toolValuation', 'Free property valuation'), to: paths.valuation() },
    { icon: UserGroupIcon, label: t('common:guides.toolAgents', 'Find a local agent'), to: paths.agents() },
  ];

  return (
    <>
      <SEO
        title={t('common:guides.detailSeoTitle', 'How to Buy Property in {{country}} — Guide for Foreign Buyers', { country: name })}
        description={t('common:guides.detailSeoDescription', 'Official figures on property prices, taxes, foreign ownership and residency in {{country}}, each linked to its source.', { country: name })}
        type="article"
      />
      <Helmet>
        <script type="application/ld+json">
          {JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: t('common:guides.title', 'Property Buying Guides'), item: `${origin}${localizePath(paths.guides())}` },
              { '@type': 'ListItem', position: 2, name, item: `${origin}${localizePath(paths.guide(guide.slug))}` },
            ],
          })}
        </script>
      </Helmet>

      {/* Hero */}
      <header className="relative overflow-hidden bg-gradient-to-br from-primary-dark via-primary to-primary-dark text-white">
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" aria-hidden="true" />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
          <nav aria-label={t('common:guides.breadcrumb', 'Breadcrumb')}>
            <ol className="flex flex-wrap items-center gap-1.5 text-sm text-white/80">
              <li>
                <GuideLink to={paths.guides()} className="hover:text-white hover:underline">
                  {t('common:guides.title', 'Property Buying Guides')}
                </GuideLink>
              </li>
              <li aria-hidden="true"><ChevronRightIcon className="h-4 w-4" /></li>
              <li aria-current="page" className="font-medium text-white">{name}</li>
            </ol>
          </nav>

          <div className="mt-6 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex items-start gap-4">
              <span className="text-5xl sm:text-6xl leading-none" aria-hidden="true">{guide.flag}</span>
              <div>
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight">{title}</h1>
                <p className="mt-3 text-white/80">{t('common:guides.completeGuide', 'Complete guide for foreign buyers')}</p>
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={searchCountry}
                className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-primary shadow-sm transition-colors hover:bg-primary-light focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-primary"
              >
                {t('common:guides.browseProperties', 'Browse {{country}} Properties', { country: name })}
              </button>
              <GuideLink
                to={paths.agents()}
                className="rounded-xl px-5 py-3 text-center text-sm font-semibold text-white ring-1 ring-white/40 transition-colors hover:bg-white/10"
              >
                {t('common:guides.toolAgents', 'Find a local agent')}
              </GuideLink>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 pb-16">
        <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-10 min-w-0">
            {/* Official price statistic */}
            <section aria-labelledby="guide-price-heading" className="rounded-2xl border border-neutral-200 bg-white p-5 sm:p-6 shadow-sm">
              <h2 id="guide-price-heading" className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                <CurrencyEuroIcon className="h-4 w-4 text-primary" aria-hidden="true" />
                {t('common:guides.officialPrice', 'Official price statistic')}
              </h2>
              <p className="mt-2 text-2xl sm:text-3xl">
                <PriceStatValue stat={guide.price} />
              </p>
              {guide.price ? (
                <>
                  <p className="mt-1 text-sm text-neutral-600">
                    {guide.price.measure} · {guide.price.period}
                  </p>
                  <SourceLinks sources={[guide.price.source]} className="mt-3" />
                </>
              ) : (
                <p className="mt-1 text-sm text-neutral-600">
                  {t('common:guides.noOfficialPriceHint', 'We only publish figures from official statistics. We’ll add one as soon as an official source publishes it.')}
                </p>
              )}
            </section>

            {/* Sourced facts */}
            <section aria-labelledby="guide-facts-heading">
              <h2 id="guide-facts-heading" className="text-2xl font-bold text-neutral-900">
                {t('common:guides.keyFacts', 'Key facts')}
              </h2>
              <dl className="mt-5 space-y-3">
                {GUIDE_FACT_KEYS.map((key) => {
                  const fact = guide[key];
                  const Icon = FACT_ICONS[key];
                  return (
                    <div key={key} className="rounded-2xl border border-neutral-200 bg-white p-4 sm:p-5">
                      <dt className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                        <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
                        {factLabels[key]}
                      </dt>
                      <dd className="mt-2">
                        {fact ? (
                          <>
                            <p className="text-sm sm:text-base leading-relaxed text-neutral-800">{fact.text}</p>
                            <SourceLinks sources={fact.sources} className="mt-2" />
                          </>
                        ) : (
                          <p className="text-sm text-neutral-500">
                            {t('common:guides.notVerified', 'Not yet verified from an official source. Ask a licensed local lawyer or notary.')}
                          </p>
                        )}
                      </dd>
                    </div>
                  );
                })}
              </dl>
            </section>

            <AdSlot page="guides" placement="in-content" />

            {/* Cities */}
            <section aria-labelledby="guide-cities-heading">
              <h2 id="guide-cities-heading" className="text-2xl font-bold text-neutral-900">
                {t('common:guides.browseByCity', 'Browse listings by city')}
              </h2>
              <ul className="mt-4 flex flex-wrap gap-2">
                {guide.cities.map((city) => (
                  <li key={city}>
                    <GuideLink
                      to={paths.search({ country: guide.country, city })}
                      className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-700 transition-colors hover:border-primary/40 hover:bg-primary-light hover:text-primary"
                    >
                      <MapPinIcon className="h-4 w-4 text-neutral-400" aria-hidden="true" />
                      {city}
                    </GuideLink>
                  </li>
                ))}
              </ul>
            </section>

            {/* All sources */}
            {sources.length > 0 && (
              <section aria-labelledby="guide-sources-heading">
                <h2 id="guide-sources-heading" className="text-lg font-semibold text-neutral-900">
                  {t('common:guides.sourcesTitle', 'Sources')}
                </h2>
                <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-sm text-neutral-600">
                  {sources.map((source) => (
                    <li key={source.url}>
                      <a href={source.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline break-words">
                        {source.publisher} — {source.title}
                      </a>
                    </li>
                  ))}
                </ol>
              </section>
            )}

            <GuideDisclaimer />

            {/* Previous / next */}
            <nav aria-label={t('common:guides.moreGuides', 'More guides')} className="grid gap-3 sm:grid-cols-2">
              <GuideLink
                to={paths.guide(prev.slug)}
                className="group flex items-center gap-3 rounded-2xl border border-neutral-200 bg-white p-4 hover:border-primary/40 hover:shadow-md"
              >
                <ArrowLeftIcon className="h-5 w-5 text-neutral-400 group-hover:text-primary" aria-hidden="true" />
                <span>
                  <span className="block text-xs text-neutral-500">{t('common:guides.prevGuide', 'Previous guide')}</span>
                  <span className="font-semibold text-neutral-900">{prev.flag} {countryName(prev)}</span>
                </span>
              </GuideLink>
              <GuideLink
                to={paths.guide(next.slug)}
                className="group flex items-center justify-end gap-3 rounded-2xl border border-neutral-200 bg-white p-4 text-right hover:border-primary/40 hover:shadow-md"
              >
                <span>
                  <span className="block text-xs text-neutral-500">{t('common:guides.nextGuide', 'Next guide')}</span>
                  <span className="font-semibold text-neutral-900">{next.flag} {countryName(next)}</span>
                </span>
                <ArrowRightIcon className="h-5 w-5 text-neutral-400 group-hover:text-primary" aria-hidden="true" />
              </GuideLink>
            </nav>
          </div>

          {/* Sidebar */}
          <aside className="space-y-6 lg:sticky lg:top-6 lg:self-start">
            <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
              <h2 className="flex items-center gap-2 font-semibold text-neutral-900">
                <DocumentTextIcon className="h-5 w-5 text-primary" aria-hidden="true" />
                {t('common:guides.toolsTitle', 'Plan your purchase')}
              </h2>
              <ul className="mt-4 space-y-2">
                {tools.map(({ icon: Icon, label, to }) => (
                  <li key={to}>
                    <GuideLink
                      to={to}
                      className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-neutral-700 hover:bg-primary-light hover:text-primary"
                    >
                      <Icon className="h-5 w-5 text-neutral-400" aria-hidden="true" />
                      <span className="flex-1">{label}</span>
                      <ChevronRightIcon className="h-4 w-4 text-neutral-300" aria-hidden="true" />
                    </GuideLink>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
              <h2 className="font-semibold text-neutral-900">{t('common:guides.otherGuides', 'Other country guides')}</h2>
              <ul className="mt-3 grid grid-cols-1 gap-1">
                {others.map((g) => (
                  <li key={g.slug}>
                    <GuideLink
                      to={paths.guide(g.slug)}
                      className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-neutral-700 hover:bg-neutral-50 hover:text-primary"
                    >
                      <span aria-hidden="true">{g.flag}</span>
                      {countryName(g)}
                    </GuideLink>
                  </li>
                ))}
              </ul>
              <GuideLink to={paths.guides()} className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
                <ArrowLeftIcon className="h-4 w-4" aria-hidden="true" />
                {t('common:guides.backToGuides', 'All guides')}
              </GuideLink>
            </div>
          </aside>
        </div>
      </main>

      <GuideCta
        onSearch={searchCountry}
        title={t('common:guides.ctaCountryTitle', 'Ready to buy in {{country}}?', { country: name })}
        buttonLabel={t('common:guides.browseProperties', 'Browse {{country}} Properties', { country: name })}
      />
    </>
  );
};

export default CountryGuideDetail;
