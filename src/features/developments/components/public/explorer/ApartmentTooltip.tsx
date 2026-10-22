import React, { useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight } from 'lucide-react';
import type { PublicUnit } from '../../../types';
import { AvailabilityBadge } from '../../shared/Badges';
import { placeTooltip } from './placeTooltip';
import { useUnitText } from './useUnitText';

interface ApartmentTooltipProps {
  /** Viewport coordinates to point at. */
  anchor: { x: number; y: number };
  unit?: PublicUnit;
  /** Text for non-unit regions (building name + availability, listing, …). */
  text?: string;
  /** Touch: show an action button and accept taps. */
  interactive?: boolean;
  actionLabel?: string;
  onAction?: () => void;
}

const UnitFacts: React.FC<{ unit: PublicUnit }> = ({ unit }) => {
  const { t } = useTranslation('developments');
  const txt = useUnitText();
  const facts = [
    unit.unitType ? t(`explorer.unitType.${unit.unitType}`, unit.unitType.replace(/_/g, ' ')) : null,
    typeof unit.beds === 'number' ? txt.bedrooms(unit.beds) : null,
    txt.area(unit) || null,
    unit.floorLabel ? `${t('explorer.floor', 'Floor')} ${unit.floorLabel}` : null,
  ].filter(Boolean);
  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <p className="text-base font-bold text-slate-900">{txt.title(unit)}</p>
        <AvailabilityBadge state={unit.availability} />
      </div>
      {facts.length > 0 && <p className="mt-1 text-xs text-slate-600">{facts.join(' · ')}</p>}
      <p className="mt-2 text-sm font-semibold text-slate-900">{txt.price(unit)}</p>
    </>
  );
};

/**
 * Hover preview of a region (desktop) or the first-tap preview (touch). Fixed
 * to the viewport and portalled to <body> so a transformed ancestor can't
 * offset it; placed with placeTooltip (flip + clamp). Sits below 5000 so
 * platform modals stack above.
 */
export const ApartmentTooltip: React.FC<ApartmentTooltipProps> = ({ anchor, unit, text, interactive, actionLabel, onAction }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setPos(placeTooltip(anchor, { width: r.width, height: r.height }, { width: window.innerWidth, height: window.innerHeight }));
  }, [anchor.x, anchor.y, unit, text]); // eslint-disable-line react-hooks/exhaustive-deps

  if (typeof document === 'undefined') return null;
  return createPortal(
    <div
      ref={ref}
      role="tooltip"
      className="fixed z-[4600] w-max max-w-[260px] rounded-xl border border-slate-200 bg-white p-3 shadow-xl"
      style={{ left: pos?.left ?? anchor.x, top: pos?.top ?? anchor.y, visibility: pos ? 'visible' : 'hidden', pointerEvents: interactive ? 'auto' : 'none' }}
    >
      {unit ? <UnitFacts unit={unit} /> : <p className="text-sm font-semibold text-slate-900">{text}</p>}
      {interactive && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-3 inline-flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-semibold text-white"
        >
          {actionLabel}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </button>
      )}
    </div>,
    document.body
  );
};
