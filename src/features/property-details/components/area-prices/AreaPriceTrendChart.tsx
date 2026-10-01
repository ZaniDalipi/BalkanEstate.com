/**
 * Median value per quarter around a property: what homes were listed at, and
 * what they sold or were let for. One axis, two series, a crosshair tooltip,
 * and a table view for anyone who would rather read the numbers.
 */

import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { AreaTrendPoint } from '../../api/areaPricesApi';
import { AREA_COLORS, fmtEur, fmtQuarter } from './format';
import type { AreaFormat } from './useAreaFormat';
import { useWidth } from './useWidth';

export interface AreaPriceTrendChartProps {
  trend: AreaTrendPoint[];
  format: AreaFormat;
}

const H = 230;
const PAD = { top: 16, right: 92, bottom: 30, left: 64 };
const PH = H - PAD.top - PAD.bottom;

type Point = { x: number; y: number } | null;

/** Path segments that break wherever a quarter has no data. */
const segments = (pts: Point[]): string =>
  pts.map((p, i) => (p ? `${pts[i - 1] ? 'L' : 'M'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}` : '')).join(' ');

const AreaPriceTrendChart: React.FC<AreaPriceTrendChartProps> = ({ trend, format }) => {
  const { labels } = format;
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [ref, W] = useWidth<HTMLDivElement>(700);
  const PW = W - PAD.left - PAD.right;

  const chart = useMemo(() => {
    const values = trend.flatMap((p) => [p.askingValue, p.closedValue]).filter((v): v is number => v !== null);
    const lo = Math.min(...values) * 0.95;
    const range = Math.max(...values) * 1.05 - lo || 1;
    const x = (i: number) => PAD.left + (trend.length > 1 ? (i / (trend.length - 1)) * PW : PW / 2);
    const y = (v: number) => PAD.top + PH - ((v - lo) / range) * PH;
    const series = (pick: (p: AreaTrendPoint) => number | null): Point[] =>
      trend.map((p, i) => { const v = pick(p); return v === null ? null : { x: x(i), y: y(v) }; });
    const last = (pts: Point[]) => [...pts].reverse().find((p) => p !== null) ?? null;
    const asking = series((p) => p.askingValue);
    const closed = series((p) => p.closedValue);
    return {
      x,
      lines: [
        { key: 'asking', pts: asking, color: AREA_COLORS.active, end: last(asking), label: labels.askingSeries },
        { key: 'closed', pts: closed, color: AREA_COLORS.closed, end: last(closed), label: labels.closed },
      ],
      yTicks: [0, 1 / 3, 2 / 3, 1].map((f) => ({ y: PAD.top + PH - f * PH, label: fmtEur(lo + range * f) })),
    };
  }, [trend, PW, labels]);

  const hovered = hoverIdx !== null ? trend[hoverIdx] : null;
  const labelEvery = Math.ceil(trend.length / Math.max(2, Math.floor(PW / 70)));
  const [askingEnd, closedEnd] = [chart.lines[0].end, chart.lines[1].end];
  // Nudge the second end label down when the two lines finish close together
  const closedLabelShift = askingEnd && closedEnd && Math.abs(askingEnd.y - closedEnd.y) < 14 ? 14 : 0;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-2 text-xs text-neutral-600">
        {[[labels.askingSeries, AREA_COLORS.active], [labels.closedSeries, AREA_COLORS.closed]].map(([label, color]) => (
          <span key={label} className="inline-flex items-center gap-1.5">
            <span className="w-3 h-0.5 rounded-full" style={{ background: color }} />
            {label}
          </span>
        ))}
      </div>

      <div ref={ref} className="relative">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          width={W}
          height={H}
          className="block max-w-full select-none"
          role="img"
          aria-label={labels.trendTitle}
          onMouseLeave={() => setHoverIdx(null)}
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const i = Math.round(((((e.clientX - rect.left) / rect.width) * W - PAD.left) / PW) * (trend.length - 1));
            setHoverIdx(Math.min(trend.length - 1, Math.max(0, i)));
          }}
        >
          {chart.yTicks.map((tick, i) => (
            <g key={i}>
              <line x1={PAD.left} x2={W - PAD.right} y1={tick.y} y2={tick.y} stroke="#f1f5f9" />
              <text x={PAD.left - 8} y={tick.y + 4} fontSize="11" fill="#94a3b8" textAnchor="end">{tick.label}</text>
            </g>
          ))}
          {trend.map((p, i) => (i % labelEvery === 0 || i === trend.length - 1) && (
            <text key={p.period} x={chart.x(i)} y={H - 8} fontSize="11" fill="#94a3b8" textAnchor="middle">{fmtQuarter(p.period)}</text>
          ))}
          {hoverIdx !== null && (
            <line x1={chart.x(hoverIdx)} x2={chart.x(hoverIdx)} y1={PAD.top} y2={PAD.top + PH} stroke="#cbd5e1" strokeDasharray="3 3" />
          )}
          {chart.lines.map(({ key, pts, color, end, label }) => (
            <g key={key}>
              <path d={segments(pts)} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
              {pts.map((p, i) => p && <circle key={i} cx={p.x} cy={p.y} r={hoverIdx === i ? 5.5 : 4} fill={color} stroke="#fff" strokeWidth={2} />)}
              {/* Direct label at the end of each line */}
              {end && (
                <text x={end.x + 9} y={end.y + 4 + (key === 'closed' ? closedLabelShift : 0)} fontSize="11" fill="#52514e">{label}</text>
              )}
            </g>
          ))}
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
            <TooltipRow color={AREA_COLORS.active} label={labels.askingSeries} value={hovered.askingValue} count={hovered.askingCount} format={format} />
            <TooltipRow color={AREA_COLORS.closed} label={labels.closed} value={hovered.closedValue} count={hovered.closedCount} format={format} />
          </div>
        )}
      </div>

      <AreaTrendTable trend={trend} format={format} />
    </div>
  );
};

