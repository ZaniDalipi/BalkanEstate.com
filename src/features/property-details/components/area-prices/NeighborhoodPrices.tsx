/**
 * NeighborhoodPrices — what the homes around this one ask, and what they sold
 * or were let for. Sold and let homes are kept for good, so this is the
 * street's price history.
 *
 *   1. AreaPriceSummary  — this home against the median, four stat tiles
 *   2. PriceStrip        — every neighbour on one line, this home marked
 *   3. Map + list        — nearby homes with prices; recent sales / lets
 *   4. Trend             — median asking vs closed per quarter
 *
 * Sales are compared per m²; rents like with like (monthly per m², nightly on
 * the price per night). `useAreaFormat` turns that into units and labels.
 */

import React, { Suspense, lazy, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Property } from '@/types';
import { useAreaPrices } from '../../hooks/useAreaPrices';
import type { AreaPricesResponse } from '../../api/areaPricesApi';
import AreaPriceSummary from './AreaPriceSummary';
import AreaPriceTrendChart from './AreaPriceTrendChart';
import NeighbourList from './NeighbourList';
import PriceStrip from './PriceStrip';
import { useAreaFormat } from './useAreaFormat';

const NeighborhoodPriceMap = lazy(() => import('./NeighborhoodPriceMap'));

export interface NeighborhoodPricesProps {
  property: Property;
}

const NeighborhoodPrices: React.FC<NeighborhoodPricesProps> = ({ property }) => {
  const { data, isLoading, error } = useAreaPrices(property.id);

  if (isLoading) return <NeighborhoodPricesSkeleton />;
  if (error || !data) return null;
  return <NeighborhoodPricesBody data={data} />;
};

const NeighborhoodPricesBody: React.FC<{ data: AreaPricesResponse }> = ({ data }) => {
  const { t } = useTranslation(['property']);
  const format = useAreaFormat(data);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const { stats, subject, neighbours } = data;
  const hasNeighbours = neighbours.length > 0;
  const trendHasData = data.trend.filter((p) => p.askingValue !== null || p.closedValue !== null).length >= 2;
  const chips = [!data.sameTypeOnly && format.labels.widerTypes, format.labels.basisNote].filter(Boolean) as string[];

  return (
    <section className="bg-gradient-to-br from-white to-neutral-50 rounded-2xl border border-neutral-200 p-4 sm:p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2 mb-4">
        <div>
          <h3 className="text-xl sm:text-2xl font-bold text-neutral-800">{t('property:areaPrices.title', 'Neighbourhood prices')}</h3>
          <p className="text-sm text-neutral-500 mt-0.5">
            {hasNeighbours
              ? t('property:areaPrices.subtitle', 'Nearby homes: {{count}} within {{radius}} km', { count: neighbours.length, radius: data.radiusKm })
              : t('property:areaPrices.empty', 'Not enough homes nearby yet to compare prices.')}
          </p>
        </div>
        {hasNeighbours && chips.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {chips.map((chip) => (
              <span key={chip} className="text-xs font-medium text-neutral-600 bg-neutral-100 rounded-full px-2.5 py-1">{chip}</span>
            ))}
          </div>
        )}
      </div>

      {hasNeighbours && (
        <>
          <AreaPriceSummary stats={stats} subjectValue={subject.value} format={format} />

          <div className="mb-5">
            <h4 className="text-sm font-semibold text-neutral-700 mb-1">{t('property:areaPrices.stripTitle', 'Where this home sits')}</h4>
            <p className="text-xs text-neutral-500 mb-2">{format.labels.stripHint}</p>
            <PriceStrip
              neighbours={neighbours}
              subjectValue={subject.value}
              median={stats.medianValue}
              format={format}
              highlightedId={highlightedId}
              onHighlight={setHighlightedId}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-5">
            <div className="md:col-span-3 h-72 sm:h-80 rounded-xl overflow-hidden border border-neutral-200 relative z-0">
              <Suspense fallback={<div className="w-full h-full bg-neutral-100 animate-pulse" />}>
                <NeighborhoodPriceMap
                  center={data.center}
                  radiusKm={data.radiusKm}
                  subjectPrice={subject.price}
                  neighbours={neighbours}
                  format={format}
                  highlightedId={highlightedId}
                  onHighlight={setHighlightedId}
                />
              </Suspense>
            </div>
            <div className="md:col-span-2">
              <NeighbourList neighbours={neighbours} format={format} highlightedId={highlightedId} onHighlight={setHighlightedId} />
            </div>
          </div>

          {trendHasData && (
            <div>
              <h4 className="text-sm font-semibold text-neutral-700 mb-1">{format.labels.trendTitle}</h4>
              <p className="text-xs text-neutral-500 mb-2">{format.labels.trendHint}</p>
              <AreaPriceTrendChart trend={data.trend} format={format} />
            </div>
          )}
        </>
      )}
    </section>
  );
};

export const NeighborhoodPricesSkeleton: React.FC = () => (
  <section className="bg-white rounded-2xl border border-neutral-200 p-4 sm:p-6 animate-pulse">
    <div className="h-6 w-56 bg-neutral-100 rounded mb-4" />
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
      {[0, 1, 2, 3].map((i) => <div key={i} className="h-16 bg-neutral-100 rounded-xl" />)}
    </div>
    <div className="h-64 bg-neutral-100 rounded-xl" />
  </section>
);

export default NeighborhoodPrices;
