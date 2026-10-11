import React from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowRightIcon, MapPinIcon } from '@/constants';
import { paths } from '@/src/app/router/paths';
import type { CountryGuide } from '../types/guide.types';
import { formatEuroRange, formatPercentRange } from '../utils/guideSelectors';
import { GuideLink } from './GuideLink';
import { OwnershipBadge } from './OwnershipBadge';
import { useCountryName } from './useCountryName';

/** One country in the index grid; the whole card links to its guide. */
export const GuideCard: React.FC<{ guide: CountryGuide }> = ({ guide }) => {
  const { t, i18n } = useTranslation('common');
  const countryName = useCountryName()(guide);
  const locale = i18n.language || 'en';

  return (
    <GuideLink
      to={paths.guide(guide.slug)}
      className="group relative flex flex-col rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      aria-label={t('common:guides.howToBuy', 'How to Buy Property in {{country}}', { country: countryName })}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-4xl leading-none" aria-hidden="true">{guide.flag}</span>
          <div className="min-w-0">
            <h3 className="text-lg font-bold text-neutral-900 truncate">{countryName}</h3>
            <OwnershipBadge ownership={guide.ownership} className="mt-1" />
          </div>
        </div>
      </div>

      <dl className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-neutral-50 p-3">
          <dt className="text-[11px] font-medium uppercase tracking-wider text-neutral-500">
            {t('common:guides.avgPrice', 'Avg. Price')}
          </dt>
          <dd className="mt-0.5 text-sm font-semibold text-neutral-900">
            {formatEuroRange(guide.avgPricePerSqm, locale)}
            <span className="font-normal text-neutral-500">{t('common:guides.perSqm', '/m²')}</span>
          </dd>
        </div>
        <div className="rounded-xl bg-neutral-50 p-3">
          <dt className="text-[11px] font-medium uppercase tracking-wider text-neutral-500">
            {t('common:guides.rentalYield', 'Rental Yield')}
          </dt>
          <dd className="mt-0.5 text-sm font-semibold text-green-700">{formatPercentRange(guide.rentalYield, locale)}</dd>
        </div>
      </dl>

      <p className="mt-4 flex items-start gap-1.5 text-sm text-neutral-600">
        <MapPinIcon className="h-4 w-4 flex-shrink-0 mt-0.5 text-neutral-400" aria-hidden="true" />
        <span className="line-clamp-1">{guide.topCities.slice(0, 4).join(' · ')}</span>
      </p>

      <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
        {t('common:guides.readGuide', 'Read the guide')}
        <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
      </span>
    </GuideLink>
  );
};
