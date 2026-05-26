/**
 * PriceHistoryChart — lightweight SVG area chart for 8-year quarterly price history.
 * No external chart library dependency.
 */

import React, { useMemo, useState } from 'react';
import type { QuarterlyPricePoint } from '@/src/shared/types/cityInsights.types';
import { ArrowTrendingUpIcon, ArrowTrendingDownIcon, ChartBarIcon } from '@/constants';

export interface PriceHistoryChartProps {
  history: QuarterlyPricePoint[];
  dataSource: 'bis' | 'estimated';
  fredUrl: string | null;
  city: string;
}

const WIDTH = 760;
const HEIGHT = 280;
const PADDING = { top: 30, right: 20, bottom: 36, left: 60 };
const PLOT_W = WIDTH - PADDING.left - PADDING.right;
const PLOT_H = HEIGHT - PADDING.top - PADDING.bottom;

const PriceHistoryChart: React.FC<PriceHistoryChartProps> = ({
  history,
  dataSource,
  fredUrl,
  city,
}) => {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const { min, max, points, growthYoY, growth5y, latest } = useMemo(() => {
    if (history.length === 0) {
      return { min: 0, max: 0, points: [], growthYoY: 0, growth5y: 0, latest: null as QuarterlyPricePoint | null };
    }
    const prices = history.map((h) => h.pricePerSqm);
    const minP = Math.min(...prices);
    const maxP = Math.max(...prices);
    const range = maxP - minP || 1;
    const last = history[history.length - 1];
    const yearAgo = history[Math.max(0, history.length - 5)];
    const fiveYearAgo = history[0];

    const pts = history.map((h, i) => {
      const x = PADDING.left + (i / (history.length - 1)) * PLOT_W;
      const y = PADDING.top + PLOT_H - ((h.pricePerSqm - minP) / range) * PLOT_H;
      return { x, y, point: h };
    });

    const gYoY = yearAgo?.pricePerSqm
      ? ((last.pricePerSqm - yearAgo.pricePerSqm) / yearAgo.pricePerSqm) * 100
      : 0;
    const g5y = fiveYearAgo?.pricePerSqm
      ? ((last.pricePerSqm - fiveYearAgo.pricePerSqm) / fiveYearAgo.pricePerSqm) * 100
      : 0;

    return {
      min: minP,
      max: maxP,
      points: pts,
      growthYoY: parseFloat(gYoY.toFixed(1)),
      growth5y: parseFloat(g5y.toFixed(1)),
      latest: last,
    };
  }, [history]);

  if (history.length === 0 || !latest) {
    return (
      <div className="h-72 flex items-center justify-center bg-neutral-50 rounded-xl">
        <p className="text-neutral-400 text-sm">No price history available</p>
      </div>
    );
  }

  // Build smooth path (area + line)
  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${PADDING.top + PLOT_H} L ${points[0].x} ${PADDING.top + PLOT_H} Z`;

  // Y axis: 4 ticks
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((t) => {
    const value = min + (max - min) * t;
    const y = PADDING.top + PLOT_H - t * PLOT_H;
    return { y, label: `€${Math.round(value).toLocaleString()}` };
  });

  // X axis: show ~6 year labels
  const xTickStep = Math.max(1, Math.floor(points.length / 6));
  const xTicks = points.filter((_, i) => i % xTickStep === 0 || i === points.length - 1);

  const hovered = hoverIdx != null ? points[hoverIdx] : null;
  const isGrowing = growthYoY >= 0;

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
        <div>
          <h3 className="text-lg font-bold text-neutral-900 flex items-center gap-2">
            <ChartBarIcon className="w-5 h-5 text-primary" />
            8-Year Price History
          </h3>
          <p className="text-xs text-neutral-500 mt-0.5">
            Quarterly €/m² for {city} — {dataSource === 'bis' ? 'BIS Residential Property Price Index' : 'estimated from regional data'}
          </p>
        </div>
        <div className="flex gap-2">
          <div className="px-3 py-1.5 rounded-lg bg-neutral-50 border border-neutral-200">
            <p className="text-[10px] uppercase tracking-wider text-neutral-400 font-semibold">YoY</p>
            <p className={`text-sm font-black flex items-center gap-1 ${isGrowing ? 'text-green-600' : 'text-red-500'}`}>
              {isGrowing ? <ArrowTrendingUpIcon className="w-3.5 h-3.5" /> : <ArrowTrendingDownIcon className="w-3.5 h-3.5" />}
              {isGrowing ? '+' : ''}{growthYoY}%
            </p>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-neutral-50 border border-neutral-200">
            <p className="text-[10px] uppercase tracking-wider text-neutral-400 font-semibold">5-Year</p>
            <p className={`text-sm font-black ${growth5y >= 0 ? 'text-green-600' : 'text-red-500'}`}>
              {growth5y >= 0 ? '+' : ''}{growth5y}%
            </p>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-primary/5 border border-primary/20">
            <p className="text-[10px] uppercase tracking-wider text-primary/70 font-semibold">Current</p>
            <p className="text-sm font-black text-primary">€{latest.pricePerSqm.toLocaleString()}/m²</p>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="relative">
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="w-full h-auto"
          onMouseLeave={() => setHoverIdx(null)}
          onMouseMove={(e) => {
            const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width) * WIDTH;
            // Find closest point
            let closestI = 0;
            let closestDist = Infinity;
            points.forEach((p, i) => {
              const d = Math.abs(p.x - x);
              if (d < closestDist) {
                closestDist = d;
                closestI = i;
              }
            });
            setHoverIdx(closestI);
          }}
        >
          <defs>
            <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {/* Y grid lines */}
          {yTicks.map((t, i) => (
            <g key={i}>
              <line x1={PADDING.left} x2={WIDTH - PADDING.right} y1={t.y} y2={t.y} stroke="#f1f5f9" strokeWidth="1" />
              <text x={PADDING.left - 8} y={t.y + 3} fontSize="10" fill="#94a3b8" textAnchor="end">
                {t.label}
              </text>
            </g>
          ))}

          {/* X axis labels (years) */}
          {xTicks.map((p, i) => (
            <text
              key={i}
              x={p.x}
              y={HEIGHT - PADDING.bottom + 16}
              fontSize="10"
              fill="#94a3b8"
              textAnchor="middle"
            >
              {p.point.period}
            </text>
          ))}

          {/* Area + line */}
          <path d={areaPath} fill="url(#areaGrad)" />
          <path d={linePath} stroke="#3b82f6" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />

          {/* Hover guide line + circle */}
          {hovered && (
            <>
              <line
                x1={hovered.x}
                x2={hovered.x}
                y1={PADDING.top}
                y2={PADDING.top + PLOT_H}
                stroke="#3b82f6"
                strokeDasharray="3 3"
                strokeWidth="1"
              />
              <circle cx={hovered.x} cy={hovered.y} r="5" fill="white" stroke="#3b82f6" strokeWidth="2.5" />
            </>
          )}
        </svg>

        {/* Hover tooltip */}
        {hovered && (
          <div
            className="absolute pointer-events-none bg-neutral-900 text-white text-xs rounded-lg shadow-lg px-3 py-2"
            style={{
              left: `${(hovered.x / WIDTH) * 100}%`,
              top: 8,
              transform: 'translateX(-50%)',
            }}
          >
            <p className="font-bold">{hovered.point.period}</p>
            <p>€{hovered.point.pricePerSqm.toLocaleString()}/m²</p>
            {hovered.point.transactionVolume != null && (
              <p className="text-[10px] text-neutral-300 mt-0.5">~{hovered.point.transactionVolume} transactions</p>
            )}
          </div>
        )}
      </div>

      {/* Footer with source */}
      <div className="mt-3 flex items-center justify-between text-[10px] text-neutral-400">
        <span>{history.length} quarterly observations</span>
        <span>
          Source:{' '}
          {fredUrl ? (
            <a
              href={fredUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:underline"
            >
              FRED · BIS Residential Property Price Index ↗
            </a>
          ) : (
            'estimated from regional comparable cities'
          )}
        </span>
      </div>
    </div>
  );
};

export default PriceHistoryChart;
