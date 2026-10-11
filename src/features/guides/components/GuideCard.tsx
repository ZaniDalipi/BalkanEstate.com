import React from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowRightIcon, MapPinIcon } from '@/constants';
import { paths } from '@/src/app/router/paths';
import type { CountryGuide } from '../types/guide.types';
import { GuideLink } from './GuideLink';
import { PriceStatValue } from './PriceStatValue';
import { useCountryName } from './useCountryName';

/** One country in the index grid; the whole card links to its guide. */
export const GuideCard: React.FC<{ guide: CountryGuide }> = ({ guide }) => {
  const { t } = useTranslation('common');
  const countryName = useCountryName()(guide);

  return (
    <GuideLink
      to={paths.guide(guide.slug)}
      className="group relative flex h-full flex-col rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      aria-label={t('common:guides.howToBuy', 'How to Buy Property in {{country}}', { country: countryName })}
    >
      <div className="flex items-center gap-3 min-w-0">
        <span className="text-4xl leading-none" aria-hidden="true">{guide.flag}</span>
        <h3 className="text-lg font-bold text-neutral-900 truncate">{countryName}</h3>
      </div>

      <div className="mt-5 rounded-xl bg-neutral-50 p-3">
        <p className="text-[11px] font-medium uppercase tracking-wider text-neutral-500">
          {t('common:guides.officialPrice', 'Official price statistic')}
        </p>
        <p className="mt-0.5">
          <PriceStatValue stat={guide.price} />
        </p>
        {guide.price && (
          <p className="mt-1 text-xs text-neutral-500 line-clamp-2">
            {guide.price.period} · {guide.price.source.publisher}
          </p>
        )}
      </div>

      <p className="mt-4 flex items-start gap-1.5 text-sm text-neutral-600">
        <MapPinIcon className="h-4 w-4 flex-shrink-0 mt-0.5 text-neutral-400" aria-hidden="true" />
        <span className="line-clamp-1">{guide.cities.slice(0, 4).join(' · ')}</span>
      </p>

      <span className="mt-auto pt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
        {t('common:guides.readGuide', 'Read the guide')}
        <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
      </span>
    </GuideLink>
  );
};
