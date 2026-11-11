import React from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import type { Hotspot } from '../../../../types';
import { toPolygon, type Point } from '../../../../utils/polygonGeometry';
import { ViewPicture } from '../ViewPicture';
import { DIVE_PAPER, GHOST_FILTER } from './diveStyle';
import type { DivePhase } from './diveTimeline';
import { holeMask } from './holeMask';
import { FRAME_DRIVEN } from '../../motion/frameDriven';

interface DiveVeilProps {
  /** The apartment left in colour; undefined fades the veil away. */
  hotspot?: Hotspot;
  phase?: DivePhase;
  imageUrl: string;
  width: number;
  height: number;
}

/** How much paper lies over the white model in each phase (the showcase then fades to plain paper). */
const PAPER: Record<DivePhase, number> = { flight: 0, ghost: 0.42, open: 0.6 };
const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * Turns the building into a white architectural model around one apartment,
 * which keeps its colour: a bleached copy of the rendering and a paper wash,
 * both masked around the apartment. It lives in the pan/zoom layer, so it
 * stays glued to the facade while the camera flies in. During the flight it is
 * invisible; the model fades in as the camera arrives.
 */
export const DiveVeil: React.FC<DiveVeilProps> = ({ hotspot, phase = 'open', imageUrl, width: W, height: H }) => {
  const reduced = useReducedMotion();
  const pts = hotspot ? toPolygon(hotspot.shape, hotspot.points as Point[]).map(([x, y]) => [x * W, y * H] as const) : [];
  const mask = pts.length ? holeMask(W, H, pts) : '';
  const ghosted = phase !== 'flight';
  const fade = (s: number) => ({ duration: reduced ? 0 : s, ease: EASE });

  return (
    <AnimatePresence>
      {mask && (
        <motion.div
          key="veil"
          {...FRAME_DRIVEN}
          aria-hidden="true"
          data-testid="dive-veil"
          data-phase={phase}
          className="pointer-events-none absolute inset-0 z-[2]"
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: fade(0.9) }}
        >
          <motion.div
            {...FRAME_DRIVEN}
            className="absolute inset-0"
            style={{ WebkitMaskImage: mask, maskImage: mask, WebkitMaskSize: '100% 100%', maskSize: '100% 100%' }}
            initial={reduced ? false : { opacity: 0 }}
            animate={{ opacity: ghosted ? 1 : 0 }}
            transition={fade(0.9)}
          >
            <ViewPicture url={imageUrl} decorative style={{ filter: GHOST_FILTER }} />
            <motion.div
              {...FRAME_DRIVEN}
              className="absolute inset-0"
              style={{ background: DIVE_PAPER }}
              initial={reduced ? false : { opacity: 0 }}
              animate={{ opacity: PAPER[phase] }}
              transition={fade(0.9)}
            />
          </motion.div>
          <motion.svg
            {...FRAME_DRIVEN}
            viewBox={`0 0 ${W} ${H}`}
            preserveAspectRatio="none"
            className="absolute inset-0 h-full w-full"
            initial={reduced ? false : { opacity: 0 }}
            animate={{ opacity: ghosted ? 1 : 0 }}
            transition={fade(0.6)}
          >
            <polygon
              points={pts.map(([x, y]) => `${x},${y}`).join(' ')}
              fill="none"
              stroke="#fff"
              strokeOpacity={0.9}
              strokeWidth={Math.max(2, W / 600)}
              strokeLinejoin="round"
            />
          </motion.svg>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
