import React from 'react';
import { useTranslation } from 'react-i18next';
import { SEO } from '@/src/components/seo';
import { ExclamationCircleIcon, ArrowLeftIcon } from '@/constants';
import { paths } from '@/src/app/router/paths';
import { COUNTRY_GUIDES } from '../data/countryGuides';
import { GuideLink } from './GuideLink';
import { useCountryName } from './useCountryName';

/**
 * A `/guides/:slug` that matches no guide. The slug is only echoed back when
 * it passed validation (`findGuide`), so a crafted URL cannot put arbitrary
 * text on the page; React escapes it either way.
 */
const GuideNotFound: React.FC<{ slug?: string }> = ({ slug }) => {
  const { t } = useTranslation('common');
  const countryName = useCountryName();
  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 py-16 sm:py-24 text-center">
      <SEO title={t('common:guides.notFoundTitle', 'Guide not found')} noindex />
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
        <ExclamationCircleIcon className="h-8 w-8 text-amber-600" aria-hidden="true" />
      </div>
      <h1 className="mt-6 text-2xl sm:text-3xl font-bold text-neutral-900">
        {t('common:guides.notFoundTitle', 'Guide not found')}
      </h1>
      <p className="mt-3 text-neutral-600">
        {slug
          ? t('common:guides.notFoundDescription', 'We don’t have a buying guide for “{{slug}}”. Choose one of the countries below.', { slug })
          : t('common:guides.notFoundGeneric', 'That link doesn’t point to a buying guide. Choose one of the countries below.')}
      </p>
      <ul className="mt-8 flex flex-wrap justify-center gap-2">
        {COUNTRY_GUIDES.map((guide) => (
          <li key={guide.slug}>
            <GuideLink
              to={paths.guide(guide.slug)}
              className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:border-primary/40 hover:bg-primary-light hover:text-primary"
            >
              <span aria-hidden="true">{guide.flag}</span>
              {countryName(guide)}
            </GuideLink>
          </li>
        ))}
      </ul>
      <GuideLink
        to={paths.guides()}
        className="mt-10 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark"
      >
        <ArrowLeftIcon className="h-4 w-4" aria-hidden="true" />
        {t('common:guides.backToGuides', 'All guides')}
      </GuideLink>
    </main>
  );
};

export default GuideNotFound;
