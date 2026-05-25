/**
 * SuburbDetailPanel
 * Slide-in panel showing detailed stats for the selected suburb.
 */

import React from 'react';
import type { SuburbEntry } from '@/src/shared/types/suburb.types';
import {
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  MapPinIcon,
  HomeIcon,
  FireIcon,
  CalendarIcon,
  CurrencyEuroIcon,
  StarIcon,
} from '@/constants';

export interface SuburbDetailPanelProps {
  suburb: SuburbEntry | null;
  cityAvgPricePerSqm: number;
  onClose: () => void;
}

/** Clamp helper */
function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

const SuburbDetailPanel: React.FC<SuburbDetailPanelProps> = ({
  suburb,
  cityAvgPricePerSqm,
  onClose,
}) => {
  if (!suburb) return null;

  const { stats, name, nameLocal } = suburb;
  const vsAvg = stats.priceVsCityAvg;
  const vsAvgLabel = vsAvg > 0 ? `+${vsAvg}%` : `${vsAvg}%`;
  const vsAvgClass = vsAvg > 0 ? 'text-red-500' : vsAvg < 0 ? 'text-green-600' : 'text-neutral-500';

  const growthPositive = stats.priceGrowthYoY >= 0;

  return (
    <div className="bg-white rounded-xl shadow-lg border border-neutral-100 p-5 flex flex-col gap-4 animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <MapPinIcon className="w-4 h-4 text-primary flex-shrink-0" />
            <h3 className="text-base font-bold text-neutral-900">{name}</h3>
            {suburb.rank === 1 && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">
                #1 Premium
              </span>
            )}
          </div>
          {nameLocal && (
            <p className="text-xs text-neutral-400 ml-6 mt-0.5">{nameLocal}</p>
          )}
        </div>
        <button
          onClick={onClose}
          className="w-7 h-7 rounded-full bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center text-neutral-500 transition-colors flex-shrink-0"
          aria-label="Close panel"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-2 gap-2">
        {/* Avg Price */}
        <div className="p-3 bg-neutral-50 rounded-lg">
          <div className="flex items-center gap-1.5 mb-1">
            <CurrencyEuroIcon className="w-3.5 h-3.5 text-primary" />
            <span className="text-[10px] text-neutral-500 font-medium">Avg Price/m²</span>
          </div>
          <div className="text-lg font-black text-neutral-900">
            €{stats.avgPricePerSqm.toLocaleString()}
          </div>
          <div className={`text-[11px] font-semibold ${vsAvgClass}`}>
            {vsAvgLabel} vs city avg
          </div>
        </div>

        {/* YoY Growth */}
        <div className="p-3 bg-neutral-50 rounded-lg">
          <div className="flex items-center gap-1.5 mb-1">
            {growthPositive ? (
              <ArrowTrendingUpIcon className="w-3.5 h-3.5 text-green-600" />
            ) : (
              <ArrowTrendingDownIcon className="w-3.5 h-3.5 text-red-500" />
            )}
            <span className="text-[10px] text-neutral-500 font-medium">YoY Growth</span>
          </div>
          <div className={`text-lg font-black ${growthPositive ? 'text-green-600' : 'text-red-500'}`}>
            {growthPositive ? '+' : ''}{stats.priceGrowthYoY}%
          </div>
        </div>

        {/* Rental Yield */}
        <div className="p-3 bg-neutral-50 rounded-lg">
          <div className="flex items-center gap-1.5 mb-1">
            <StarIcon className="w-3.5 h-3.5 text-blue-500" />
            <span className="text-[10px] text-neutral-500 font-medium">Rental Yield</span>
          </div>
          <div className="text-lg font-black text-blue-600">
            {stats.rentalYield}%
          </div>
        </div>

        {/* Days on Market */}
        <div className="p-3 bg-neutral-50 rounded-lg">
          <div className="flex items-center gap-1.5 mb-1">
            <CalendarIcon className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-[10px] text-neutral-500 font-medium">Days on Market</span>
          </div>
          <div className="text-lg font-black text-neutral-900">
            {stats.daysOnMarket}
          </div>
          <div className="text-[10px] text-neutral-400">days avg</div>
        </div>
      </div>

      {/* Demand Score */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-medium text-neutral-700 flex items-center gap-1.5">
            <FireIcon className="w-3.5 h-3.5 text-amber-500" />
            Buyer Demand
          </span>
          <span className="text-xs font-bold text-neutral-700">{stats.demandScore}/100</span>
        </div>
        <div className="w-full h-2 bg-neutral-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-500 transition-all duration-500"
            style={{ width: `${clamp(stats.demandScore, 0, 100)}%` }}
          />
        </div>
      </div>

      {/* Property Mix */}
      <div>
        <p className="text-xs font-medium text-neutral-700 mb-2 flex items-center gap-1.5">
          <HomeIcon className="w-3.5 h-3.5 text-primary" />
          Property Mix
        </p>
        <div className="space-y-1.5">
          {[
            { label: 'Apartments', value: stats.propertyMix.apartments, color: 'from-blue-400 to-blue-500' },
            { label: 'Houses', value: stats.propertyMix.houses, color: 'from-green-400 to-green-500' },
            { label: 'Commercial', value: stats.propertyMix.commercial, color: 'from-violet-400 to-violet-500' },
          ].map(({ label, value, color }) => (
            <div key={label} className="flex items-center gap-2">
              <span className="text-[10px] text-neutral-500 w-20 flex-shrink-0">{label}</span>
              <div className="flex-1 h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full bg-gradient-to-r ${color}`}
                  style={{ width: `${clamp(value, 0, 100)}%` }}
                />
              </div>
              <span className="text-[10px] font-semibold text-neutral-600 w-8 text-right">{value}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* Highlights */}
      {stats.highlights.length > 0 && (
        <div className="space-y-1.5">
          {stats.highlights.map((h, i) => (
            <div key={i} className="flex items-start gap-2 p-2.5 bg-neutral-50 rounded-lg">
              <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
              <p className="text-xs text-neutral-700 leading-relaxed">{h}</p>
            </div>
          ))}
        </div>
      )}

      {/* CTA */}
      <button className="w-full py-2.5 px-4 bg-primary text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2 hover:bg-primary-dark active:bg-primary-dark/90 transition-colors shadow-sm shadow-primary/20">
        <MapPinIcon className="w-4 h-4" />
        View Listings in {name}
      </button>
    </div>
  );
};

export default SuburbDetailPanel;
