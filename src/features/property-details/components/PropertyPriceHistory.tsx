/**
 * PropertyPriceHistory — full price history section for a property detail page.
 *
 * Sections:
 *   1. Stats row  — current price, starting price, total change, price/m²
 *   2. Price trend area chart (SVG, no external library)
 *   3. Per-change bar chart (positive / negative bars)
 *   4. Change event timeline list
 *   5. Rental price-interval schedule (rental properties only)
 */

import React, { useState, useMemo, useId } from 'react';
import type { Property, PriceHistoryEntry, PriceInterval } from '@/src/shared/types';
import { usePriceHistory } from '../hooks/usePriceHistory';

// ── SVG chart constants ────────────────────────────────────────────────────────
const W = 700;
const H = 240;
const PAD = { top: 24, right: 16, bottom: 36, left: 68 };
const PW = W - PAD.left - PAD.right;
const PH = H - PAD.top - PAD.bottom;

// ── Small helpers ──────────────────────────────────────────────────────────────
function fmtEur(n: number) {
  return `€${n.toLocaleString()}`;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

function fmtDateShort(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
}

function pct(n: number) {
  return `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`;
}

// ── Sub-components ─────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  color?: string;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, sub, color }) => (
  <div className="flex-1 min-w-0 bg-white rounded-xl border border-neutral-100 px-3 py-3 sm:px-4">
    <p className="text-[10px] sm:text-xs uppercase tracking-wider text-neutral-400 font-semibold mb-0.5 truncate">{label}</p>
    <p className={`text-base sm:text-lg font-black truncate ${color ?? 'text-neutral-900'}`}>{value}</p>
    {sub && <p className="text-[10px] sm:text-xs text-neutral-400 mt-0.5 truncate">{sub}</p>}
  </div>
);

// ── Price Trend Area Chart ─────────────────────────────────────────────────────

interface TrendPoint {
  x: number;
  y: number;
  entry: PriceHistoryEntry;
}

interface PriceTrendChartProps {
  entries: PriceHistoryEntry[];
}

