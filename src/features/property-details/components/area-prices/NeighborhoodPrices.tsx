/**
 * NeighborhoodPrices — what the homes around this one ask and sold for.
 *
 *   1. Headline     — this home's €/m² against the neighbourhood median
 *   2. Stat tiles   — median asking / sold €/m², homes for sale, sold nearby
 *   3. Price strip  — every neighbour on one €/m² line, this home marked
 *   4. Map          — nearby homes pinned with their prices
 *   5. Trend        — median asking vs sold €/m² per quarter
 *   6. List         — recent sales and homes for sale nearby
 *
 * Sold homes are kept for good, so this is the street's price history.
 */

import React, { Suspense, lazy, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Property } from '@/types';
import { optimizeCloudinaryUrl } from '@/config/cloudinaryConfig';
import { navigate } from '@/src/app/router/navigation';
import { paths } from '@/src/app/router/paths';
import { useAreaPrices } from '../../hooks/useAreaPrices';
import type { AreaNeighbour } from '../../api/areaPricesApi';
import AreaPriceTrendChart from './AreaPriceTrendChart';
import { AREA_COLORS, colorFor, fmtDistance, fmtEur, fmtMonthYear } from './format';
import { useWidth } from './useWidth';

const NeighborhoodPriceMap = lazy(() => import('./NeighborhoodPriceMap'));

const LIST_SIZE = 6;

// ── Price strip ───────────────────────────────────────────────────────────────

const SH = 132;
const SPAD = { left: 24, right: 24 };
const DOT_R = 6;
const AXIS_Y = 78;

interface StripProps {
  neighbours: AreaNeighbour[];
  subjectPricePerSqm: number | null;
  median: number | null;
  closedLabel: string;
  highlightedId: string | null;
  onHighlight: (id: string | null) => void;
}

