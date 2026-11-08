import React, { useLayoutEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { imageSrcSet, optimizeImageUrl } from '@/config/mediaConfig';
import { PLAN_POSES, riseFrom, type PlanPose, type ScreenBox } from './showcaseMotion';
import { FRAME_DRIVEN } from '../../../motion/frameDriven';

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
export const FloorPlanModel: React.FC<FloorPlanModelProps> = ({ url, ratio, alt, tilted, origin, fill = 'contain', children }) => {
  const reduced = useReducedMotion();
  const slot = useRef<HTMLDivElement>(null);
  const [from, setFrom] = useState<PlanPose | null>(null);

  // Measure where the plan will rest (before paint), then start the rise from the apartment.
  useLayoutEffect(() => {
    setFrom(riseFrom(origin, slot.current?.getBoundingClientRect() ?? null));
  }, [origin]);

  const pose = PLAN_POSES[tilted ? 'tilted' : 'flat'];
  return (
    <div
      ref={slot}
      className="relative"
      style={{ width: `min(100% - 3rem, 760px, (100dvh - 11rem) * ${ratio})`, aspectRatio: String(ratio), perspective: 2400 }}
    >
      {from && (
        <motion.div
          {...FRAME_DRIVEN}
          className="absolute inset-0"
          style={{ transformStyle: 'preserve-3d' }}
          initial={reduced ? false : from}
          animate={pose}
          transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 38, damping: 12, mass: 1, opacity: { duration: 0.35 } }}
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
              {/* The board's front and left edges, folded back under the plan. */}
              <div aria-hidden="true" className={`absolute inset-x-0 top-full ${SLAB} origin-top bg-[#ddd5c9]`} style={{ transform: 'rotateX(-90deg)' }} />
              <div aria-hidden="true" className={`absolute inset-y-0 right-full ${SLAB_W} origin-right bg-[#cbc2b4]`} style={{ transform: 'rotateY(-90deg)' }} />
            </>
          )}
        </motion.div>
      )}
    </div>
  );
};
