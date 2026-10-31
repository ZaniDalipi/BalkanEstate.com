import React from 'react';
import { Accessibility } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import type { DevelopmentEntrance, Hotspot } from '../../../types';
import { toPolygon, type Point } from '../../../utils/polygonGeometry';
import { ENTRANCE_KIND_STYLE } from '../../shared/entranceKind';

interface EntranceMarkersProps {
  hotspots: Hotspot[];
  entrancesById?: Map<string, DevelopmentEntrance>;
  activeId?: string;
  onHover: (h: Hotspot, el: HTMLElement) => void;
  onLeave: (h: Hotspot) => void;
  onSelect: (h: Hotspot) => void;
}

/** Where a marked door's pin sits: centred above the top of its outline (0–1 coordinates). */
export const entranceAnchor = (h: Pick<Hotspot, 'shape' | 'points'>): { x: number; y: number } | null => {
  const pts = toPolygon(h.shape, h.points as Point[]);
  if (pts.length === 0) return null;
  const xs = pts.map((p) => p[0]);
  return { x: (Math.min(...xs) + Math.max(...xs)) / 2, y: Math.min(...pts.map((p) => p[1])) };
};

/**
 * Door pins for the entrances marked on a picture: a round badge in the
 * entrance kind's colour (main door, side door, car park, service) with its
 * short code or name beside it, and a wheelchair mark for step-free access.
 * Like the building tags they live inside the pan/zoom layer; the region
 * itself stays the keyboard-focusable control, so the pins are aria-hidden.
 */
export const EntranceMarkers: React.FC<EntranceMarkersProps> = ({ hotspots, entrancesById, activeId, onHover, onLeave, onSelect }) => (
  <>
    {hotspots
      .filter((h) => h.linkType === 'entrance')
      .map((h) => {
        const at = entranceAnchor(h);
        const e = entrancesById?.get(h.linkId);
        // A region whose entrance is gone keeps no pin (it is removed with the entrance anyway).
        if (!at || !e) return null;
        const style = ENTRANCE_KIND_STYLE[e.kind ?? 'main'];
        const Icon = style.icon;
        const text = e.code || e.name;
        const on = activeId === h.id;
        return (
          <button
            key={h.id}
            type="button"
            tabIndex={-1}
            aria-hidden="true"
            data-entrance-marker={h.linkId}
            onPointerEnter={(ev) => ev.pointerType === 'mouse' && onHover(h, ev.currentTarget)}
            onPointerLeave={() => onLeave(h)}
            onPointerDown={(ev) => ev.stopPropagation()}
            onClick={(ev) => {
              ev.stopPropagation();
              onSelect(h);
            }}
            className={cn(
              'absolute z-[1] flex -translate-x-1/2 -translate-y-[115%] items-center gap-1.5 rounded-full py-1 pl-1 pr-3 shadow-lg ring-2 ring-white transition-transform',
              on ? 'scale-110 bg-white' : 'bg-white/95 hover:scale-105'
            )}
            style={{ left: `${at.x * 100}%`, top: `${at.y * 100}%` }}
          >
            <span className={cn('flex h-7 w-7 items-center justify-center rounded-full', style.solid)}>
              <Icon className="h-4 w-4" aria-hidden="true" />
            </span>
            {text && <span className="max-w-[9rem] truncate text-xs font-bold text-slate-900 sm:text-sm">{text}</span>}
            {e.accessible && <Accessibility className="h-4 w-4 text-emerald-700" aria-hidden="true" />}
            <span className="absolute left-1/2 top-full h-2 w-2 -translate-x-1/2 -translate-y-1 rotate-45 bg-white" aria-hidden="true" />
          </button>
        );
      })}
  </>
);