const TooltipRow: React.FC<{ color: string; label: string; value: number | null; count: number; format: AreaFormat }> = ({ color, label, value, count, format }) => (
  <p className="flex items-center gap-1.5 text-neutral-600">
    <span className="w-2 h-2 rounded-full" style={{ background: color }} />
    {label}: <span className="font-semibold text-neutral-900">{value !== null ? format.value(value) : '—'}</span>
    {count > 0 && <span className="text-neutral-400">· {count}</span>}
  </p>
);

/** The chart's numbers as a table, for screen readers and anyone who prefers them. */
export const AreaTrendTable: React.FC<AreaPriceTrendChartProps> = ({ trend, format }) => {
  const { t } = useTranslation(['property']);
  const cell = (value: number | null, count: number) => (value !== null ? `${format.value(value)} (${count})` : '—');
  return (
    <details className="mt-2 text-xs text-neutral-500">
      <summary className="cursor-pointer hover:text-neutral-700">{t('property:areaPrices.showTable', 'Show as table')}</summary>
      <table className="mt-2 w-full text-left">
        <thead>
          <tr className="text-neutral-400">
            <th className="font-medium py-1">{t('property:areaPrices.quarter', 'Quarter')}</th>
            <th className="font-medium py-1 text-right">{format.labels.askingSeries}</th>
            <th className="font-medium py-1 text-right">{format.labels.closed}</th>
          </tr>
        </thead>
        <tbody>
          {trend.filter((p) => p.askingCount > 0 || p.closedCount > 0).map((p) => (
            <tr key={p.period} className="border-t border-neutral-100 text-neutral-700">
              <td className="py-1">{fmtQuarter(p.period)}</td>
              <td className="py-1 text-right">{cell(p.askingValue, p.askingCount)}</td>
              <td className="py-1 text-right">{cell(p.closedValue, p.closedCount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
};

export default AreaPriceTrendChart;
