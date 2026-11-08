import React from 'react';
import { AnimatePresence, motion, useReducedMotion, type Variants } from 'framer-motion';
import { cn } from '@/src/lib/utils';
import { FRAME_DRIVEN } from '../../motion/frameDriven';
import type { OrbitDir } from './orbitDirection';

interface OrbitViewProps {
  /** Identity of the picture on show (target + camera view); a new one orbits or fades in. */
  viewKey: string;
  dir: OrbitDir;
  /** Fill the parent (the full-screen hero) instead of sizing to the picture. */
  fill?: boolean;
  children: React.ReactNode;
}

/** How far each picture swings round the pivot, and how far behind the picture the pivot sits. */
const SWING_DEG = 14;
const PIVOT = '50% 50% -1400px';
const EASE = [0.65, 0, 0.35, 1] as const;

const ORBIT_MS = 1.05;

/**
 * The incoming picture swings in on top and fades in during the first part of
 * the move; the outgoing one stays opaque underneath until it is covered, so
 * the screen never dips dark between the two.
 */
const variants: Variants = {
  enter: (d: OrbitDir) =>
    d === 0
      ? { opacity: 0, scale: 1.03, rotateY: 0, filter: 'blur(0px)', zIndex: 2 }
      : { opacity: 0, scale: 1.03, rotateY: d * SWING_DEG, filter: 'blur(6px)', zIndex: 2 },
  center: (d: OrbitDir) => ({
    opacity: 1,
    scale: 1,
    rotateY: 0,
    filter: 'blur(0px)',
    zIndex: 2,
    pointerEvents: 'auto',
    transition: d === 0 ? { duration: 0.6, ease: EASE } : { duration: ORBIT_MS, ease: EASE, opacity: { duration: ORBIT_MS * 0.55, ease: 'easeOut' } },
  }),
  exit: (d: OrbitDir) =>
    d === 0
      ? { opacity: 0, zIndex: 1, pointerEvents: 'none', transition: { duration: 0.6, ease: EASE } }
      : {
          opacity: [1, 1, 0],
          scale: 1.03,
          rotateY: -d * SWING_DEG,
          filter: 'blur(6px)',
          zIndex: 1,
          pointerEvents: 'none',
          transition: { duration: ORBIT_MS, ease: EASE, opacity: { duration: ORBIT_MS, times: [0, 0.6, 1] } },
        },
};

/**
 * Switching camera views of one building as one camera circling it: the
 * picture on show swings away round a pivot behind the building while the
 * next swings in from the other side, crossfading with a touch of motion
 * blur — next view one way round, previous the other. Both pictures are on
 * screen together, so nothing goes dark in between. A new building (or the
 * residence) fades in instead; under reduced motion it is a short crossfade.
 */
export const OrbitView: React.FC<OrbitViewProps> = ({ viewKey, dir, fill, children }) => {
  const reduced = useReducedMotion();
  const way: OrbitDir = reduced ? 0 : dir;
  return (
    <div className={cn(fill ? 'absolute inset-0 overflow-hidden' : 'relative w-full')} style={{ perspective: 1800 }}>
      <AnimatePresence custom={way} mode={fill ? 'sync' : 'popLayout'}>
        <motion.div
          key={viewKey}
          {...FRAME_DRIVEN}
          custom={way}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={reduced ? { duration: 0.25 } : undefined}
          style={{ transformOrigin: PIVOT, backfaceVisibility: 'hidden' }}
          className={fill ? 'absolute inset-0' : 'w-full'}
          data-testid="orbit-view"
          data-view={viewKey}
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
