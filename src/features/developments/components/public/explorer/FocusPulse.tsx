import React from 'react';
import type { Hotspot } from '../../../types';
import { toPolygon, type Point } from '../../../utils/polygonGeometry';

interface FocusPulseProps {
  hotspot: Hotspot;
  width: number;
  height: number;
}

/** A pulsing teal outline over the region the budget helper is taking the buyer to. */
export const FocusPulse: React.FC<FocusPulseProps> = ({ hotspot, width, height }) => {
  const pts = toPolygon(hotspot.shape, hotspot.points as Point[])
    .map(([x, y]) => `${x * width},${y * height}`)
    .join(' ');
  if (!pts) return null;
  const w = Math.max(2, width / 450);
  return (
    <g pointerEvents="none" data-testid="focus-pulse">
      <polygon points={pts} fill="rgba(13,148,136,0.35)" stroke="#fff" strokeWidth={w * 2} strokeLinejoin="round" className="animate-pulse" />
      <polygon points={pts} fill="none" stroke="#0d9488" strokeWidth={w} strokeLinejoin="round" />
    </g>
  );
};
