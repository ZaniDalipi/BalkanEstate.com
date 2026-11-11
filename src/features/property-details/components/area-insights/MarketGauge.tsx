import React from 'react';
import { useTranslation } from 'react-i18next';

export interface MarketGaugeProps {
  /** 0 = favours buyers (tenants), 100 = favours sellers (landlords). */
  score: number;
  isRent: boolean;
}

/** Blue (buyers) through a neutral middle to red (sellers). */
const GAUGE_GRADIENT = 'linear-gradient(to right, #2563eb, #7dd3fc 35%, #d6d3d1 50%, #f59e0b 70%, #dc2626)';

/** A blue → red bar with a marker where this area sits. */
const MarketGauge: React.FC<MarketGaugeProps> = ({ score, isRent }) => {
  const { t } = useTranslation(['property']);
  const position = Math.min(100, Math.max(0, score));
  const buyerSide = isRent
    ? t('property:areaInsights.dynamics.tenantSide', 'Favours tenants')
    : t('property:areaInsights.dynamics.buyerSide', 'Favours buyers');
  const sellerSide = isRent
    ? t('property:areaInsights.dynamics.landlordSide', 'Favours landlords')
    : t('property:areaInsights.dynamics.sellerSide', 'Favours sellers');

  return (
    <div className="mt-6 landscape:mt-3 px-1">
      <div
        role="img"
        aria-label={t('property:areaInsights.dynamics.gaugeLabel', '{{score}} out of 100: {{left}} at 0, {{right}} at 100', {
          score: position,
          left: buyerSide,
          right: sellerSide,
        })}
        className="relative pt-4"
      >
        <span
          aria-hidden="true"
          className="absolute top-0 -translate-x-1/2 border-x-[7px] border-t-[9px] border-x-transparent border-t-neutral-900"
          style={{ left: `${position}%` }}
        />
        <div className="h-3 rounded-full" style={{ backgroundImage: GAUGE_GRADIENT }} />
        <span
          aria-hidden="true"
          className="absolute top-3 h-5 w-0.5 -translate-x-1/2 rounded bg-neutral-900"
          style={{ left: `${position}%` }}
        />
      </div>
      <div className="mt-2 flex justify-between gap-4 text-sm sm:text-base landscape:text-sm" aria-hidden="true">
        <span className="text-blue-700">{buyerSide}</span>
        <span className="text-right text-red-700">{sellerSide}</span>
      </div>
    </div>
  );
};

export default MarketGauge;
