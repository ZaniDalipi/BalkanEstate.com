import React, { useLayoutEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { imageSrcSet, optimizeImageUrl } from '@/config/mediaConfig';
import { PLAN_POSES, riseFrom, type PlanPose, type ScreenBox } from './showcaseMotion';
import { FRAME_DRIVEN } from '../../../motion/frameDriven';
import type { Orbit } from './walls/planOrbit';

interface FloorPlanModelProps {
  url: string;
  /** Width ÷ height of the plan image. */
  ratio: number;
  alt: string;
  tilted: boolean;
  /** Where the apartment was on screen; the plan rises from there. */
  origin: ScreenBox | null;
  /** 'contain' a plan on its white board (default), or let a photo 'cover' the frame. */
  fill?: 'contain' | 'cover';
  /** Shown in the rising frame instead of the single picture (the photo carousel). */
  children?: React.ReactNode;
  /** Widest it grows, in CSS pixels (a wide floor picture can take more of the stage than a plan). */
  maxWidth?: number;
  /** Tilted only: how far the buyer has turned and laid back the model (replaces the resting tilt). */
  orbit?: Orbit;
  /** The buyer is turning it: follow quickly instead of with the slow rise. */
  orbitFast?: boolean;
  /** Drawn on the board with the plan (the standing walls). */
  overlay?: React.ReactNode;
}

/** Thickness of the board the plan is printed on, seen along its front edges when tilted. */
const SLAB = 'h-3';
const SLAB_W = 'w-3';

/**
 * The floor plan as a small architectural model: the plan on a white board
 * with a visible edge, laid back and turned in 3D (or flat, to read it). It
 * rises from the apartment's place on the facade into the middle of the
 * stage. The board's size comes from CSS, so it is measured before the model
 * appears and the rise starts exactly over the apartment.
 */
export const FloorPlanModel: React.FC<FloorPlanModelProps> = ({ url, ratio, alt, tilted, origin, fill = 'contain', children, maxWidth = 760, orbit, orbitFast, overlay }) => {
  const reduced = useReducedMotion();
  const slot = useRef<HTMLDivElement>(null);
  const [from, setFrom] = useState<PlanPose | null>(null);

  // Measure where the plan will rest (before paint), then start the rise from the apartment.
  useLayoutEffect(() => {
    setFrom(riseFrom(origin, slot.current?.getBoundingClientRect() ?? null));
  }, [origin]);

  const rest = PLAN_POSES[tilted ? 'tilted' : 'flat'];
  const pose = tilted && orbit ? { ...rest, rotateX: orbit.tilt, rotateZ: rest.rotateZ + orbit.turn } : rest;
  const transition = reduced
    ? { duration: 0 }
    : orbitFast
      ? { type: 'spring' as const, stiffness: 320, damping: 34 }
      : { type: 'spring' as const, stiffness: 38, damping: 12, mass: 1, opacity: { duration: 0.35 } };
  return (
    <div
      ref={slot}
      className="relative"
      // Sized to the showcase's stage area (a size container): room for the buttons above and the dock below.
      style={{ width: `min(100cqw - 3rem, ${maxWidth}px, (100cqh - 9rem) * ${ratio})`, aspectRatio: String(ratio), perspective: 2400 }}
    >
      {from && (
        <motion.div
          {...FRAME_DRIVEN}
          className="absolute inset-0"
          style={{ transformStyle: 'preserve-3d' }}
          initial={reduced ? false : from}
          animate={pose}
          transition={transition}
          data-testid="floor-plan-model"
          data-pose={tilted ? 'tilted' : 'flat'}
        >
          {children ?? (
            <>
              <img
                src={optimizeImageUrl(url, { width: 1280 })}
                srcSet={imageSrcSet(url, [640, 960, 1280, 1920]) || undefined}
                sizes="(min-width: 1280px) 760px, 60vw"
                alt={alt}
                draggable={false}
                className={`absolute inset-0 h-full w-full select-none bg-white shadow-[0_40px_70px_-30px_rgba(70,50,30,0.45)] ${fill === 'cover' ? 'rounded-2xl object-cover' : 'rounded-[3px] object-contain p-[3%]'}`}
              />
              {/* The board's edges, folded back under the plan (all four: it can be turned all the way round). */}
              <div aria-hidden="true" className={`absolute inset-x-0 top-full ${SLAB} origin-top bg-[#ddd5c9]`} style={{ transform: 'rotateX(-90deg)' }} />
              <div aria-hidden="true" className={`absolute inset-x-0 bottom-full ${SLAB} origin-bottom bg-[#d3cabd]`} style={{ transform: 'rotateX(90deg)' }} />
              <div aria-hidden="true" className={`absolute inset-y-0 right-full ${SLAB_W} origin-right bg-[#cbc2b4]`} style={{ transform: 'rotateY(-90deg)' }} />
              <div aria-hidden="true" className={`absolute inset-y-0 left-full ${SLAB_W} origin-left bg-[#c4baab]`} style={{ transform: 'rotateY(90deg)' }} />
              {overlay}
            </>
          )}
        </motion.div>
      )}
    </div>
  );
};
