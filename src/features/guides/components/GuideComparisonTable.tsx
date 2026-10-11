import React from 'react';
import { useTranslation } from 'react-i18next';
import { paths } from '@/src/app/router/paths';
import type { CountryGuide } from '../types/guide.types';
import { GuideLink } from './GuideLink';
import { PriceStatValue } from './PriceStatValue';
import { useCountryName } from './useCountryName';

/**
 * Every country side by side, with the measure and period of each figure — an
 * average price and an index change are different things and are labelled so.
 * The table scrolls inside its own frame on a phone; the country column stays
 * pinned while it does.
 */
export const GuideComparisonTable: React.FC<{ guides: readonly CountryGuide[] }> = ({ guides }) => {
  const { t } = useTranslation('common');
  const countryName = useCountryName();

  if (guides.length === 0) return null;

  const th = 'px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500 whitespace-nowrap';
  const td = 'px-4 py-3 text-sm text-neutral-700 align-top';
  const notVerified = <span className="text-neutral-400">{t('common:guides.notVerifiedShort', 'Not verified')}</span>;

  return (
    <div className="overflow-x-auto rounded-2xl border border-neutral-200 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-neutral-200">
        <caption className="sr-only">{t('common:guides.comparisonTitle', 'Compare countries at a glance')}</caption>
        <thead className="bg-neutral-50">
          <tr>
            <th scope="col" className={`${th} sticky left-0 z-[1] bg-neutral-50`}>{t('common:guides.colCountry', 'Country')}</th>
            <th scope="col" className={th}>{t('common:guides.officialPrice', 'Official price statistic')}</th>
            <th scope="col" className={th}>{t('common:guides.colMeasure', 'Measure and period')}</th>
            <th scope="col" className={th}>{t('common:guides.transferTax', 'Transfer Tax')}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100">
          {guides.map((guide) => (
            <tr key={guide.slug} className="group hover:bg-primary-light/40">
              <th scope="row" className={`${td} sticky left-0 z-[1] bg-white group-hover:bg-primary-light text-left font-semibold text-neutral-900 whitespace-nowrap`}>
                <GuideLink to={paths.guide(guide.slug)} className="inline-flex items-center gap-2 hover:text-primary focus:outline-none focus-visible:underline">
                  <span aria-hidden="true">{guide.flag}</span>
                  {countryName(guide)}
                </GuideLink>
              </th>
              <td className={`${td} whitespace-nowrap`}><PriceStatValue stat={guide.price} /></td>
              <td className={`${td} min-w-[14rem] max-w-[22rem] text-xs text-neutral-500`}>
                {guide.price ? `${guide.price.measure} · ${guide.price.period} · ${guide.price.source.publisher}` : '—'}
              </td>
              <td className={`${td} min-w-[14rem] max-w-[22rem]`}>{guide.transferTax?.text ?? notVerified}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
