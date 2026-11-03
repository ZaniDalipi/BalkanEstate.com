import React, { useLayoutEffect, useRef } from 'react';
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { stackOffsetPx, stackScaleTarget } from '@/src/shared/utils/stackScale';
import { findScrollParent } from '@/src/shared/utils/scrollParent';

interface StickyStackSlotProps {
  index: number;
  total: number;
  children: React.ReactNode;
}

/**
 * One card of a scroll stack (like the featured listings on the home page):
 * it sticks near the top while the next card slides up over it, and shrinks a
 * little as it is covered. The page scrolls `<main>`, not the window, so the
 * progress is read from whichever element really scrolls. With reduced motion
 * the cards simply scroll.
 */
export const StickyStackSlot: React.FC<StickyStackSlotProps> = ({ index, total, children }) => {
  const ref = useRef<HTMLDivElement>(null);
  const scroller = useRef<HTMLElement | null>(null);
  const reduce = useReducedMotion();
  // Before useScroll's own effect, so it listens to the real scroller from the start.
  useLayoutEffect(() => {
    // The page's real scroller; on an ordinary window-scrolled page, the document (framer's own default).
    scroller.current = findScrollParent(ref.current) ?? document.documentElement;
  }, []);
  const { scrollYProgress } = useScroll({ target: ref, container: scroller, offset: ['start start', 'end start'] });
  const scale = useTransform(scrollYProgress, [0, 1], [1, stackScaleTarget(index, total)]);

  if (reduce) return <div className="px-4 py-3">{children}</div>;
  return (
    <div ref={ref} className="sticky top-0 flex min-h-[78vh] items-center justify-center px-4 sm:min-h-[88vh]">
      <motion.div style={{ scale, top: stackOffsetPx(index) }} className="relative w-full origin-top">
        {children}
      </motion.div>
    </div>
  );
};
