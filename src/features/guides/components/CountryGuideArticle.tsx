import React from 'react';
import { useTranslation } from 'react-i18next';
import { AppLink } from '@/src/app/router/AppLink';
import { paths } from '@/src/app/router/paths';
import { GUIDES_LAST_UPDATED, type CountryGuide } from '../data/countryGuides';

interface CountryGuideArticleProps {
  guide: CountryGuide;
  /** 1 on the guide's own page, 2 when listed under another heading. */
  headingLevel?: 1 | 2;
}

/** One country's buying guide: key facts, steps, cautions and official sources. */
const CountryGuideArticle: React.FC<CountryGuideArticleProps> = ({ guide, headingLevel = 2 }) => {
  const { t } = useTranslation(['common']);
  const Heading = headingLevel === 1 ? 'h1' : 'h2';

  const facts: Array<[string, string]> = [
    [t('common:guides.foreignOwnership', 'Foreign Ownership'), guide.foreignBuy],
    [t('common:guides.annualTax', 'Annual Tax'), guide.tax],
    [t('common:guides.transferTax', 'Transfer Tax'), guide.transferTax],
  ];

  return (
    <article id={guide.slug}>
      <header className="mb-6">
        <Heading className="text-2xl sm:text-3xl lg:text-4xl font-bold text-neutral-900">
          <span aria-hidden="true">{guide.flag} </span>
          {t('common:guides.howToBuy', 'How to Buy Property in {{country}}', { country: guide.country })}
        </Heading>
        <p className="mt-2 text-sm text-neutral-500">
          {t('common:guides.byline', 'By BalkanEstateAI')} · {t('common:guides.lastUpdated', 'Last updated')}{' '}
          <time dateTime={GUIDES_LAST_UPDATED}>{GUIDES_LAST_UPDATED}</time>
        </p>
      </header>

      <dl className="grid gap-3 sm:grid-cols-3 mb-8">
        {facts.map(([label, value]) => (
          <div key={label} className="rounded-xl bg-neutral-50 p-4">
            <dt className="text-xs font-medium uppercase tracking-wider text-neutral-500">{label}</dt>
            <dd className="mt-1 text-sm font-medium text-neutral-900">{value}</dd>
          </div>
        ))}
      </dl>

      <div className="grid gap-8 lg:grid-cols-2">
        <section>
          <h2 className="text-lg font-semibold text-neutral-900 mb-3">
            {t('common:guides.keyPoints', 'Key points for buyers')}
          </h2>
          <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-neutral-700">
            {guide.highlights.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-neutral-900 mb-3">
            {t('common:guides.buyingProcess', 'Buying Process (Step by Step)')}
          </h2>
          <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed text-neutral-700">
            {guide.legalProcess.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </section>
      </div>

      <section className="mt-6 rounded-xl border border-blue-100 bg-blue-50 p-4">
        <h2 className="text-sm font-medium text-blue-900">{t('common:guides.residencyInfo', 'Residency Through Property')}</h2>
        <p className="mt-1 text-sm text-blue-800">{guide.residency}</p>
      </section>

      {guide.cautions.length > 0 && (
        <section className="mt-4 rounded-xl border border-neutral-200 bg-white p-4">
          <h2 className="text-sm font-medium text-neutral-900">{t('common:guides.checkBeforeBuying', 'Check before you buy')}</h2>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-neutral-700">
            {guide.cautions.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-6">
        <h2 className="text-lg font-semibold text-neutral-900 mb-3">
          {t('common:guides.topCities', 'Top Cities for Property')}
        </h2>
        <ul className="flex flex-wrap gap-2">
          {guide.topCities.map((city) => (
            <li key={city}>
              <AppLink
                to={paths.cityDashboard(city, guide.searchCountry)}
                className="inline-block px-3 py-1.5 bg-neutral-100 hover:bg-primary-50 hover:text-primary-700 rounded-full text-sm"
              >
                {city}
              </AppLink>
            </li>
          ))}
        </ul>
        <AppLink
          to={paths.search({ country: guide.searchCountry })}
          className="mt-4 inline-block px-5 py-2.5 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 text-sm"
        >
          {t('common:guides.browseProperties', 'Browse {{country}} Properties', { country: guide.country })}
        </AppLink>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-neutral-900 mb-2">
          {t('common:guides.officialSources', 'Official sources')}
        </h2>
        <ul className="list-disc space-y-1 pl-5 text-sm text-neutral-700">
          {guide.sources.map((source) => (
            <li key={source.name}>
              {source.url ? (
                <a href={source.url} target="_blank" rel="noopener noreferrer" className="text-primary-700 hover:underline">
                  {source.name}
                </a>
              ) : (
                source.name
              )}
            </li>
          ))}
        </ul>
      </section>
    </article>
  );
};

export default CountryGuideArticle;
