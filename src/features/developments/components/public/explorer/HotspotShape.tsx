import React from 'react';
import type { Hotspot, UnitAvailability } from '../../../types';
import { toPolygon, type Point } from '../../../utils/polygonGeometry';
import {
  AVAILABILITY_META,
  DIMMED_FILL,
  NEUTRAL_FILL,
  NEUTRAL_FILL_STRONG,
  availabilityPatternId,
} from '../../../utils/availability';

export interface HotspotShapeProps {
  hotspot: Hotspot;
  width: number;
  height: number;
  /** Effective availability for unit links; undefined for other link types. */
  state?: UnitAvailability;
  dimmed: boolean;
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
 * One clickable region on the rendering. Unit regions are filled with their
 * availability colour plus that state's pattern (non-colour cue); filtered-out
 * units fade to DIMMED_FILL; building/floor/listing regions use the neutral
 * fill. Focusable with Enter/Space activation.
 */
export const HotspotShape: React.FC<HotspotShapeProps> = ({
  hotspot,
  width,
  height,
  state,
  dimmed,
  active,
  label,
  interactive,
  onActivateKey,
  ...events
}) => {
  const pts = toPolygon(hotspot.shape, hotspot.points as Point[])
    .map(([x, y]) => `${x * width},${y * height}`)
    .join(' ');
  const meta = state ? AVAILABILITY_META[state] : undefined;
  const fill = dimmed ? DIMMED_FILL : meta ? (active ? meta.fillStrong : meta.fill) : active ? NEUTRAL_FILL_STRONG : NEUTRAL_FILL;
  const stroke = dimmed ? 'rgba(255,255,255,0.35)' : meta ? meta.color : 'rgba(255,255,255,0.9)';
  const showPattern = !dimmed && meta && meta.pattern !== 'solid' && state;
  const strokeW = Math.max(1.5, width / 700) * (active ? 2 : 1);

  return (
    <g
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-label={label}
      data-hotspot-id={hotspot.id}
      data-state={state}
      data-dimmed={dimmed ? 'true' : 'false'}
      className={interactive ? 'cursor-pointer outline-none' : undefined}
      onKeyDown={(e) => {
        if (interactive && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onActivateKey();
        }
      }}
      {...events}
    >
      <polygon points={pts} fill={fill} stroke={stroke} strokeWidth={strokeW} strokeLinejoin="round" />
      {showPattern && <polygon points={pts} fill={`url(#${availabilityPatternId(state)})`} pointerEvents="none" />}
      {active && (
        <polygon points={pts} fill="none" stroke="#ffffff" strokeWidth={strokeW * 0.6} strokeDasharray={`${strokeW * 3} ${strokeW * 2}`} pointerEvents="none" />
      )}
    </g>
  );
};
