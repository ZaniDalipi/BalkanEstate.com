import React, { lazy, Suspense } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { SEO } from '@/src/components/seo';
import Footer from '@/components/shared/Footer';
import { AdSlot } from '@/src/features/promo';
import { AppLink } from '@/src/app/router/AppLink';
import { paths } from '@/src/app/router/paths';
import { COUNTRY_GUIDES, GUIDES_LAST_UPDATED, findCountryGuide, type CountryGuide } from '../data/countryGuides';
import CountryGuideArticle from './CountryGuideArticle';

const NotFoundPage = lazy(() => import('@/src/components/ui/not-found-2').then(m => ({ default: m.NotFound })));

/**
 * `/guides` — the index of country buying guides — and `/guides/:country`,
 * one guide per country. Each guide is its own page (and its own prerendered
 * HTML file) so it can be found, linked and cited on its own, instead of ten
 * guides competing on one long page.
 */
const BuyingGuidesPage: React.FC = () => {
  const { country } = useParams();
  if (country) {
    const guide = findCountryGuide(country);
    if (!guide) {
      return (
        <Suspense fallback={null}>
          <NotFoundPage />
        </Suspense>
      );
    }
    return <CountryGuidePage guide={guide} />;
  }
  return <GuidesIndexPage />;
};

const GuidesIndexPage: React.FC = () => {
  const { t } = useTranslation(['common']);
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://balkanestateai.com';

  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-50 to-white">
      <SEO
        title={t('common:guides.seoTitle', 'Property Buying Guides - How to Buy Real Estate in the Balkans')}
        description={t('common:guides.seoDescription', 'How buying property works in 10 Balkan countries: foreign ownership rules, taxes, the legal process step by step, and the official registries to check.')}
        type="website"
        // Guides are written in English: one canonical English page rather
        // than ten language URLs with the same text.
        canonical={`/en${paths.guides()}`}
        alternates={false}
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          name: 'Property Buying Guides - Balkans',
          description: 'How buying property works in 10 Balkan countries.',
          dateModified: GUIDES_LAST_UPDATED,
          publisher: { '@id': `${origin}/#organization` },
          mainEntity: {
            '@type': 'ItemList',
            numberOfItems: COUNTRY_GUIDES.length,
            itemListElement: COUNTRY_GUIDES.map((guide, i) => ({
              '@type': 'ListItem',
              position: i + 1,
              name: `How to Buy Property in ${guide.country}`,
            })),
          },
        }}
      />

      <div className="bg-gradient-to-br from-primary-600 to-primary-800 text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14 sm:py-20">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
            {t('common:guides.title', 'Property Buying Guides')}
          </h1>
          <p className="text-lg sm:text-xl text-primary-100 max-w-3xl">
            {t('common:guides.subtitle', 'How buying property works in each Balkan country: who can buy, what it costs in taxes, the legal steps, and which official registry to check.')}
          </p>
          <p className="mt-4 text-sm text-primary-200">
            {t('common:guides.lastUpdated', 'Last updated')}: <time dateTime={GUIDES_LAST_UPDATED}>{GUIDES_LAST_UPDATED}</time>
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-12">
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {COUNTRY_GUIDES.map((guide) => (
            <li key={guide.slug}>
              <GuideCard guide={guide} />
            </li>
          ))}
        </ul>

        <GuidesDisclaimer />
      </div>

      <AdSlot page="guides" placement="in-content" className="max-w-6xl mx-auto px-4 sm:px-6 my-6" showPlaceholder />

      <Footer />
    </div>
  );
};

