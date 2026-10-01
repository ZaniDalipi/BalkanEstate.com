/**
 * Median €/m² per quarter around a property: what homes were listed at, and
 * what they sold (or rented) for. One axis, two series, a crosshair tooltip,
 * and a table view for anyone who would rather read the numbers.
 */

import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { AreaTrendPoint } from '../../api/areaPricesApi';
import { AREA_COLORS, fmtEur, fmtQuarter } from './format';
import { useWidth } from './useWidth';

const H = 230;
const PAD = { top: 16, right: 92, bottom: 30, left: 64 };
const PH = H - PAD.top - PAD.bottom;

type SeriesKey = 'askingPricePerSqm' | 'closedPricePerSqm';

interface Props {
  trend: AreaTrendPoint[];
  closedLabel: string;
  isRent: boolean;
}

/** Path segments that break wherever a quarter has no data. */
const segments = (pts: Array<{ x: number; y: number } | null>): string =>
  pts
    .map((p, i) => {
      if (!p) return '';
      const prev = pts[i - 1];
      return `${prev ? 'L' : 'M'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
    })
    .join(' ');

const AreaPriceTrendChart: React.FC<Props> = ({ trend, closedLabel, isRent }) => {
  const { t } = useTranslation(['property']);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [ref, W] = useWidth<HTMLDivElement>(700);
  const PW = W - PAD.left - PAD.right;

  const askingLabel = t('property:areaPrices.askingPrice', 'Asking price');

  const chart = useMemo(() => {
    const values = trend.flatMap((p) => [p.askingPricePerSqm, p.closedPricePerSqm]).filter((v): v is number => v !== null);
    const lo = Math.min(...values) * 0.95;
    const hi = Math.max(...values) * 1.05;
    const range = hi - lo || 1;
    const x = (i: number) => PAD.left + (trend.length > 1 ? (i / (trend.length - 1)) * PW : PW / 2);
    const y = (v: number) => PAD.top + PH - ((v - lo) / range) * PH;

    const series = (key: SeriesKey) => trend.map((p, i) => (p[key] === null ? null : { x: x(i), y: y(p[key] as number) }));
    const asking = series('askingPricePerSqm');
    const closed = series('closedPricePerSqm');
    const last = (pts: typeof asking) => [...pts].reverse().find((p) => p !== null) ?? null;

    return {
      x,
      asking,
      closed,
      askingEnd: last(asking),
      closedEnd: last(closed),
      yTicks: [0, 1 / 3, 2 / 3, 1].map((f) => ({ y: PAD.top + PH - f * PH, label: fmtEur(lo + range * f) })),
    };
  }, [trend, W, PW]);

  const hovered = hoverIdx !== null ? trend[hoverIdx] : null;
  const labelEvery = Math.ceil(trend.length / Math.max(2, Math.floor(PW / 70)));

  return (
    <div>
      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-2 text-xs text-neutral-600">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-3 h-0.5 rounded-full" style={{ background: AREA_COLORS.active }} />
          {askingLabel}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-3 h-0.5 rounded-full" style={{ background: AREA_COLORS.closed }} />
          {isRent ? t('property:areaPrices.rentedPrice', 'Rent agreed') : t('property:areaPrices.soldPrice', 'Sold price')}
        </span>
      </div>

      <div ref={ref} className="relative">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          width={W}
          height={H}
          className="block max-w-full select-none"
          role="img"
          aria-label={t('property:areaPrices.trendTitle', 'Price per m² over time')}
          onMouseLeave={() => setHoverIdx(null)}
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const mx = ((e.clientX - rect.left) / rect.width) * W;
            const i = Math.round(((mx - PAD.left) / PW) * (trend.length - 1));
            setHoverIdx(Math.min(trend.length - 1, Math.max(0, i)));
          }}
        >
          {chart.yTicks.map((tick, i) => (
            <g key={i}>
              <line x1={PAD.left} x2={W - PAD.right} y1={tick.y} y2={tick.y} stroke="#f1f5f9" />
              <text x={PAD.left - 8} y={tick.y + 4} fontSize="11" fill="#94a3b8" textAnchor="end">{tick.label}</text>
            </g>
          ))}
          {trend.map((p, i) =>
            i % labelEvery === 0 || i === trend.length - 1 ? (
              <text key={p.period} x={chart.x(i)} y={H - 8} fontSize="11" fill="#94a3b8" textAnchor="middle">
                {fmtQuarter(p.period)}
              </text>
            ) : null
          )}

          {hovered && hoverIdx !== null && (
            <line x1={chart.x(hoverIdx)} x2={chart.x(hoverIdx)} y1={PAD.top} y2={PAD.top + PH} stroke="#cbd5e1" strokeDasharray="3 3" />
          )}

          {([
            ['asking', chart.asking, AREA_COLORS.active],
            ['closed', chart.closed, AREA_COLORS.closed],
          ] as const).map(([key, pts, color]) => (
            <g key={key}>
              <path d={segments(pts)} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
              {pts.map((p, i) =>
                p ? (
                  <circle key={i} cx={p.x} cy={p.y} r={hoverIdx === i ? 5.5 : 4} fill={color} stroke="#fff" strokeWidth={2} />
                ) : null
              )}
            </g>
          ))}

          {/* Direct labels at the end of each line */}
          {chart.askingEnd && (
            <text x={chart.askingEnd.x + 9} y={chart.askingEnd.y + 4} fontSize="11" fill="#52514e">{askingLabel}</text>
          )}
          {chart.closedEnd && (
            <text x={chart.closedEnd.x + 9} y={chart.closedEnd.y + 4 + (chart.askingEnd && Math.abs(chart.askingEnd.y - chart.closedEnd.y) < 14 ? 14 : 0)} fontSize="11" fill="#52514e">
              {closedLabel}
            </text>
          )}
        </svg>

        {hovered && hoverIdx !== null && (
          <div
            className="pointer-events-none absolute top-0 z-10 bg-white border border-neutral-200 shadow-lg rounded-lg px-3 py-2 text-xs whitespace-nowrap"
            style={{
              left: `${(chart.x(hoverIdx) / W) * 100}%`,
              transform: hoverIdx > trend.length / 2 ? 'translateX(calc(-100% - 10px))' : 'translateX(10px)',
            }}
          >
            <p className="font-semibold text-neutral-900 mb-1">{fmtQuarter(hovered.period)}</p>
            <TooltipRow color={AREA_COLORS.active} label={askingLabel} value={hovered.askingPricePerSqm} count={hovered.askingCount} />
            <TooltipRow color={AREA_COLORS.closed} label={closedLabel} value={hovered.closedPricePerSqm} count={hovered.closedCount} />
          </div>
        )}
      </div>

      <details className="mt-2 text-xs text-neutral-500">
        <summary className="cursor-pointer hover:text-neutral-700">{t('property:areaPrices.showTable', 'Show as table')}</summary>
        <table className="mt-2 w-full text-left">
          <thead>
            <tr className="text-neutral-400">
              <th className="font-medium py-1">{t('property:areaPrices.quarter', 'Quarter')}</th>
              <th className="font-medium py-1 text-right">{askingLabel}</th>
              <th className="font-medium py-1 text-right">{closedLabel}</th>
            </tr>
          </thead>
          <tbody>
            {trend
              .filter((p) => p.askingCount > 0 || p.closedCount > 0)
              .map((p) => (
                <tr key={p.period} className="border-t border-neutral-100 text-neutral-700">
                  <td className="py-1">{fmtQuarter(p.period)}</td>
                  <td className="py-1 text-right">{p.askingPricePerSqm !== null ? `${fmtEur(p.askingPricePerSqm)}/m² (${p.askingCount})` : '—'}</td>
                  <td className="py-1 text-right">{p.closedPricePerSqm !== null ? `${fmtEur(p.closedPricePerSqm)}/m² (${p.closedCount})` : '—'}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </details>
    </div>
  );
};

const TooltipRow: React.FC<{ color: string; label: string; value: number | null; count: number }> = ({ color, label, value, count }) => (
  <p className="flex items-center gap-1.5 text-neutral-600">
    <span className="w-2 h-2 rounded-full" style={{ background: color }} />
    {label}:{' '}
    <span className="font-semibold text-neutral-900">{value !== null ? `${fmtEur(value)}/m²` : '—'}</span>
    {count > 0 && <span className="text-neutral-400">· {count}</span>}
  </p>
);

export default AreaPriceTrendChart;