const PriceTrendChart: React.FC<PriceTrendChartProps> = ({ entries }) => {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const uid = useId();

  const { points, min, max, yTicks, xTicks, linePath, areaPath, isOverall } = useMemo(() => {
    const prices = entries.map((e) => e.price);
    const minP = Math.min(...prices) * 0.97;
    const maxP = Math.max(...prices) * 1.03;
    const range = maxP - minP || 1;

    const pts: TrendPoint[] = entries.map((e, i) => ({
      x: PAD.left + (entries.length > 1 ? (i / (entries.length - 1)) * PW : PW / 2),
      y: PAD.top + PH - ((e.price - minP) / range) * PH,
      entry: e,
    }));

    const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
    const area =
      pts.length > 1
        ? `${line} L ${pts[pts.length - 1].x.toFixed(1)} ${(PAD.top + PH).toFixed(1)} L ${pts[0].x.toFixed(1)} ${(PAD.top + PH).toFixed(1)} Z`
        : '';

    const yT = [0, 0.25, 0.5, 0.75, 1].map((t) => ({
      y: PAD.top + PH - t * PH,
      label: `€${Math.round(minP + (maxP - minP) * t).toLocaleString()}`,
    }));

    const step = Math.max(1, Math.floor(pts.length / 5));
    const xT = pts.filter((_, i) => i % step === 0 || i === pts.length - 1);

    const first = entries[0].price;
    const last = entries[entries.length - 1].price;

    return {
      points: pts,
      min: minP,
      max: maxP,
      yTicks: yT,
      xTicks: xT,
      linePath: line,
      areaPath: area,
      isOverall: last >= first,
    };
  }, [entries]);

  const hovered = hoverIdx != null ? points[hoverIdx] : null;
  const lineColor = isOverall ? '#22c55e' : '#ef4444';
  const gradId = `${uid}-grad`;
  const gradStart = isOverall ? '#22c55e' : '#ef4444';

  return (
    <div className="relative w-full">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto"
        onMouseLeave={() => setHoverIdx(null)}
        onMouseMove={(e) => {
          const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
          const mx = ((e.clientX - rect.left) / rect.width) * W;
          let ci = 0;
          let cd = Infinity;
          points.forEach((p, i) => {
            const d = Math.abs(p.x - mx);
            if (d < cd) { cd = d; ci = i; }
          });
          setHoverIdx(ci);
        }}
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={gradStart} stopOpacity="0.28" />
            <stop offset="100%" stopColor={gradStart} stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* Y grid + labels */}
        {yTicks.map((t, i) => (
          <g key={i}>
            <line x1={PAD.left} x2={W - PAD.right} y1={t.y} y2={t.y} stroke="#f1f5f9" strokeWidth="1" />
            <text x={PAD.left - 8} y={t.y + 4} fontSize="10" fill="#94a3b8" textAnchor="end">{t.label}</text>
          </g>
        ))}

        {/* X labels */}
        {xTicks.map((p, i) => (
          <text key={i} x={p.x} y={H - PAD.bottom + 16} fontSize="10" fill="#94a3b8" textAnchor="middle">
            {fmtDateShort(p.entry.changedAt)}
          </text>
        ))}

        {/* Area fill */}
        {areaPath && <path d={areaPath} fill={`url(#${gradId})`} />}

        {/* Line */}
        <path d={linePath} stroke={lineColor} strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />

        {/* Change-type event dots */}
        {points.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={hoverIdx === i ? 6 : 4}
            fill={p.entry.changeType === 'increase' ? '#22c55e' : p.entry.changeType === 'decrease' ? '#ef4444' : '#6366f1'}
            stroke="white"
            strokeWidth="2"
          />
        ))}

        {/* Hover guide */}
        {hovered && (
          <line
            x1={hovered.x} x2={hovered.x}
            y1={PAD.top} y2={PAD.top + PH}
            stroke="#64748b"
            strokeDasharray="3 3"
            strokeWidth="1"
          />
        )}
      </svg>

      {/* Hover tooltip */}
      {hovered && (
        <div
          className="absolute pointer-events-none bg-neutral-900 text-white text-xs rounded-xl shadow-xl px-3 py-2 z-10 whitespace-nowrap"
          style={{ left: `${(hovered.x / W) * 100}%`, top: 8, transform: 'translateX(-50%)' }}
        >
          <p className="font-bold">{fmtDate(hovered.entry.changedAt)}</p>
          <p className="text-base font-black mt-0.5">{fmtEur(hovered.entry.price)}</p>
          {hovered.entry.previousPrice != null && (
            <p className={`text-[11px] mt-0.5 ${hovered.entry.changeType === 'increase' ? 'text-green-400' : hovered.entry.changeType === 'decrease' ? 'text-red-400' : 'text-neutral-400'}`}>
              {hovered.entry.changeType === 'increase' ? '▲' : hovered.entry.changeType === 'decrease' ? '▼' : '●'}{' '}
              {fmtEur(Math.abs(hovered.entry.price - hovered.entry.previousPrice))}
              {hovered.entry.percentageChange != null && ` (${pct(hovered.entry.percentageChange)})`}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

// ── Per-Change Bar Chart ───────────────────────────────────────────────────────

interface ChangeBarChartProps {
  entries: PriceHistoryEntry[];
}

const ChangeBarChart: React.FC<ChangeBarChartProps> = ({ entries }) => {
  const changes = entries.filter((e) => e.changeType !== 'initial' && e.previousPrice != null);
  if (changes.length === 0) return null;

  const amounts = changes.map((e) => e.price - (e.previousPrice ?? e.price));
  const maxAbs = Math.max(...amounts.map(Math.abs), 1);

  const BAR_H = 28;
  const BAR_GAP = 8;
  const LABEL_W = 72;
  const BAR_AREA = 280;
  const svgH = changes.length * (BAR_H + BAR_GAP) + 8;

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${LABEL_W + BAR_AREA + 80} ${svgH}`} className="w-full h-auto min-w-[320px]">
        {/* Center axis */}
        <line
          x1={LABEL_W + BAR_AREA / 2} x2={LABEL_W + BAR_AREA / 2}
          y1={0} y2={svgH}
          stroke="#e2e8f0" strokeWidth="1"
        />

        {changes.map((e, i) => {
          const delta = e.price - (e.previousPrice ?? e.price);
          const isPos = delta > 0;
          const barW = (Math.abs(delta) / maxAbs) * (BAR_AREA / 2 - 4);
          const cx = LABEL_W + BAR_AREA / 2;
          const y = i * (BAR_H + BAR_GAP) + 4;
          const barX = isPos ? cx : cx - barW;
          const color = isPos ? '#22c55e' : '#ef4444';

          return (
            <g key={e.id ?? i}>
              {/* Date label */}
              <text x={LABEL_W - 6} y={y + BAR_H / 2 + 4} fontSize="10" fill="#94a3b8" textAnchor="end">
                {fmtDateShort(e.changedAt)}
              </text>

              {/* Bar */}
              <rect x={barX} y={y} width={Math.max(barW, 2)} height={BAR_H} rx="4" fill={color} fillOpacity="0.85" />

              {/* Amount label — always on the open side of the chart */}
              <text
                x={isPos ? barX + barW + 6 : cx + 6}
                y={y + BAR_H / 2 + 4}
                fontSize="10"
                fill={color}
                fontWeight="700"
                textAnchor="start"
              >
                {isPos ? '+' : ''}{fmtEur(delta)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

// ── Price Intervals Schedule (rentals) ─────────────────────────────────────────

interface PriceIntervalsProps {
  intervals: PriceInterval[];
  currentPrice: number;
}

const PriceIntervalsSection: React.FC<PriceIntervalsProps> = ({ intervals, currentPrice }) => {
  if (intervals.length === 0) return null;

  const now = Date.now();
  const sorted = [...intervals].sort((a, b) => a.startDate - b.startDate);

  return (
    <div className="mt-8">
      <h4 className="text-sm font-bold text-neutral-800 mb-3 flex items-center gap-2">
        <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        Pricing Schedule
      </h4>

      <div className="space-y-2">
        {sorted.map((iv, i) => {
          const isActive = iv.startDate <= now && (!iv.endDate || iv.endDate >= now);
          return (
            <div
              key={i}
              className={`flex items-center justify-between rounded-xl px-4 py-3 border ${
                isActive
                  ? 'bg-primary/5 border-primary/20'
                  : 'bg-neutral-50 border-neutral-100'
              }`}
            >
              <div className="min-w-0">
                {iv.label && <p className="text-xs font-semibold text-neutral-700 truncate">{iv.label}</p>}
                <p className="text-[11px] text-neutral-500">
                  {new Date(iv.startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                  {' – '}
                  {iv.endDate
                    ? new Date(iv.endDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
                    : 'Ongoing'}
                </p>
              </div>
              <div className="text-right flex-shrink-0 ml-4">
                <p className={`text-base font-black ${isActive ? 'text-primary' : 'text-neutral-700'}`}>
                  {fmtEur(iv.price)}<span className="text-xs font-normal text-neutral-500">/mo</span>
                </p>
                {isActive && (
                  <span className="text-[10px] font-bold text-primary bg-primary/10 rounded-full px-2 py-0.5">Current</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ── Change Timeline List ───────────────────────────────────────────────────────

interface ChangeTimelineProps {
  entries: PriceHistoryEntry[];
  sqft?: number;
}

const ChangeTimeline: React.FC<ChangeTimelineProps> = ({ entries, sqft }) => (
  <div className="mt-6">
    <h4 className="text-sm font-bold text-neutral-800 mb-3">Price Change History</h4>
    <div className="relative">
      {/* Vertical line */}
      <div className="absolute left-[18px] top-0 bottom-0 w-px bg-neutral-100" />

      <div className="space-y-3">
        {[...entries].reverse().map((e, i) => {
          const delta = e.previousPrice != null ? e.price - e.previousPrice : null;
          const isDown = e.changeType === 'decrease';
          const dotColor = e.changeType === 'increase' ? 'bg-green-500' : isDown ? 'bg-red-500' : 'bg-indigo-500';
          const badgeColor = e.changeType === 'increase'
            ? 'bg-green-50 text-green-700 border-green-200'
            : isDown
            ? 'bg-red-50 text-red-700 border-red-200'
            : 'bg-indigo-50 text-indigo-700 border-indigo-200';

          return (
            <div key={e.id ?? i} className="flex items-start gap-3 pl-2">
              {/* Dot */}
              <div className={`w-4 h-4 rounded-full flex-shrink-0 mt-1 ring-2 ring-white shadow-sm ${dotColor}`} />

              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-bold text-neutral-900">{fmtEur(e.price)}</p>
                  {sqft && sqft > 0 && (
                    <span className="text-xs text-neutral-400">({fmtEur(Math.round(e.price / sqft))}/m²)</span>
                  )}
                  {delta != null && (
                    <span className={`text-[10px] font-bold border rounded-full px-2 py-0.5 ${badgeColor}`}>
                      {delta > 0 ? '▲' : '▼'} {fmtEur(Math.abs(delta))}
                      {e.percentageChange != null && ` (${pct(e.percentageChange)})`}
                    </span>
                  )}
                  {e.changeType === 'initial' && (
                    <span className="text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full px-2 py-0.5">
                      Listed
                    </span>
                  )}
                </div>
                <p className="text-xs text-neutral-400 mt-0.5">{fmtDate(e.changedAt)}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  </div>
);

// ── Main Component ─────────────────────────────────────────────────────────────

interface PropertyPriceHistoryProps {
  property: Property;
}

const PropertyPriceHistory: React.FC<PropertyPriceHistoryProps> = ({ property }) => {
  const { data, isLoading } = usePriceHistory(property.id);

  // ── Derive all values from the property prop first so the section always
  // renders. DB history (from the API) optionally enriches it.
  const currentPrice = data?.currentPrice ?? property.price;
  const originalPrice = data?.originalPrice ?? property.originalPrice;
  const effectiveSqft = data?.sqft ?? property.sqft;
  const isRental = (data?.listingType ?? property.listingType) === 'rent';
  const priceIntervals: PriceInterval[] = data?.priceIntervals ?? property.priceIntervals ?? [];

  // Normalise priceReducedAt to ISO string regardless of whether it came from
  // the API (already ISO) or the property prop (unix timestamp in ms).
  const priceReducedAt: string | undefined = data?.priceReducedAt
    ? data.priceReducedAt
    : property.priceReducedAt
    ? new Date(property.priceReducedAt).toISOString()
    : undefined;

  const listedAt: string = data?.createdAt
    ? data.createdAt
    : property.createdAt
    ? new Date(property.createdAt).toISOString()
    : new Date().toISOString();

  // Snapshot DB count before synthesis so it always reflects real recorded changes.
  const dbHistoryCount = data?.history?.length ?? 0;

  // Build working history: real DB records take priority; synthesise if none.
  let workingHistory: PriceHistoryEntry[] = data?.history?.length ? [...data.history] : [];

  if (workingHistory.length === 0) {
    if (originalPrice && originalPrice > currentPrice && priceReducedAt) {
      workingHistory = [
        {
          id: 'synth-orig',
          propertyId: property.id,
          price: originalPrice,
          changeType: 'initial' as const,
          changedAt: listedAt,
        },
        {
          id: 'synth-curr',
          propertyId: property.id,
          price: currentPrice,
          previousPrice: originalPrice,
          changeType: 'decrease' as const,
          percentageChange: parseFloat(
            (((currentPrice - originalPrice) / originalPrice) * 100).toFixed(1)
          ),
          changedAt: priceReducedAt,
        },
      ];
    } else {
      workingHistory = [
        {
          id: 'synth-listed',
          propertyId: property.id,
          price: currentPrice,
          changeType: 'initial' as const,
          changedAt: listedAt,
        },
      ];
    }
  }

  const first = workingHistory[0];
  const last = workingHistory[workingHistory.length - 1];
  const startingPrice = first.price;
  const totalDelta = last.price !== startingPrice ? last.price - startingPrice : null;
  const totalPct =
    totalDelta != null && startingPrice > 0
      ? (totalDelta / startingPrice) * 100
      : null;
  const daysSinceLast = Math.floor(
    (Date.now() - new Date(last.changedAt).getTime()) / 86400000
  );
  const isDown = totalDelta != null && totalDelta < 0;
  const nonInitialCount = workingHistory.filter((e) => e.changeType !== 'initial').length;

  // Memoize price/m² series so PriceTrendChart's internal useMemo isn't busted
  // by a new array reference on every render.
  const pricePerSqftEntries = useMemo(
    () =>
      effectiveSqft && effectiveSqft > 0 && workingHistory.length >= 2
        ? workingHistory.map((e) => ({
            ...e,
            price: parseFloat((e.price / effectiveSqft).toFixed(0)),
          }))
        : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [workingHistory, effectiveSqft]
  );

  return (
    <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm p-4 sm:p-6">
      <SectionHeader count={dbHistoryCount} />

      {/* Stats Row */}
      <div className="flex flex-wrap gap-2 sm:gap-3 mb-6">
        <StatCard label="Current Price" value={fmtEur(currentPrice)} color="text-primary" />

        {totalDelta != null && totalPct != null && startingPrice !== currentPrice && (
          <>
            <StatCard label="Listed At" value={fmtEur(startingPrice)} />
            <StatCard
              label="Total Change"
              value={`${isDown ? '▼' : '▲'} ${fmtEur(Math.abs(totalDelta))}`}
              sub={`${isDown ? '' : '+'}${totalPct.toFixed(1)}%`}
              color={isDown ? 'text-red-600' : 'text-green-600'}
            />
          </>
        )}

        {effectiveSqft && effectiveSqft > 0 && (
          <StatCard label="Price / m²" value={fmtEur(Math.round(currentPrice / effectiveSqft))} />
        )}

        <StatCard
          label={dbHistoryCount > 0 ? 'Last Changed' : 'Listed'}
          value={daysSinceLast === 0 ? 'Today' : `${daysSinceLast}d ago`}
          sub={
            dbHistoryCount > 0
              ? `${dbHistoryCount} change${dbHistoryCount !== 1 ? 's' : ''} recorded`
              : fmtDate(listedAt)
          }
        />
      </div>

      {/* Loading overlay — shimmer over chart area while DB history fetches */}
      {isLoading && (
        <div className="h-60 bg-neutral-50 rounded-xl animate-pulse mb-6" />
      )}

      {!isLoading && (
        <>
          {/* Trend chart — needs ≥ 2 points */}
          {workingHistory.length >= 2 && (
            <div className="mb-8">
              <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-3">Price Trend</h4>
              <PriceTrendChart entries={workingHistory} />
            </div>
          )}

          {/* Bar chart — needs ≥ 2 non-initial change events */}
          {nonInitialCount >= 2 && (
            <div className="mb-8">
              <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-3">Change Magnitude</h4>
              <ChangeBarChart entries={workingHistory} />
            </div>
          )}

          {/* Price/m² trend — needs ≥ 2 points and sqft */}
          {pricePerSqftEntries && (
            <div className="mb-8">
              <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-3">Price per m² Trend</h4>
              <PriceTrendChart entries={pricePerSqftEntries} />
              <p className="text-[10px] text-neutral-400 text-right mt-1">Values in €/m²</p>
            </div>
          )}
        </>
      )}

      {/* Timeline list — always visible */}
      <ChangeTimeline entries={workingHistory} sqft={effectiveSqft} />

      {/* Rental pricing schedule */}
      {isRental && priceIntervals.length > 0 && (
        <PriceIntervalsSection intervals={priceIntervals} currentPrice={currentPrice} />
      )}
    </div>
  );
};

// ── Tiny shared header ─────────────────────────────────────────────────────────

const SectionHeader: React.FC<{ count?: number }> = ({ count }) => (
  <div className="flex items-center gap-2 mb-5">
    <svg className="w-5 h-5 text-primary flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
    </svg>
    <h3 className="text-lg font-bold text-neutral-900">Price History</h3>
    {count != null && count > 0 && (
      <span className="text-xs font-bold bg-primary/10 text-primary rounded-full px-2 py-0.5">
        {count} {count === 1 ? 'record' : 'records'}
      </span>
    )}
  </div>
);

export default PropertyPriceHistory;
