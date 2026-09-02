/**
 * SuburbDetailPanel
 *
 * Full-detail slide-in card for the selected municipality/neighbourhood.
 * Shows: price summary, 4 key metrics, estimated apartment prices by type,
 * investment grade, demand score, property mix, and highlights.
 */

import React from 'react';
import type { SuburbEntry } from '@/src/shared/types/suburb.types';
import { buildApartmentPriceEstimates, formatTypicalSize } from '../utils/priceEstimates';
import {
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  MapPinIcon,
  HomeIcon,
  FireIcon,
  CalendarIcon,
  CurrencyEuroIcon,
  StarIcon,
  ChartBarIcon,
  ShieldCheckIcon,
} from '@/constants';

export interface SuburbDetailPanelProps {
  suburb: SuburbEntry | null;
  cityAvgPricePerSqm: number;
  onClose: () => void;
  onViewListings?: (suburb: SuburbEntry) => void;
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

// Investment grade: A–D based on rental yield + demand score
function getInvestmentGrade(rentalYield: number, demandScore: number, growthYoY: number) {
  const score = rentalYield * 10 + demandScore * 0.4 + Math.max(0, growthYoY) * 2;
  if (score >= 110) return { grade: 'A', label: 'Excellent', bg: 'bg-green-100', text: 'text-green-700', desc: 'Strong yield + high demand' };
  if (score >= 75)  return { grade: 'B', label: 'Good',      bg: 'bg-blue-100',  text: 'text-blue-700',  desc: 'Solid investment profile' };
  if (score >= 45)  return { grade: 'C', label: 'Fair',      bg: 'bg-amber-100', text: 'text-amber-700', desc: 'Moderate investment case' };
  return             { grade: 'D', label: 'Weak',      bg: 'bg-red-100',   text: 'text-red-700',   desc: 'Below-average metrics' };
}

// Typical Balkan apartment sizes (m²) → estimated total price

const SuburbDetailPanel: React.FC<SuburbDetailPanelProps> = ({
  suburb,
  cityAvgPricePerSqm,
  onClose,
  onViewListings,
}) => {
  if (!suburb) return null;

  const { stats, name, nameLocal, rank } = suburb;
  const vsAvg = stats.priceVsCityAvg;
  const vsAvgLabel = vsAvg > 0 ? `+${vsAvg}% vs avg` : vsAvg < 0 ? `${vsAvg}% vs avg` : 'City average';
  const vsAvgColor = vsAvg > 0 ? 'text-red-500' : vsAvg < 0 ? 'text-green-600' : 'text-neutral-500';
  const priceBg    = vsAvg > 5 ? 'bg-red-50 border-red-100' : vsAvg < -5 ? 'bg-green-50 border-green-100' : 'bg-neutral-50 border-neutral-100';

  const grade = getInvestmentGrade(stats.rentalYield, stats.demandScore, stats.priceGrowthYoY);
  const growthPos = stats.priceGrowthYoY >= 0;

  // Empty when the €/m² is missing or implausible — better no estimates than
  // a grid of confident "€0" tiles.
  const aptPrices = buildApartmentPriceEstimates(stats.avgPricePerSqm);

  const rankLabel = rank === 1 ? '🥇 Most Premium' : rank === 2 ? '🥈 2nd Premium' : rank === 3 ? '🥉 3rd Premium' : `#${rank}`;

  return (
    <div className="bg-white rounded-xl shadow-lg border border-neutral-100 overflow-hidden flex flex-col">
      {/* Top accent bar — colour by rank */}
      <div
        className="h-1 w-full flex-shrink-0"
        style={{ background: rank <= 2 ? '#f59e0b' : rank <= 5 ? '#3b82f6' : '#10b981' }}
      />

      {/* Scrollable body */}
      <div className="overflow-y-auto p-4 flex flex-col gap-4" style={{ maxHeight: 'clamp(340px, 60vh, 620px)' }}>

        {/* ── Header ─────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <MapPinIcon className="w-4 h-4 text-primary flex-shrink-0" />
              <h3 className="text-base font-bold text-neutral-900 truncate">{name}</h3>
            </div>
            {nameLocal && nameLocal !== name && (
              <p className="text-xs text-neutral-400 mt-0.5 ml-6 truncate">{nameLocal}</p>
            )}
            <span className="inline-block ml-6 mt-1 text-[10px] font-semibold text-neutral-500">{rankLabel}</span>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Investment grade badge */}
            <div
              className={`w-9 h-9 rounded-lg flex flex-col items-center justify-center ${grade.bg} ${grade.text}`}
              title={`Investment Grade ${grade.grade}: ${grade.desc}`}
            >
              <span className="text-sm font-black leading-none">{grade.grade}</span>
              <span className="text-[8px] font-semibold leading-none mt-0.5">{grade.label}</span>
            </div>
            {/* Close */}
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-full bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center text-neutral-500 transition-colors"
              aria-label="Close"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* ── Featured price card ─────────────────────────── */}
        <div className={`rounded-xl p-4 border ${priceBg}`}>
          <div className="flex items-baseline justify-between gap-2 mb-0.5">
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-neutral-900">€{stats.avgPricePerSqm.toLocaleString()}</span>
              <span className="text-sm text-neutral-400">/m²</span>
            </div>
            <span className={`text-sm font-bold ${vsAvgColor} text-right`}>{vsAvgLabel}</span>
          </div>
          <p className="text-[10px] text-neutral-400 mb-2">Average asking price per m²</p>

          {stats.medianPrice > 0 && (
            <div className="flex items-center justify-between pt-2 border-t border-current/10">
              <span className="text-xs text-neutral-500">Typical property price</span>
              <span className="text-sm font-bold text-neutral-900">€{stats.medianPrice.toLocaleString()}</span>
            </div>
          )}
          <div className="flex items-center justify-between pt-1.5">
            <span className="text-xs text-neutral-500">City average</span>
            <span className="text-xs text-neutral-600">€{cityAvgPricePerSqm.toLocaleString()}/m²</span>
          </div>
        </div>

        {/* ── 4 key metrics ───────────────────────────────── */}
        <div className="grid grid-cols-2 gap-2">
          <div className="p-3 bg-neutral-50 rounded-lg">
            <div className="flex items-center gap-1.5 mb-1">
              {growthPos
                ? <ArrowTrendingUpIcon className="w-3.5 h-3.5 text-green-500" />
                : <ArrowTrendingDownIcon className="w-3.5 h-3.5 text-red-500" />}
              <span className="text-[10px] text-neutral-500 font-medium">YoY Growth</span>
            </div>
            <div className={`text-xl font-black ${growthPos ? 'text-green-600' : 'text-red-500'}`}>
              {growthPos ? '+' : ''}{stats.priceGrowthYoY}%
            </div>
          </div>

          <div className="p-3 bg-neutral-50 rounded-lg">
            <div className="flex items-center gap-1.5 mb-1">
              <StarIcon className="w-3.5 h-3.5 text-blue-500" />
              <span className="text-[10px] text-neutral-500 font-medium">Rental Yield</span>
            </div>
            <div className="text-xl font-black text-blue-600">{stats.rentalYield}%</div>
          </div>

          <div className="p-3 bg-neutral-50 rounded-lg">
            <div className="flex items-center gap-1.5 mb-1">
              <CalendarIcon className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-[10px] text-neutral-500 font-medium">Days on Market</span>
            </div>
            <div className="text-xl font-black text-neutral-900">
              {stats.daysOnMarket}<span className="text-xs text-neutral-400 ml-0.5 font-normal">d</span>
            </div>
          </div>

          <div className="p-3 bg-neutral-50 rounded-lg">
            <div className="flex items-center gap-1.5 mb-1">
              <HomeIcon className="w-3.5 h-3.5 text-primary" />
              <span className="text-[10px] text-neutral-500 font-medium">Active Listings</span>
            </div>
            <div className="text-xl font-black text-neutral-900">{stats.listingsCount.toLocaleString()}</div>
          </div>
        </div>

        {/* ── Estimated apartment prices ──────────────────── */}
        {aptPrices.length > 0 && (
          <div>
            <p className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-2">Estimated Prices</p>
            <div className="grid grid-cols-2 gap-1.5">
              {aptPrices.map(({ type, size, price }) => (
                <div
                  key={type}
                  className="p-2.5 bg-neutral-50 rounded-lg border border-neutral-100 min-w-0"
                >
                  <div className="text-[10px] font-semibold text-neutral-500 truncate" title={type}>
                    {type}
                  </div>
                  <div className="text-sm font-black text-primary tabular-nums whitespace-nowrap leading-tight mt-0.5">
                    €{price.toLocaleString()}
                  </div>
                  <div className="text-[9px] text-neutral-400 tabular-nums mt-0.5">
                    {formatTypicalSize(size)}
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[9px] text-neutral-400 mt-1.5 text-right">
              Based on avg €{stats.avgPricePerSqm.toLocaleString()}/m² × typical sizes
            </p>
          </div>
        )}

        {/* ── Investment grade detail ─────────────────────── */}
        <div className={`flex items-center gap-3 p-3 rounded-lg border ${grade.bg} ${grade.text === 'text-green-700' ? 'border-green-200' : grade.text === 'text-blue-700' ? 'border-blue-200' : grade.text === 'text-amber-700' ? 'border-amber-200' : 'border-red-200'}`}>
          <ShieldCheckIcon className={`w-5 h-5 flex-shrink-0 ${grade.text}`} />
          <div>
            <div className={`text-xs font-bold ${grade.text}`}>Grade {grade.grade} — {grade.label}</div>
            <div className={`text-[10px] ${grade.text} opacity-75`}>{grade.desc}</div>
          </div>
        </div>

        {/* ── Buyer demand ────────────────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-neutral-700 flex items-center gap-1.5">
              <FireIcon className="w-3.5 h-3.5 text-amber-500" />
              Buyer Demand
            </span>
            <span className="text-xs font-bold text-neutral-700">
              {stats.demandScore >= 70 ? '🔥 High' : stats.demandScore >= 40 ? '📊 Medium' : '📉 Low'}
              <span className="text-neutral-400 font-normal ml-1">({stats.demandScore}/100)</span>
            </span>
          </div>
          <div className="w-full h-2.5 bg-neutral-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all duration-700"
              style={{ width: `${clamp(stats.demandScore, 0, 100)}%` }}
            />
          </div>
          <div className="flex justify-between mt-1 text-[9px] text-neutral-400">
            <span>0</span><span>50</span><span>100</span>
          </div>
        </div>

        {/* ── Property mix ────────────────────────────────── */}
        <div>
          <p className="text-xs font-medium text-neutral-700 mb-2.5 flex items-center gap-1.5">
            <ChartBarIcon className="w-3.5 h-3.5 text-primary" />
            Property Mix
          </p>
          <div className="space-y-2">
            {[
              { label: 'Apartments', value: stats.propertyMix.apartments, color: 'from-blue-400 to-blue-500' },
              { label: 'Houses',     value: stats.propertyMix.houses,     color: 'from-emerald-400 to-emerald-500' },
              { label: 'Commercial', value: stats.propertyMix.commercial, color: 'from-violet-400 to-violet-500' },
            ].map(({ label, value, color }) => (
              <div key={label} className="flex items-center gap-2">
                <span className="text-[10px] text-neutral-500 w-20 flex-shrink-0">{label}</span>
                <div className="flex-1 h-2 bg-neutral-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${color} transition-all duration-700`}
                    style={{ width: `${clamp(value, 0, 100)}%` }}
                  />
                </div>
                <span className="text-[10px] font-semibold text-neutral-600 w-8 text-right">{value}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Highlights ──────────────────────────────────── */}
        {stats.highlights.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider">Highlights</p>
            {stats.highlights.map((h, i) => (
              <div key={i} className="flex items-start gap-2 p-2.5 bg-neutral-50 rounded-lg">
                <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                <p className="text-xs text-neutral-700 leading-relaxed">{h}</p>
              </div>
            ))}
          </div>
        )}

        {/* ── CTA ─────────────────────────────────────────── */}
        <button
          onClick={() => onViewListings?.(suburb)}
          className="w-full py-3 px-4 bg-primary text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2 hover:bg-primary-dark active:scale-[0.98] transition-all shadow-sm shadow-primary/20 mt-1"
        >
          <MapPinIcon className="w-4 h-4 flex-shrink-0" />
          <span>View Listings in {name}</span>
          <svg className="w-4 h-4 ml-auto flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>

      </div>
    </div>
  );
};

export default SuburbDetailPanel;
