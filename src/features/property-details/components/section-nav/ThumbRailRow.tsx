import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { SoftIcon } from '@/src/shared/illustrations';
import type { NavSection } from './sectionDefs';
import type { RailSide } from './sectionNavStore';
import { HIGHLIGHT_SPRING } from './railMotion';

interface Props {
  section: NavSection;
  side: RailSide;
  height: number;
  /** Under the sliding thumb: tinted glass, slightly lifted. */
  hot: boolean;
  /** The section being read now. */
  current: boolean;
  onSelect: () => void;
}

/** Shared by every row: one highlight that glides from row to row. */
const HIGHLIGHT_ID = 'thumb-rail-highlight';

/** One section in the thumb rail's panel: dash on the rail's edge, then icon, then label. */
const ThumbRailRow: React.FC<Props> = ({ section, side, height, hot, current, onSelect }) => {
  const reduceMotion = useReducedMotion();
  return (
    <li style={{ height }}>
      {/* Not scaled or isolated itself: the highlight must slide UNDER every
          row's text on its way (the list is the layer it paints in). */}
      <button
        type="button"
        onClick={onSelect}
        aria-current={current ? 'true' : undefined}
        className={`relative w-full h-full flex items-center gap-3 px-3 rounded-xl text-[15px] font-bold select-none transition-colors duration-150 motion-reduce:transition-none ${
          side === 'right' ? 'flex-row-reverse' : ''
        } ${hot ? 'text-white' : current ? 'bg-primary/10 text-primary-dark' : 'text-neutral-800 active:bg-white/70'}`}
      >
        {hot && (
          <motion.span
            layoutId={HIGHLIGHT_ID}
            aria-hidden="true"
            className="thumb-glass-tint absolute inset-0 -z-10 rounded-xl"
            initial={false}
            animate={{ scale: reduceMotion ? 1 : 1.04 }}
            transition={reduceMotion ? { duration: 0 } : HIGHLIGHT_SPRING}
          />
        )}
        <span
          aria-hidden="true"
          className={`flex-none h-1 w-5 rounded-full transition-[scale,background-color] duration-200 motion-reduce:transition-none ${
            side === 'right' ? 'origin-right' : 'origin-left'
          } ${hot ? 'bg-white' : current ? 'bg-primary' : 'scale-x-[0.6] scale-y-75 bg-neutral-400/70'}`}
        />
        <SoftIcon name={section.icon} className="w-5 h-5 flex-none" />
        <span className={`flex-1 min-w-0 truncate ${side === 'right' ? 'text-right' : 'text-left'}`}>{section.label}</span>
      </button>
    </li>
  );
};

export default ThumbRailRow;
