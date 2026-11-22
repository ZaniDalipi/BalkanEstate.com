import React from 'react';
import { AppLink } from '@/src/app/router/AppLink';
import type { MarketDeal } from '../types';
import { useMarketText } from '../hooks/useMarketText';

export interface MarketCrumb {
  name: string;
  /** Language-less path; the last crumb (this page) has none. */
  path?: string;
}

interface MarketHeaderProps {
  deal: MarketDeal;
  heading: string;
  intro: string;
  crumbs: MarketCrumb[];
  /** The same place for the other deal (sale ↔ rent). */
  dealPaths: Record<MarketDeal, string>;
}

const DEALS: MarketDeal[] = ['sale', 'rent'];

/** Breadcrumb trail, the page heading and intro, and the for sale / for rent switch. */
const MarketHeader: React.FC<MarketHeaderProps> = ({ deal, heading, intro, crumbs, dealPaths }) => {
  const { t } = useMarketText();
  return (
    <header>
      <nav aria-label={t('common:breadcrumb', { defaultValue: 'Breadcrumb' })} className="text-sm text-neutral-500">
        <ol className="flex flex-wrap items-center gap-1">
          {crumbs.map((crumb, i) => (
            <li key={`${crumb.name}-${i}`} className="flex items-center gap-1">
              {i > 0 && <span aria-hidden="true">/</span>}
              {crumb.path ? (
                <AppLink to={crumb.path} className="hover:text-primary-700">{crumb.name}</AppLink>
              ) : (
                <span aria-current="page" className="text-neutral-800">{crumb.name}</span>
              )}
            </li>
          ))}
        </ol>
      </nav>

      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-3xl">
          <h1 className="text-2xl font-bold text-neutral-900 sm:text-4xl landscape:text-2xl">{heading}</h1>
          <p className="mt-3 text-neutral-700">{intro}</p>
        </div>
        <nav aria-label={t('marketPages:switch.label', { defaultValue: 'Sale or rent' })} className="shrink-0">
          <ul className="inline-flex rounded-full bg-neutral-100 p-1">
            {DEALS.map((d) => (
              <li key={d}>
                <AppLink
                  to={dealPaths[d]}
                  aria-current={d === deal ? 'page' : undefined}
                  className={`inline-flex min-h-[44px] items-center rounded-full px-4 text-sm font-semibold ${
                    d === deal ? 'bg-white text-primary-700 shadow-sm' : 'text-neutral-600 hover:text-neutral-900'
                  }`}
                >
                  {t(`marketPages:switch.${d}`, { defaultValue: d === 'sale' ? 'For sale' : 'For rent' })}
                </AppLink>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
};

export default MarketHeader;