const PriceStrip: React.FC<StripProps> = ({ neighbours, subjectPricePerSqm, median, closedLabel, highlightedId, onHighlight }) => {
  const { t } = useTranslation(['property']);
  const [ref, SW] = useWidth<HTMLDivElement>(700);

  const layout = useMemo(() => {
    const priced = neighbours.filter((n) => n.pricePerSqm !== null) as Array<AreaNeighbour & { pricePerSqm: number }>;
    const values = priced.map((n) => n.pricePerSqm);
    if (subjectPricePerSqm !== null) values.push(subjectPricePerSqm);
    const lo = Math.min(...values);
    const hi = Math.max(...values);
    const range = hi - lo || 1;
    const x = (v: number) => SPAD.left + ((v - lo) / range) * (SW - SPAD.left - SPAD.right);

    // Beeswarm: stack dots upwards from the axis so none overlap.
    const placed: Array<{ n: AreaNeighbour; x: number; y: number }> = [];
    for (const n of [...priced].sort((a, b) => a.pricePerSqm - b.pricePerSqm)) {
      const cx = x(n.pricePerSqm);
      let lane = 0;
      while (placed.some((p) => Math.abs(p.x - cx) < DOT_R * 2 + 2 && p.y === AXIS_Y - 10 - lane * (DOT_R * 2 + 2))) lane++;
      placed.push({ n, x: cx, y: AXIS_Y - 10 - Math.min(lane, 4) * (DOT_R * 2 + 2) });
    }
    return { x, placed, lo, hi };
  }, [neighbours, subjectPricePerSqm, SW]);

  const [hover, setHover] = useState<{ n: AreaNeighbour; x: number; y: number } | null>(null);

  return (
    <div ref={ref} className="relative">
      <svg viewBox={`0 0 ${SW} ${SH}`} width={SW} height={SH} className="block max-w-full overflow-visible" role="img" aria-label={t('property:areaPrices.stripTitle', 'Where this home sits')}>
        <line x1={SPAD.left} x2={SW - SPAD.right} y1={AXIS_Y} y2={AXIS_Y} stroke="#e2e8f0" strokeWidth={2} strokeLinecap="round" />

        {median !== null && (
          <g>
            <line x1={layout.x(median)} x2={layout.x(median)} y1={14} y2={AXIS_Y + 6} stroke="#94a3b8" strokeDasharray="3 3" />
            <text x={layout.x(median)} y={AXIS_Y + 34} fontSize="11" fill="#64748b" textAnchor="middle">
              {t('property:areaPrices.median', 'Median')} {fmtEur(median)}
            </text>
          </g>
        )}

        {layout.placed.map((p) => (
          <g
            key={p.n.id}
            className="cursor-pointer"
            onMouseEnter={() => { setHover(p); onHighlight(p.n.id); }}
            onMouseLeave={() => { setHover(null); onHighlight(null); }}
            onClick={() => navigate(paths.property(p.n.id))}
          >
            {/* Hit target bigger than the mark */}
            <circle cx={p.x} cy={p.y} r={DOT_R + 4} fill="transparent" />
            <circle
              cx={p.x}
              cy={p.y}
              r={highlightedId === p.n.id ? DOT_R + 2 : DOT_R}
              fill={colorFor(p.n.status)}
              stroke="#fff"
              strokeWidth={2}
              opacity={highlightedId && highlightedId !== p.n.id ? 0.5 : 1}
            />
          </g>
        ))}

        {subjectPricePerSqm !== null && (
          <g>
            <line x1={layout.x(subjectPricePerSqm)} x2={layout.x(subjectPricePerSqm)} y1={AXIS_Y - 4} y2={AXIS_Y + 14} stroke={AREA_COLORS.subject} strokeWidth={2} />
            <path
              d={`M ${layout.x(subjectPricePerSqm)} ${AXIS_Y + 2} l -7 12 h 14 z`}
              fill={AREA_COLORS.subject}
              stroke="#fff"
              strokeWidth={2}
              strokeLinejoin="round"
            />
            <text x={layout.x(subjectPricePerSqm)} y={AXIS_Y + 34} fontSize="11" fontWeight="700" fill="#0b0b0b" textAnchor="middle"
              dy={median !== null && Math.abs(layout.x(median) - layout.x(subjectPricePerSqm)) < 120 ? 14 : 0}>
              {t('property:areaPrices.thisHome', 'This home')} {fmtEur(subjectPricePerSqm)}
            </text>
          </g>
        )}

        <text x={SPAD.left} y={AXIS_Y + 18} fontSize="10" fill="#94a3b8">{fmtEur(layout.lo)}/m²</text>
        <text x={SW - SPAD.right} y={AXIS_Y + 18} fontSize="10" fill="#94a3b8" textAnchor="end">{fmtEur(layout.hi)}/m²</text>
      </svg>

      {hover && (
        <div
          className="pointer-events-none absolute z-10 bg-white border border-neutral-200 shadow-lg rounded-lg px-3 py-2 text-xs whitespace-nowrap"
          style={{
            left: `${(hover.x / SW) * 100}%`,
            top: `${(hover.y / SH) * 100}%`,
            transform: `translate(${hover.x > SW / 2 ? 'calc(-100% - 12px)' : '12px'}, -50%)`,
          }}
        >
          <p className="font-semibold text-neutral-900 max-w-[220px] truncate">{hover.n.title || hover.n.address}</p>
          <p className="text-neutral-700">
            {fmtEur(hover.n.price)}
            {hover.n.pricePerSqm !== null && <span className="text-neutral-500"> · {fmtEur(hover.n.pricePerSqm)}/m²</span>}
          </p>
          <p className="text-neutral-500">
            {hover.n.status === 'active' ? t('property:areaPrices.forSale', 'For sale') : closedLabel}
            {hover.n.closedAt && ` ${fmtMonthYear(hover.n.closedAt)}`} · {fmtDistance(hover.n.distanceM)}
          </p>
        </div>
      )}
    </div>
  );
};

// ── Small pieces ──────────────────────────────────────────────────────────────

