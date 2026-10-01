/**
 * PriceStrip — every nearby home as a dot on one line, by the value the area
 * is compared on (€/m², or the nightly price), with this home and the median
 * marked. Dots stack upwards so none hide another.
 */

import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { navigate } from '@/src/app/router/navigation';
import { paths } from '@/src/app/router/paths';
import type { AreaNeighbour } from '../../api/areaPricesApi';
import { AREA_COLORS, colorFor, fmtDistance, fmtMonthYear } from './format';
import type { AreaFormat } from './useAreaFormat';
import { useWidth } from './useWidth';

export interface PriceStripProps {
  neighbours: AreaNeighbour[];
  subjectValue: number | null;
  median: number | null;
  format: AreaFormat;
  highlightedId: string | null;
  onHighlight: (id: string | null) => void;
}

const SH = 132;
const SPAD = { left: 24, right: 24 };
const DOT_R = 6;
const AXIS_Y = 78;
const LANE = DOT_R * 2 + 2;

type Placed = { n: AreaNeighbour; x: number; y: number };

const PriceStrip: React.FC<PriceStripProps> = ({ neighbours, subjectValue, median, format, highlightedId, onHighlight }) => {
  const { t } = useTranslation(['property']);
  const [ref, SW] = useWidth<HTMLDivElement>(700);
  const [hover, setHover] = useState<Placed | null>(null);

  const layout = useMemo(() => {
    const valued = neighbours.filter((n): n is AreaNeighbour & { value: number } => n.value !== null);
    const values = valued.map((n) => n.value);
    if (subjectValue !== null) values.push(subjectValue);
    const lo = Math.min(...values);
    const hi = Math.max(...values);
    const range = hi - lo || 1;
    const x = (v: number) => SPAD.left + ((v - lo) / range) * (SW - SPAD.left - SPAD.right);

    const placed: Placed[] = [];
    for (const n of [...valued].sort((a, b) => a.value - b.value)) {
      const cx = x(n.value);
      let lane = 0;
      while (placed.some((p) => Math.abs(p.x - cx) < LANE && p.y === AXIS_Y - 10 - lane * LANE)) lane++;
      placed.push({ n, x: cx, y: AXIS_Y - 10 - Math.min(lane, 4) * LANE });
    }
    return { x, placed, lo, hi };
  }, [neighbours, subjectValue, SW]);

  const thisHome = t('property:areaPrices.thisHome', 'This home');
  const labelsCollide = median !== null && subjectValue !== null && Math.abs(layout.x(median) - layout.x(subjectValue)) < 120;

  return (
    <div ref={ref} className="relative">
      <svg viewBox={`0 0 ${SW} ${SH}`} width={SW} height={SH} className="block max-w-full overflow-visible" role="img" aria-label={t('property:areaPrices.stripTitle', 'Where this home sits')}>
        <line x1={SPAD.left} x2={SW - SPAD.right} y1={AXIS_Y} y2={AXIS_Y} stroke="#e2e8f0" strokeWidth={2} strokeLinecap="round" />

        {median !== null && (
          <g>
            <line x1={layout.x(median)} x2={layout.x(median)} y1={14} y2={AXIS_Y + 6} stroke="#94a3b8" strokeDasharray="3 3" />
            <text x={layout.x(median)} y={AXIS_Y + 34} fontSize="11" fill="#64748b" textAnchor="middle">
              {t('property:areaPrices.median', 'Median')} {format.value(median)}
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

        {subjectValue !== null && (
          <g>
            <line x1={layout.x(subjectValue)} x2={layout.x(subjectValue)} y1={AXIS_Y - 4} y2={AXIS_Y + 14} stroke={AREA_COLORS.subject} strokeWidth={2} />
            <path d={`M ${layout.x(subjectValue)} ${AXIS_Y + 2} l -7 12 h 14 z`} fill={AREA_COLORS.subject} stroke="#fff" strokeWidth={2} strokeLinejoin="round" />
            <text x={layout.x(subjectValue)} y={AXIS_Y + 34} dy={labelsCollide ? 14 : 0} fontSize="11" fontWeight="700" fill="#0b0b0b" textAnchor="middle">
              {thisHome} {format.value(subjectValue)}
            </text>
          </g>
        )}

        <text x={SPAD.left} y={AXIS_Y + 18} fontSize="10" fill="#94a3b8">{format.value(layout.lo)}</text>
        <text x={SW - SPAD.right} y={AXIS_Y + 18} fontSize="10" fill="#94a3b8" textAnchor="end">{format.value(layout.hi)}</text>
      </svg>

      {hover && <StripTooltip placed={hover} width={SW} format={format} />}
    </div>
  );
};

/** Name, price and status of the dot under the pointer. */
export const StripTooltip: React.FC<{ placed: Placed; width: number; format: AreaFormat }> = ({ placed, width, format }) => {
  const { n, x, y } = placed;
  return (
    <div
      className="pointer-events-none absolute z-10 bg-white border border-neutral-200 shadow-lg rounded-lg px-3 py-2 text-xs whitespace-nowrap"
      style={{
        left: `${(x / width) * 100}%`,
        top: `${(y / SH) * 100}%`,
        transform: `translate(${x > width / 2 ? 'calc(-100% - 12px)' : '12px'}, -50%)`,
      }}
    >
      <p className="font-semibold text-neutral-900 max-w-[220px] truncate">{n.title || n.address}</p>
      <p className="text-neutral-700">
        {format.price(n.price)}
        {format.showsPerSqm && n.pricePerSqm !== null && (
          <span className="text-neutral-500"> · {format.value(n.pricePerSqm)}</span>
        )}
      </p>
      <p className="text-neutral-500">
        {n.status === 'active' ? format.labels.active : format.labels.closed}
        {n.status !== 'active' && n.closedAt && ` ${fmtMonthYear(n.closedAt)}`} · {fmtDistance(n.distanceM)}
      </p>
    </div>
  );
};

export default PriceStrip;
