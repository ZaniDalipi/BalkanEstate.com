import React from 'react';
import { useTranslation } from 'react-i18next';
import { paths } from '@/src/app/router/paths';
import type { CountryGuide } from '../types/guide.types';
import { formatEuroRange, formatPercentRange } from '../utils/guideSelectors';
import { GuideLink } from './GuideLink';
import { OwnershipBadge } from './OwnershipBadge';
import { useCountryName } from './useCountryName';

/**
 * Every country side by side. The table scrolls inside its own frame on a
 * phone, so the page itself never scrolls sideways; the country column stays
 * pinned while it does.
 */
export const GuideComparisonTable: React.FC<{ guides: readonly CountryGuide[] }> = ({ guides }) => {
  const { t, i18n } = useTranslation('common');
  const countryName = useCountryName();
  const locale = i18n.language || 'en';

  if (guides.length === 0) return null;

  const th = 'px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500 whitespace-nowrap';
  const td = 'px-4 py-3 text-sm text-neutral-700 whitespace-nowrap';

  return (
    <div className="overflow-x-auto rounded-2xl border border-neutral-200 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-neutral-200">
        <caption className="sr-only">{t('common:guides.comparisonTitle', 'Compare countries at a glance')}</caption>
        <thead className="bg-neutral-50">
          <tr>
            <th scope="col" className={`${th} sticky left-0 z-[1] bg-neutral-50`}>
              {t('common:guides.colCountry', 'Country')}
            </th>
            <th scope="col" className={th}>{t('common:guides.avgPrice', 'Avg. Price')}</th>
            <th scope="col" className={th}>{t('common:guides.rentalYield', 'Rental Yield')}</th>
            <th scope="col" className={th}>{t('common:guides.foreignOwnership', 'Foreign Ownership')}</th>
            <th scope="col" className={th}>{t('common:guides.transferTax', 'Transfer Tax')}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100">
          {guides.map((guide) => (
            <tr key={guide.slug} className="group hover:bg-primary-light/40">
              <th scope="row" className={`${td} sticky left-0 z-[1] bg-white group-hover:bg-primary-light text-left font-semibold text-neutral-900`}>
                <GuideLink
                  to={paths.guide(guide.slug)}
                  className="inline-flex items-center gap-2 hover:text-primary focus:outline-none focus-visible:underline"
                >
                  <span aria-hidden="true">{guide.flag}</span>
                  {countryName(guide)}
                </GuideLink>
              </th>
              <td className={td}>
                {formatEuroRange(guide.avgPricePerSqm, locale)}
                <span className="text-neutral-400">{t('common:guides.perSqm', '/m²')}</span>
              </td>
              <td className={`${td} font-medium text-green-700`}>{formatPercentRange(guide.rentalYield, locale)}</td>
              <td className={td}><OwnershipBadge ownership={guide.ownership} /></td>
              <td className={`${td} max-w-[16rem] truncate`} title={guide.transferTax}>{guide.transferTax}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
