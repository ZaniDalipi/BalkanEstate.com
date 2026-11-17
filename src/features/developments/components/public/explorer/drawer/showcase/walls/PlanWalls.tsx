import React, { useLayoutEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import type { PlanWallImages } from './usePlanWalls';

interface PlanWallsProps {
  walls: PlanWallImages;
}

/** Slices stacked to make a wall; more look smoother, fewer draw faster. */
const SLICES = 14;
/** Same box as the plan picture on its board, so the walls sit on its lines. */
const LAYER = 'pointer-events-none absolute inset-0 h-full w-full select-none object-contain p-[3%]';

/**
 * The plan's walls standing up from it: the wall shape stacked in thin
 * slices, shaded from the base up, under a dark cap. They grow up from the plan;
 * their height is in scale with the building drawn, not the sheet.
 */
export const PlanWalls: React.FC<PlanWallsProps> = ({ walls }) => {
  const reduced = useReducedMotion();
  const box = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return undefined;
    const measure = () => setWidth(el.offsetWidth);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const wallPx = width * walls.height;
  const tone = (i: number) => walls.sides[Math.min(walls.sides.length - 1, Math.floor((i / SLICES) * walls.sides.length))];

  return (
    <motion.div
      ref={box}
      aria-hidden="true"
      data-testid="plan-walls"
      className="pointer-events-none absolute inset-0"
      style={{ transformStyle: 'preserve-3d', transformOrigin: 'center' }}
      initial={reduced ? false : { scaleZ: 0, opacity: 0 }}
      animate={{ scaleZ: 1, opacity: 1 }}
      transition={{ duration: reduced ? 0 : 0.6, ease: 'easeOut' }}
    >
      {Array.from({ length: SLICES }, (_, i) => (
        <img key={i} src={tone(i)} alt="" draggable={false} className={LAYER} style={{ transform: `translateZ(${((i + 1) / (SLICES + 1)) * wallPx}px)` }} />
      ))}
      <img src={walls.top} alt="" draggable={false} className={LAYER} style={{ transform: `translateZ(${wallPx}px)` }} />
    </motion.div>
  );
};