const Tile: React.FC<{ label: string; value: string; sub?: string; swatch?: string }> = ({ label, value, sub, swatch }) => (
  <div className="bg-white rounded-xl border border-neutral-100 px-3 py-3 sm:px-4">
    <p className="flex items-center gap-1.5 text-[10px] sm:text-xs uppercase tracking-wider text-neutral-400 font-semibold mb-0.5">
      {swatch && <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: swatch }} />}
      {label}
    </p>
    <p className="text-sm sm:text-base font-black text-neutral-900">{value}</p>
    {sub && <p className="text-[10px] sm:text-xs text-neutral-400 mt-0.5">{sub}</p>}
  </div>
);

const NeighbourRow: React.FC<{
  n: AreaNeighbour;
  closedLabel: string;
  highlighted: boolean;
  onHighlight: (id: string | null) => void;
}> = ({ n, closedLabel, highlighted, onHighlight }) => {
  const { t } = useTranslation(['property']);
  const image = n.imageUrl ? optimizeCloudinaryUrl(n.imageUrl, { width: 160, height: 120, crop: 'fill' }) : undefined;
  return (
    <li>
      <button
        type="button"
        onClick={() => navigate(paths.property(n.id))}
        onMouseEnter={() => onHighlight(n.id)}
        onMouseLeave={() => onHighlight(null)}
        className={`w-full flex items-center gap-3 p-2 rounded-xl text-left transition-colors ${highlighted ? 'bg-neutral-100' : 'hover:bg-neutral-50'}`}
      >
        <div className="relative w-16 h-12 rounded-lg overflow-hidden bg-neutral-100 flex-shrink-0">
          {image && <img src={image} alt="" loading="lazy" className="w-full h-full object-cover" />}
          <span className="absolute bottom-0 inset-x-0 h-1" style={{ background: colorFor(n.status) }} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-neutral-900 truncate">{n.title || n.address}</p>
          <p className="text-xs text-neutral-500">
            {n.status === 'active'
              ? t('property:areaPrices.forSale', 'For sale')
              : `${closedLabel}${n.closedAt ? ` ${fmtMonthYear(n.closedAt)}` : ''}`}
            {' · '}
            {fmtDistance(n.distanceM)}
            {n.sqft ? ` · ${n.sqft} m²` : ''}
          </p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-sm font-bold text-neutral-900">{fmtEur(n.price)}</p>
          {n.pricePerSqm !== null && <p className="text-xs text-neutral-500">{fmtEur(n.pricePerSqm)}/m²</p>}
        </div>
      </button>
    </li>
  );
};

// ── Section ───────────────────────────────────────────────────────────────────

interface Props {
  property: Property;
}

