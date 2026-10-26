import React from 'react';
import type { Hotspot, UnitAvailability } from '../../../types';
import { toPolygon, type Point } from '../../../utils/polygonGeometry';
import { availabilityPatternId } from '../../../utils/availability';
import { regionPaint, type RegionDisplayMode } from './regionPaint';

export interface HotspotShapeProps {
  hotspot: Hotspot;
  width: number;
  height: number;
  /** Effective availability for unit links; undefined for other link types. */
  state?: UnitAvailability;
  /** Filters active: whether this unit matches (undefined when no filters or not a unit). */
  matched?: boolean;
  mode: RegionDisplayMode;
  active: boolean;
  /** Accessible name; when absent the shape is decorative-only (not focusable). */
  label?: string;
  interactive: boolean;
  onPointerEnter: (e: React.PointerEvent<SVGGElement>) => void;
  onPointerMove: (e: React.PointerEvent<SVGGElement>) => void;
  onPointerLeave: () => void;
  onPointerDown: (e: React.PointerEvent<SVGGElement>) => void;
  onClick: (e: React.MouseEvent<SVGGElement>) => void;
  onActivateKey: () => void;
  onFocus: (e: React.FocusEvent<SVGGElement>) => void;
  onBlur: () => void;
}

/**
 * One clickable region on the rendering, painted by {@link regionPaint}:
 * invisible at rest in the default 'clean' mode, a translucent fill with a
 * light outline when hovered/focused, a soft tint for filter matches, or
 * permanent availability colours (+ patterns) in 'availability' mode.
 * Focusable with Enter/Space activation.
 */
export const HotspotShape: React.FC<HotspotShapeProps> = ({
  hotspot,
  width,
  height,
  state,
  matched,
  mode,
  active,
  label,
  interactive,
  onActivateKey,
  ...events
}) => {
  const pts = toPolygon(hotspot.shape, hotspot.points as Point[])
    .map(([x, y]) => `${x * width},${y * height}`)
    .join(' ');
  const paint = regionPaint({ mode, state, active, matched });
  const strokeW = Math.max(1.2, width / 900) * paint.strokeScale;

  return (
    <g
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-label={label}
      data-hotspot-id={hotspot.id}
      data-unit-id={hotspot.linkType === 'unit' ? hotspot.linkId : undefined}
      data-state={state}
      data-dimmed={matched === false ? 'true' : 'false'}
      data-active={active ? 'true' : 'false'}
      className={interactive ? 'cursor-pointer outline-none' : undefined}
      onKeyDown={(e) => {
        if (interactive && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onActivateKey();
        }
      }}
      {...events}
    >
      <polygon
        points={pts}
        fill={paint.fill}
        stroke={paint.stroke}
        strokeWidth={strokeW}
        strokeLinejoin="round"
        pointerEvents="all"
        style={{ transition: 'fill 120ms ease, stroke 120ms ease' }}
      />
      {paint.pattern && state && (
        <polygon points={pts} fill={`url(#${availabilityPatternId(state)})`} opacity={0.55} pointerEvents="none" />
      )}
    </g>
  );
};
