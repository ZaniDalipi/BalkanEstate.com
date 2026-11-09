import React from 'react';
import { AnimatePresence, motion, useReducedMotion, type Variants } from 'framer-motion';
import { cn } from '@/src/lib/utils';
import { FRAME_DRIVEN } from '../../motion/frameDriven';
import { FADE, type SceneMove } from './sceneMove';

interface OrbitViewProps {
  /** Identity of the picture on show (target + camera view); a new one moves in. */
  viewKey: string;
  /** How it moves in (see `sceneMove`). */
  move: SceneMove;
  /** Fill the parent (the full-screen hero) instead of sizing to the picture. */
  fill?: boolean;
  children: React.ReactNode;
}

/** How far each picture swings round the pivot, and how far behind the picture the pivot sits. */
const SWING_DEG = 14;
const PIVOT = '50% 50% -1400px';
const EASE = [0.65, 0, 0.35, 1] as const;
const MOVE_S = { orbit: 1.05, lift: 0.9, zoom: 0.85, fade: 0.6 } as const;

/** Each move's pose for a picture coming in (`from`) and going out (`to`). */
const poses = (m: SceneMove) => {
  if (m.kind === 'orbit') return { from: { rotateY: m.dir * SWING_DEG, scale: 1.03, filter: 'blur(6px)' }, to: { rotateY: -m.dir * SWING_DEG, scale: 1.03, filter: 'blur(6px)' } };
  // Going up, the floor below drops away and the next floor comes down into view.
  if (m.kind === 'lift') return { from: { y: `${-m.dir * 40}%`, scale: 0.97, filter: 'blur(4px)' }, to: { y: `${m.dir * 40}%`, scale: 0.97, filter: 'blur(4px)' } };
  // Into a floor: the building grows past the camera while the floor rises to meet it; out, the reverse.
  if (m.kind === 'zoom') return { from: { scale: m.dir > 0 ? 0.86 : 1.2, filter: 'blur(4px)' }, to: { scale: m.dir > 0 ? 1.25 : 0.86, filter: 'blur(4px)' } };
  return { from: { scale: 1.03 }, to: {} };
};
const REST = { rotateY: 0, y: '0%', scale: 1, filter: 'blur(0px)' };

/**
 * The incoming picture moves in on top and fades in during the first part of
 * the move; the outgoing one stays opaque underneath until it is covered, so
 * the screen never dips dark between the two.
 */
const variants: Variants = {
  enter: (m: SceneMove) => ({ ...REST, ...poses(m).from, opacity: 0, zIndex: 2 }),
  center: (m: SceneMove) => ({
    ...REST,
    opacity: 1,
    zIndex: 2,
    pointerEvents: 'auto',
    transition: { duration: MOVE_S[m.kind], ease: EASE, ...(m.kind === 'fade' ? {} : { opacity: { duration: MOVE_S[m.kind] * 0.55, ease: 'easeOut' } }) },
  }),
  exit: (m: SceneMove) =>
    m.kind === 'fade'
      ? { opacity: 0, zIndex: 1, pointerEvents: 'none', transition: { duration: MOVE_S.fade, ease: EASE } }
      : {
          ...poses(m).to,
          opacity: [1, 1, 0],
          zIndex: 1,
          pointerEvents: 'none',
          transition: { duration: MOVE_S[m.kind], ease: EASE, opacity: { duration: MOVE_S[m.kind], times: [0, 0.6, 1] } },
        },
};

/**
 * The explorer's pictures moving as one camera. Camera views of one building
 * orbit it (the picture on show swings away round a pivot behind the building
 * while the next swings in from the other side, with a touch of motion blur);
 * floors of one building ride an elevator up or down; entering a floor zooms
 * in, leaving it zooms out; anything else crossfades. Both pictures are on
 * screen together, so nothing goes dark in between. Under reduced motion every
 * move is a short crossfade.
 */
export const OrbitView: React.FC<OrbitViewProps> = ({ viewKey, move, fill, children }) => {
  const reduced = useReducedMotion();
  const way: SceneMove = reduced ? FADE : move;
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
