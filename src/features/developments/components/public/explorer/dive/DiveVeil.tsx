import React, { useId } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import type { Hotspot } from '../../../../types';
import { toPolygon, type Point } from '../../../../utils/polygonGeometry';
import { DIVE_PAPER } from './diveStyle';

interface DiveVeilProps {
  /** The apartment left in colour; undefined fades the veil away. */
  hotspot?: Hotspot;
  width: number;
  height: number;
}

/** How much of the facade the wash hides: the building stays behind as a faint ghost. */
const WASH = 0.86;

/**
 * Washes the picture out to paper except for one apartment, which keeps its
 * colour inside a crisp outline. It lives in the pan/zoom layer, so it stays
 * glued to the facade while the camera pushes in, and it swallows the pointer
 * so nothing else lights up during the dive.
 */
export const DiveVeil: React.FC<DiveVeilProps> = ({ hotspot, width: W, height: H }) => {
  const reduced = useReducedMotion();
  const maskId = `dive-${useId().replace(/:/g, '')}`;
  const pts = hotspot
    ? toPolygon(hotspot.shape, hotspot.points as Point[])
        .map(([x, y]) => `${x * W},${y * H}`)
        .join(' ')
    : '';

  return (
    <AnimatePresence>
      {pts && (
        <motion.svg
          key="veil"
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          aria-hidden="true"
          data-testid="dive-veil"
          className="absolute inset-0 z-[2] h-full w-full"
          initial={reduced ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduced ? 0 : 0.5, ease: 'easeOut' }}
        >
          <defs>
            <mask id={maskId}>
              <rect width={W} height={H} fill="white" />
              <polygon points={pts} fill="black" />
            </mask>
          </defs>
          <rect width={W} height={H} fill={DIVE_PAPER} opacity={WASH} mask={`url(#${maskId})`} />
          <polygon points={pts} fill="none" stroke="#fff" strokeWidth={Math.max(2, W / 520)} strokeLinejoin="round" />
        </motion.svg>
      )}
    </AnimatePresence>
  );
};
