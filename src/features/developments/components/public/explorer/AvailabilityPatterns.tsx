import React from 'react';
import { AVAILABILITY_META, AVAILABILITY_ORDER, availabilityPatternId } from '../../../utils/availability';
import type { AvailabilityPattern } from '../../../utils/availability';

const INK = 'rgba(255,255,255,0.75)';

/** The motif of one pattern tile (size × size, user space). */
export const motif = (p: AvailabilityPattern, s: number, w: number): React.ReactNode => {
  switch (p) {
    case 'stripes':
      return <path d={`M0,${s} L${s},0`} stroke={INK} strokeWidth={w} />;
    case 'lines':
      return <path d={`M0,${s / 2} H${s}`} stroke={INK} strokeWidth={w} />;
    case 'dots':
      return <circle cx={s / 2} cy={s / 2} r={w * 1.2} fill={INK} />;
    case 'cross':
      return <path d={`M0,0 L${s},${s} M${s},0 L0,${s}`} stroke={INK} strokeWidth={w} />;
    case 'hatch':
      return <path d={`M0,${s / 2} H${s} M${s / 2},0 V${s}`} stroke={INK} strokeWidth={w} />;
    default:
      return null;
  }
};

/**
 * One SVG <pattern> per availability state (ids from availabilityPatternId),
 * drawn over the colour fill so states stay distinguishable without colour —
 * stripes for reserved, a cross for sold, dots for coming soon, and so on.
 * `scale` is the image width, so the motif keeps a sensible size on any render.
 */
export const AvailabilityPatterns: React.FC<{ scale: number }> = ({ scale }) => {
  const s = Math.max(8, scale / 90);
  const w = Math.max(1, s / 7);
  return (
    <defs>
      {AVAILABILITY_ORDER.filter((st) => AVAILABILITY_META[st].pattern !== 'solid').map((st) => (
        <pattern
          key={st}
          id={availabilityPatternId(st)}
          patternUnits="userSpaceOnUse"
          width={s}
          height={s}
        >
          {motif(AVAILABILITY_META[st].pattern, s, w)}
        </pattern>
      ))}
    </defs>
  );
};