const GuideCard: React.FC<{ guide: CountryGuide }> = ({ guide }) => {
  const { t } = useTranslation(['common']);
  return (
    <AppLink
      to={paths.guide(guide.slug)}
      className="block h-full rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm transition hover:border-primary-300 hover:shadow-md"
    >
      <div className="flex items-center gap-2 text-lg font-semibold text-neutral-900">
        <span aria-hidden="true">{guide.flag}</span>
        {t('common:guides.howToBuy', 'How to Buy Property in {{country}}', { country: guide.country })}
      </div>
      <dl className="mt-3 space-y-2 text-sm">
        <div>
          <dt className="font-medium text-neutral-500">{t('common:guides.foreignOwnership', 'Foreign Ownership')}</dt>
          <dd className="text-neutral-800">{guide.foreignBuy}</dd>
        </div>
        <div>
          <dt className="font-medium text-neutral-500">{t('common:guides.transferTax', 'Transfer Tax')}</dt>
          <dd className="text-neutral-800">{guide.transferTax}</dd>
        </div>
      </dl>
      <span className="mt-4 inline-block text-sm font-medium text-primary-700">
        {t('common:guides.readGuide', 'Read the guide →')}
      </span>
    </AppLink>
  );
};

const CountryGuidePage: React.FC<{ guide: CountryGuide }> = ({ guide }) => {
  const { t } = useTranslation(['common']);
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://balkanestateai.com';
  const title = t('common:guides.howToBuy', 'How to Buy Property in {{country}}', { country: guide.country });

  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-50 to-white">
      <SEO
        title={`${title} — ${t('common:guides.seoGuideSuffix', 'Buyer\'s Guide')}`}
        description={`${title}: foreign ownership rules, taxes, residency, the legal steps and the official registry to check. ${guide.foreignBuy}.`.slice(0, 300)}
        type="article"
        canonical={`/en${paths.guide(guide.slug)}`}
        alternates={false}
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: title,
          about: { '@type': 'Country', name: guide.country },
          dateModified: GUIDES_LAST_UPDATED,
          author: { '@id': `${origin}/#organization` },
          publisher: { '@id': `${origin}/#organization` },
          citation: guide.sources.filter((s) => s.url).map((s) => s.url),
        }}
      />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-6">
        <nav aria-label={t('common:breadcrumb', 'Breadcrumb')} className="text-sm text-neutral-500">
          <AppLink to={paths.guides()} className="hover:text-primary-700">
            {t('common:guides.title', 'Property Buying Guides')}
          </AppLink>
          <span aria-hidden="true"> / </span>
          <span className="text-neutral-800">{guide.country}</span>
        </nav>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <CountryGuideArticle guide={guide} headingLevel={1} />
        <GuidesDisclaimer />
      </div>

      <AdSlot page="guides" placement="in-content" className="max-w-4xl mx-auto px-4 sm:px-6 my-6" showPlaceholder />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 pb-12">
        <h2 className="text-lg font-semibold text-neutral-900 mb-3">
          {t('common:guides.otherGuides', 'Guides for other countries')}
        </h2>
        <ul className="flex flex-wrap gap-2">
          {COUNTRY_GUIDES.filter((g) => g.slug !== guide.slug).map((g) => (
            <li key={g.slug}>
              <AppLink
                to={paths.guide(g.slug)}
                className="inline-block px-3 py-1.5 rounded-full text-sm bg-neutral-100 hover:bg-primary-50 hover:text-primary-700"
              >
                <span aria-hidden="true">{g.flag}</span> {g.country}
              </AppLink>
            </li>
          ))}
        </ul>
      </div>

      <Footer />
    </div>
  );
};

const GuidesDisclaimer: React.FC = () => {
  const { t } = useTranslation(['common']);
  return (
    <aside className="mt-10 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
      <p className="font-medium">{t('common:guides.disclaimerTitle', 'General information, not legal or tax advice')}</p>
      <p className="mt-1">
        {t(
          'common:guides.disclaimer',
          'These guides are prepared by BalkanEstateAI and summarise how purchases usually work. Rules, rates and thresholds change and often depend on your nationality and the municipality. Confirm the current position with a licensed local lawyer or notary and the official registry listed in each guide before you commit to a purchase.',
        )}
      </p>
    </aside>
  );
};

export default BuyingGuidesPage;
