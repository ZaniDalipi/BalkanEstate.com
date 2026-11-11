import React, { useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowRight } from 'lucide-react';
import { optimizeImageUrl } from '@/config/mediaConfig';
import { cn } from '@/src/lib/utils';
import type { PublicUnit } from '../../../types';
import { placeCard, placeCardBeside, type CardPlacement } from './placeCard';
import { FactRows, UnitFacts, type Fact } from './RegionCardFacts';
import type { AnchorRect } from './useHotspotInteraction';

export interface RegionCardProps {
  anchor: AnchorRect;
  /** Apartment card; otherwise a titled card with `facts` (building, floor, listing). */
  unit?: PublicUnit;
  /** For an apartment card: the units sold together with it. */
  companions?: { comesWith: PublicUnit[]; soldWith: PublicUnit[] };
  title?: string;
  facts?: Fact[];
  /** Photo shown above the title (listing regions). */
  imageUrl?: string;
  badge?: string;
  actionLabel?: string;
  onAction?: () => void;
  /** Open beside the region (apartments on wide screens) instead of above it. */
  beside?: boolean;
  onPointerEnter: () => void;
  onPointerLeave: () => void;
}

/**
 * The hover card for a region (East Gate style): anchored to the region's top
 * centre with an arrow, showing the key facts and a call to action. It is
 * interactive — the pointer can move onto it and press the button — and is
 * portalled to <body>, fixed, below the platform modals (z < 5000).
 */
export const RegionCard: React.FC<RegionCardProps> = ({ anchor, unit, companions, title, facts, imageUrl, badge, actionLabel, onAction, beside, onPointerEnter, onPointerLeave }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<CardPlacement | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const place = beside && window.innerWidth >= 768 ? placeCardBeside : placeCard;
    setPos(place(anchor, { width: r.width, height: r.height }, { width: window.innerWidth, height: window.innerHeight }));
  }, [anchor.left, anchor.top, anchor.width, anchor.height, unit, title, beside]); // eslint-disable-line react-hooks/exhaustive-deps

  if (typeof document === 'undefined') return null;
  return createPortal(
    <div
      ref={ref}
      role="tooltip"
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      className="fixed z-[4400] w-[288px] max-w-[calc(100vw-16px)] rounded-2xl bg-white/97 p-4 shadow-2xl ring-1 ring-slate-900/10 backdrop-blur"
      style={{ left: pos?.left ?? anchor.left, top: pos?.top ?? anchor.top, visibility: pos ? 'visible' : 'hidden' }}
    >
      {unit ? (
        <UnitFacts unit={unit} companions={companions} />
      ) : (
        <>
          {imageUrl && (
            <div className="-mx-4 -mt-4 mb-3 h-32 overflow-hidden rounded-t-2xl bg-slate-100">
              <img src={optimizeImageUrl(imageUrl, { width: 576 })} alt="" className="h-full w-full object-cover" loading="lazy" />
            </div>
          )}
          {(title || badge) && (
            <div className="mb-3 flex items-start justify-between gap-3">
              {title && <p className="text-base font-bold leading-snug text-slate-900">{title}</p>}
              {badge && (
                <span className="shrink-0 rounded-full bg-teal-50 px-2 py-0.5 text-xs font-semibold text-teal-800 ring-1 ring-teal-200">{badge}</span>
              )}
            </div>
          )}
          {facts && facts.length > 0 && <FactRows facts={facts} />}
        </>
      )}
      {onAction && actionLabel && (
        <button
          type="button"
          onClick={onAction}
          className="group/cta mt-4 inline-flex min-h-[44px] w-full items-center justify-between gap-2 rounded-full bg-slate-900 pl-5 pr-1.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          {actionLabel}
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-400 text-slate-900 transition-transform group-hover/cta:translate-x-0.5" aria-hidden="true">
            <ArrowRight className="h-4 w-4" />
          </span>
        </button>
      )}
      {pos && (
        <span
          aria-hidden="true"
          className={cn(
            'absolute h-3 w-3 rotate-45 bg-white',
            pos.side === 'above' && '-bottom-1.5 shadow-[2px_2px_2px_rgba(15,23,42,0.08)]',
            pos.side === 'below' && '-top-1.5',
            pos.side === 'right' && '-left-1.5',
            pos.side === 'left' && '-right-1.5 shadow-[2px_-2px_2px_rgba(15,23,42,0.06)]'
          )}
          style={pos.side === 'left' || pos.side === 'right' ? { top: (pos.arrowY ?? 16) - 6 } : { left: pos.arrowX - 6 }}
        />
      )}
    </div>,
    document.body
  );
};
