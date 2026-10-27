import React from 'react';
import { cn } from '@/src/lib/utils';
import type { DevelopmentBuilding, Hotspot } from '../../../types';
import { toPolygon, type Point } from '../../../utils/polygonGeometry';

interface BuildingLabelsProps {
  hotspots: Hotspot[];
  buildingsById?: Map<string, DevelopmentBuilding>;
  activeId?: string;
  onHover: (h: Hotspot, el: HTMLElement) => void;
  onLeave: (h: Hotspot) => void;
  onSelect: (h: Hotspot) => void;
}

/**
 * Name tags for building regions on a residence picture (the East Gate "C2"
 * chips): one per building region, sitting near the bottom of its outline so
 * buyers see at a glance which buildings can be opened. Positioned in percent
 * inside the pan/zoom layer, so they stay glued to their building.
 */
export const BuildingLabels: React.FC<BuildingLabelsProps> = ({ hotspots, buildingsById, activeId, onHover, onLeave, onSelect }) => (
  <>
    {hotspots
      .filter((h) => h.linkType === 'building')
      .map((h) => {
        const pts = toPolygon(h.shape, h.points as Point[]);
        if (pts.length === 0) return null;
        const xs = pts.map((p) => p[0]);
        const ys = pts.map((p) => p[1]);
        const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
        const bottom = Math.max(...ys);
        const b = buildingsById?.get(h.linkId);
        const text = b?.code || b?.name || h.label;
        if (!text) return null;
        const on = activeId === h.id;
        return (
          <button
            key={h.id}
            type="button"
            tabIndex={-1}
            aria-hidden="true"
            onPointerEnter={(e) => e.pointerType === 'mouse' && onHover(h, e.currentTarget)}
            onPointerLeave={() => onLeave(h)}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onSelect(h);
            }}
            className={cn(
              'absolute z-[1] -translate-x-1/2 -translate-y-[130%] whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-bold shadow-lg transition-colors sm:text-base',
              on ? 'bg-teal-700 text-white' : 'bg-white text-teal-700 hover:bg-teal-700 hover:text-white'
            )}
            style={{ left: `${cx * 100}%`, top: `${bottom * 100}%` }}
          >
            {text}
          </button>
        );
      })}
  </>
);
