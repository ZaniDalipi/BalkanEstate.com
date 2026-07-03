/**
 * EconomicIndicatorsPanel — macroeconomic context for the city's country.
 * Data from the World Bank API (free, no auth).
 */

import React from 'react';
import type { EconomicIndicators } from '@/src/shared/types/cityInsights.types';
import {
  GlobeAltIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  CurrencyEuroIcon,
  ChartBarIcon,
} from '@/constants';

export interface EconomicIndicatorsPanelProps {
  data: EconomicIndicators;
}

interface IndicatorCardProps {
  label: string;
  value: string;
  trend?: 'up' | 'down' | 'neutral';
  color: string;
  icon: React.ReactNode;
  description?: string;
}

const IndicatorCard: React.FC<IndicatorCardProps> = ({ label, value, trend, color, icon, description }) => (
  <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-100">
    <div className="flex items-center gap-1.5 mb-1">
      {icon}
      <span className="text-[10px] text-neutral-500 font-semibold uppercase tracking-wider">{label}</span>
    </div>
    <div className={`text-lg font-black ${color} flex items-center gap-1`}>
      {trend === 'up' && <ArrowTrendingUpIcon className="w-4 h-4" />}
      {trend === 'down' && <ArrowTrendingDownIcon className="w-4 h-4" />}
      {value}
    </div>
    {description && <p className="text-[10px] text-neutral-400 mt-0.5">{description}</p>}
  </div>
);

function fmtPercent(v: number | null): string {
  return v == null ? '—' : `${v > 0 ? '+' : ''}${v.toFixed(1)}%`;
}

function fmtNumber(v: number | null): string {
  if (v == null) return '—';
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
  return v.toString();
}

const EconomicIndicatorsPanel: React.FC<EconomicIndicatorsPanelProps> = ({ data }) => {
  const gdpTrend: 'up' | 'down' | 'neutral' = data.gdpGrowthYoY == null
    ? 'neutral'
    : data.gdpGrowthYoY >= 0
    ? 'up'
    : 'down';

  const inflationOk = data.inflationCPI != null && data.inflationCPI < 5;

  return (
    <div className="bg-white rounded-xl shadow-md border border-neutral-100 p-5 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-neutral-900 flex items-center gap-2">
          <GlobeAltIcon className="w-5 h-5 text-primary" />
          Economic Context — {data.country}
        </h3>
        <a
          href={data.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[10px] text-blue-500 hover:underline"
        >
          World Bank Open Data ↗
        </a>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        <IndicatorCard
          label="GDP Growth (YoY)"
          value={fmtPercent(data.gdpGrowthYoY)}
          trend={gdpTrend}
          color={gdpTrend === 'up' ? 'text-green-600' : gdpTrend === 'down' ? 'text-red-500' : 'text-neutral-500'}
          icon={<ChartBarIcon className="w-3.5 h-3.5 text-emerald-500" />}
          description="Annual real growth"
        />
        <IndicatorCard
          label="Inflation (CPI)"
          value={fmtPercent(data.inflationCPI)}
          color={inflationOk ? 'text-green-600' : 'text-amber-600'}
          icon={<ArrowTrendingUpIcon className="w-3.5 h-3.5 text-amber-500" />}
          description="Consumer Price Index"
        />
        <IndicatorCard
          label="Mortgage Rate"
          value={data.lendingRate == null ? '—' : `${data.lendingRate.toFixed(1)}%`}
          color="text-blue-600"
          icon={<CurrencyEuroIcon className="w-3.5 h-3.5 text-blue-500" />}
          description="Avg lending rate"
        />
        <IndicatorCard
          label="GNI per Capita"
          value={data.gniPerCapitaUSD == null ? '—' : `$${(data.gniPerCapitaUSD / 1000).toFixed(1)}K`}
          color="text-neutral-900"
          icon={<CurrencyEuroIcon className="w-3.5 h-3.5 text-green-500" />}
          description="USD, Atlas method"
        />
        <IndicatorCard
          label="Population"
          value={fmtNumber(data.populationTotal)}
          color="text-neutral-900"
          icon={<GlobeAltIcon className="w-3.5 h-3.5 text-violet-500" />}
          description="Country total"
        />
        <IndicatorCard
          label="Unemployment"
          value={data.unemploymentRate == null ? '—' : `${data.unemploymentRate.toFixed(1)}%`}
          color={data.unemploymentRate != null && data.unemploymentRate > 10 ? 'text-amber-600' : 'text-green-600'}
          icon={<ChartBarIcon className="w-3.5 h-3.5 text-red-500" />}
          description="Labor force %"
        />
      </div>
    </div>
  );
};

export default EconomicIndicatorsPanel;