const NeighborhoodPrices: React.FC<Props> = ({ property }) => {
  const { t } = useTranslation(['property']);
  const { data, isLoading, error } = useAreaPrices(property.id);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [tab, setTab] = useState<'closed' | 'active'>('closed');

  const isRent = (data?.listingType ?? property.listingType) === 'rent';
  const closedLabel = isRent ? t('property:areaPrices.rented', 'Rented') : t('property:areaPrices.sold', 'Sold');

  const lists = useMemo(() => {
    const neighbours = data?.neighbours ?? [];
    const closed = neighbours
      .filter((n) => n.status !== 'active')
      .sort((a, b) => (b.closedAt ?? '').localeCompare(a.closedAt ?? ''));
    const active = neighbours.filter((n) => n.status === 'active');
    return { closed, active };
  }, [data]);

  if (isLoading) {
    return (
      <section className="bg-white rounded-2xl border border-neutral-200 p-4 sm:p-6 animate-pulse">
        <div className="h-6 w-56 bg-neutral-100 rounded mb-4" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          {[0, 1, 2, 3].map((i) => <div key={i} className="h-16 bg-neutral-100 rounded-xl" />)}
        </div>
        <div className="h-64 bg-neutral-100 rounded-xl" />
      </section>
    );
  }

  if (error || !data) return null;

  const { stats, subject, neighbours } = data;
  const hasNeighbours = neighbours.length > 0;
  const trendHasData =
    data.trend.filter((p) => p.askingPricePerSqm !== null || p.closedPricePerSqm !== null).length >= 2;
  // The same median the headline percentage is measured against
  const reference = stats.medianPricePerSqm;
  const pct = stats.subjectVsMedianPct;
  const shownList = tab === 'closed' ? lists.closed : lists.active;

  return (
    <section className="bg-gradient-to-br from-white to-neutral-50 rounded-2xl border border-neutral-200 p-4 sm:p-6 shadow-sm">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-2 mb-4">
        <div>
          <h3 className="text-xl sm:text-2xl font-bold text-neutral-800">
            {t('property:areaPrices.title', 'Neighbourhood prices')}
          </h3>
          <p className="text-sm text-neutral-500 mt-0.5">
            {hasNeighbours
              ? t('property:areaPrices.subtitle', 'Nearby homes: {{count}} within {{radius}} km', { count: neighbours.length, radius: data.radiusKm })
              : t('property:areaPrices.empty', 'Not enough homes nearby yet to compare prices.')}
          </p>
        </div>
        {hasNeighbours && !data.sameTypeOnly && (
          <span className="text-xs font-medium text-neutral-600 bg-neutral-100 rounded-full px-2.5 py-1">
            {t('property:areaPrices.allTypes', 'All property types')}
          </span>
        )}
      </div>

      {hasNeighbours && (
        <>
          {/* Headline: how this home compares */}
          {subject.pricePerSqm !== null && pct !== null && (
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mb-4">
              <p className="text-3xl sm:text-4xl font-black text-neutral-900 tracking-tight">
                {fmtEur(subject.pricePerSqm)}
                <span className="text-base font-semibold text-neutral-500">/m²</span>
              </p>
              <p
                className={`inline-flex items-center gap-1 text-sm font-semibold rounded-full px-3 py-1 ${
                  Math.abs(pct) < 3
                    ? 'bg-neutral-100 text-neutral-700'
                    : pct < 0
                      ? 'bg-emerald-50 text-emerald-800'
                      : 'bg-amber-50 text-amber-800'
                }`}
              >
                <span aria-hidden="true">{Math.abs(pct) < 3 ? '≈' : pct < 0 ? '↓' : '↑'}</span>
                {Math.abs(pct) < 3
                  ? t('property:areaPrices.inLine', 'In line with the neighbourhood')
                  : pct < 0
                    ? t('property:areaPrices.below', '{{pct}}% below the neighbourhood median', { pct: Math.abs(pct) })
                    : t('property:areaPrices.above', '{{pct}}% above the neighbourhood median', { pct })}
              </p>
            </div>
          )}

          {/* Stat tiles */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-5">
            <Tile
              label={t('property:areaPrices.medianAsking', 'Asking €/m²')}
              value={stats.medianAskingPricePerSqm !== null ? fmtEur(stats.medianAskingPricePerSqm) : '—'}
              swatch={AREA_COLORS.active}
            />
            <Tile
              label={isRent ? t('property:areaPrices.medianRented', 'Rented €/m²') : t('property:areaPrices.medianSold', 'Sold €/m²')}
              value={stats.medianClosedPricePerSqm !== null ? fmtEur(stats.medianClosedPricePerSqm) : '—'}
              swatch={AREA_COLORS.closed}
            />
            <Tile
              label={t('property:areaPrices.forSaleNearby', 'For sale nearby')}
              value={String(stats.activeCount)}
              sub={stats.medianAskingPrice !== null ? t('property:areaPrices.typically', 'typically {{price}}', { price: fmtEur(stats.medianAskingPrice) }) : undefined}
            />
            <Tile
              label={isRent ? t('property:areaPrices.rentedNearby', 'Rented nearby') : t('property:areaPrices.soldNearby', 'Sold nearby')}
              value={String(stats.closedCount)}
            />
          </div>

          {/* Price strip */}
          <div className="mb-5">
            <h4 className="text-sm font-semibold text-neutral-700 mb-1">
              {t('property:areaPrices.stripTitle', 'Where this home sits')}
            </h4>
            <p className="text-xs text-neutral-500 mb-2">
              {t('property:areaPrices.stripHint', 'Each dot is a home nearby, by price per m². Tap one to open it.')}
            </p>
            <PriceStrip
              neighbours={neighbours}
              subjectPricePerSqm={subject.pricePerSqm}
              median={reference}
              closedLabel={closedLabel}
              highlightedId={highlightedId}
              onHighlight={setHighlightedId}
            />
          </div>

          {/* Map + list side by side on wide screens */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-5">
            <div className="md:col-span-3 h-72 sm:h-80 rounded-xl overflow-hidden border border-neutral-200 relative z-0">
              <Suspense fallback={<div className="w-full h-full bg-neutral-100 animate-pulse" />}>
                <NeighborhoodPriceMap
                  center={data.center}
                  radiusKm={data.radiusKm}
                  subjectPrice={subject.price}
                  neighbours={neighbours}
                  closedLabel={closedLabel}
                  highlightedId={highlightedId}
                  onHighlight={setHighlightedId}
                />
              </Suspense>
            </div>

            <div className="md:col-span-2 min-w-0">
              <div role="tablist" className="flex gap-1 p-1 bg-neutral-100 rounded-xl mb-2">
                {([
                  ['closed', isRent ? t('property:areaPrices.recentlyRented', 'Recently rented') : t('property:areaPrices.recentlySold', 'Recently sold'), lists.closed.length, AREA_COLORS.closed],
                  ['active', t('property:areaPrices.forSale', 'For sale'), lists.active.length, AREA_COLORS.active],
                ] as const).map(([key, label, count, color]) => (
                  <button
                    key={key}
                    type="button"
                    role="tab"
                    aria-selected={tab === key}
                    onClick={() => setTab(key)}
                    className={`flex-1 inline-flex items-center justify-center gap-1.5 text-xs font-semibold py-1.5 rounded-lg transition-colors ${
                      tab === key ? 'bg-white shadow-sm text-neutral-900' : 'text-neutral-500 hover:text-neutral-800'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full" style={{ background: color }} />
                    {label}
                    <span className="text-neutral-400">{count}</span>
                  </button>
                ))}
              </div>
              {shownList.length > 0 ? (
                <ul className="space-y-0.5">
                  {shownList.slice(0, LIST_SIZE).map((n) => (
                    <NeighbourRow key={n.id} n={n} closedLabel={closedLabel} highlighted={highlightedId === n.id} onHighlight={setHighlightedId} />
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-neutral-500 py-6 text-center">
                  {tab === 'closed'
                    ? isRent ? t('property:areaPrices.noneRented', 'No rented homes nearby yet.') : t('property:areaPrices.noneSold', 'No sold homes nearby yet.')
                    : t('property:areaPrices.noneActive', 'No other homes for sale nearby right now.')}
                </p>
              )}
            </div>
          </div>

          {/* Trend */}
          {trendHasData && (
            <div>
              <h4 className="text-sm font-semibold text-neutral-700 mb-1">
                {t('property:areaPrices.trendTitle', 'Price per m² over time')}
              </h4>
              <p className="text-xs text-neutral-500 mb-2">
                {isRent
                  ? t('property:areaPrices.trendHintRent', 'Median per quarter: asking rent when homes were listed, and the rent when they were let.')
                  : t('property:areaPrices.trendHintSale', 'Median per quarter: asking prices when homes were listed, and the price when they sold.')}
              </p>
              <AreaPriceTrendChart trend={data.trend} closedLabel={closedLabel} isRent={isRent} />
            </div>
          )}
        </>
      )}
    </section>
  );
};

export default NeighborhoodPrices;
