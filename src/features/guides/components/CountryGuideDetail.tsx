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
  CheckIcon,
  ChevronRightIcon,
  CurrencyEuroIcon,
  DocumentTextIcon,
  GlobeAltIcon,
  InformationCircleIcon,
  MapPinIcon,
  ScaleIcon,
  UserGroupIcon,
  ArrowTrendingUpIcon,
} from '@/constants';
import { COUNTRY_GUIDES } from '../data/countryGuides';
import type { CountryGuide } from '../types/guide.types';
import { formatEuroRange, formatPercentRange } from '../utils/guideSelectors';
import { GuideCta } from './GuideCta';
import { GuideDisclaimer } from './GuideDisclaimer';
import { GuideLink } from './GuideLink';
import { OwnershipBadge } from './OwnershipBadge';
import { useCountryName } from './useCountryName';

interface CountryGuideDetailProps {
  guide: CountryGuide;
  /** Position in `COUNTRY_GUIDES`, for the previous / next links. */
  index: number;
}

/** `/guides/:slug` — the full guide for one country. */
const CountryGuideDetail: React.FC<CountryGuideDetailProps> = ({ guide, index }) => {
  const { t, i18n } = useTranslation('common');
  const countryName = useCountryName();
  const locale = i18n.language || 'en';
  const name = countryName(guide);
  const title = t('common:guides.howToBuy', 'How to Buy Property in {{country}}', { country: name });

  const prev = COUNTRY_GUIDES[(index - 1 + COUNTRY_GUIDES.length) % COUNTRY_GUIDES.length];
  const next = COUNTRY_GUIDES[(index + 1) % COUNTRY_GUIDES.length];
  const others = COUNTRY_GUIDES.filter((g) => g.slug !== guide.slug);
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://balkanestateai.com';
  const searchCountry = () => navigate(paths.search({ country: guide.country }));

  const facts = [
    { icon: CurrencyEuroIcon, label: t('common:guides.avgPrice', 'Avg. Price'), value: `${formatEuroRange(guide.avgPricePerSqm, locale)}${t('common:guides.perSqm', '/m²')}` },
    { icon: ArrowTrendingUpIcon, label: t('common:guides.rentalYield', 'Rental Yield'), value: formatPercentRange(guide.rentalYield, locale), accent: true },
    { icon: GlobeAltIcon, label: t('common:guides.foreignOwnership', 'Foreign Ownership'), value: guide.foreignBuy },
    { icon: BanknotesIcon, label: t('common:guides.annualTax', 'Annual Tax'), value: guide.tax },
    { icon: ScaleIcon, label: t('common:guides.transferTax', 'Transfer Tax'), value: guide.transferTax },
  ];

  const tools = [
    { icon: CalculatorIcon, label: t('common:guides.toolMortgage', 'Mortgage calculator'), to: paths.mortgageCalculator() },
    { icon: ChartBarIcon, label: t('common:guides.toolValuation', 'Free property valuation'), to: paths.valuation() },
    { icon: UserGroupIcon, label: t('common:guides.toolAgents', 'Find a local agent'), to: paths.agents() },
  ];

  return (
    <>
      <SEO
        title={t('common:guides.detailSeoTitle', 'How to Buy Property in {{country}} — Guide for Foreign Buyers', { country: name })}
        description={t('common:guides.detailSeoDescription', 'Foreign ownership rules, taxes, rental yields and the step-by-step buying process in {{country}}.', { country: name })}
        type="article"
      />
      <Helmet>
        <script type="application/ld+json">
          {JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'HowTo',
            name: title,
            inLanguage: locale,
            url: `${origin}${localizePath(paths.guide(guide.slug))}`,
            step: guide.legalProcess.map((text, i) => ({ '@type': 'HowToStep', position: i + 1, text })),
          })}
        </script>
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
                <div className="mt-3 flex flex-wrap items-center gap-2 text-white/80">
                  <span>{t('common:guides.completeGuide', 'Complete guide for foreign buyers')}</span>
                  <OwnershipBadge ownership={guide.ownership} />
                </div>
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
        {/* Key facts */}
        <section aria-labelledby="guide-facts-heading" className="-mt-6 relative">
          <h2 id="guide-facts-heading" className="sr-only">{t('common:guides.keyFacts', 'Key facts')}</h2>
          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {facts.map(({ icon: Icon, label, value, accent }) => (
              <div key={label} className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
                <dt className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-neutral-500">
                  <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
                  {label}
                </dt>
                <dd className={`mt-1.5 text-sm font-semibold leading-snug ${accent ? 'text-green-700' : 'text-neutral-900'}`}>{value}</dd>
              </div>
            ))}
          </dl>
        </section>

        <AdSlot page="guides" placement="in-content" className="my-8" />

        <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-12 min-w-0">
            {/* Why buy */}
            <section aria-labelledby="guide-why-heading">
              <h2 id="guide-why-heading" className="text-2xl font-bold text-neutral-900">
                {t('common:guides.whyBuy', 'Why Buy in {{country}}?', { country: name })}
              </h2>
              <ul className="mt-5 grid gap-3 sm:grid-cols-2">
                {guide.highlights.map((item) => (
                  <li key={item} className="flex items-start gap-3 rounded-xl bg-white p-4 ring-1 ring-neutral-200">
                    <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-green-100 text-green-700">
                      <CheckIcon className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <span className="text-sm leading-relaxed text-neutral-700">{item}</span>
                  </li>
                ))}
              </ul>
            </section>

            {/* Buying process timeline */}
            <section aria-labelledby="guide-process-heading">
              <h2 id="guide-process-heading" className="text-2xl font-bold text-neutral-900">
                {t('common:guides.buyingProcess', 'Buying Process (Step by Step)')}
              </h2>
              <ol className="relative mt-6 space-y-6 border-l-2 border-primary-light pl-8">
                {guide.legalProcess.map((step, i) => (
                  <li key={step} className="relative">
                    <span className="absolute -left-[49px] flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-white ring-4 ring-white">
                      {i + 1}
                    </span>
                    <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                      {t('common:guides.stepLabel', 'Step {{number}}', { number: i + 1 })}
                    </p>
                    <p className="mt-0.5 text-sm sm:text-base leading-relaxed text-neutral-800">{step}</p>
                  </li>
                ))}
              </ol>
            </section>

            {/* Residency */}
            <section className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
              <div className="flex items-start gap-3">
                <InformationCircleIcon className="h-6 w-6 flex-shrink-0 text-blue-600" aria-hidden="true" />
                <div>
                  <h2 className="font-semibold text-blue-900">{t('common:guides.residencyInfo', 'Residency Through Property')}</h2>
                  <p className="mt-1 text-sm leading-relaxed text-blue-800">{guide.residency}</p>
                </div>
              </div>
            </section>

            {/* Top cities */}
            <section aria-labelledby="guide-cities-heading">
              <h2 id="guide-cities-heading" className="text-2xl font-bold text-neutral-900">
                {t('common:guides.topCities', 'Top Cities for Property')}
              </h2>
              <p className="mt-1 text-sm text-neutral-500">{t('common:guides.topCitiesHint', 'Open live listings in each city.')}</p>
              <ul className="mt-4 flex flex-wrap gap-2">
                {guide.topCities.map((city) => (
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
              <GuideLink
                to={paths.guides()}
                className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
              >
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
