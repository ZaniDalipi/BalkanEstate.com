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

/**
 * Where a marked door's pin sits: in the middle of its outline (0–1
 * coordinates), on the door itself, so it covers no apartment around it.
 */
export const entranceAnchor = (h: Pick<Hotspot, 'shape' | 'points'>): { x: number; y: number } | null => {
  const pts = toPolygon(h.shape, h.points as Point[]);
  if (pts.length === 0) return null;
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  return { x: (Math.min(...xs) + Math.max(...xs)) / 2, y: (Math.min(...ys) + Math.max(...ys)) / 2 };
};

/**
 * Door pins for the entrances marked on a picture: a small round icon in the
 * entrance kind's colour (main door, side door, car park, service), with a
 * tiny wheelchair badge for step-free access. Only an icon, sitting on the
 * door, so it never covers the homes above it; the entrance's name and what
 * it serves are in the card that opens on hover, focus or tap. Like the
 * building tags they live inside the pan/zoom layer; the region itself stays
 * the keyboard-focusable control, so the pins are aria-hidden.
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
              // A little bigger to the finger than to the eye (the ::before), without growing on screen.
              "absolute z-[1] flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full shadow-md ring-2 ring-white transition-transform before:absolute before:-inset-2 before:content-[''] sm:h-7 sm:w-7",
              style.solid,
              on ? 'scale-125' : 'hover:scale-110'
            )}
            // Inline: the page-wide touch rule (index.html, min-height 44px on every button) would stretch the round pin into a pill.
            style={{ left: `${at.x * 100}%`, top: `${at.y * 100}%`, minHeight: 0, minWidth: 0 }}
          >
            <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden="true" />
            {e.accessible && (
              <span className="absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-emerald-600 text-white ring-1 ring-white" aria-hidden="true">
                <Accessibility className="h-2.5 w-2.5" />
              </span>
            )}
          </button>
        );
      })}
  </>
);
