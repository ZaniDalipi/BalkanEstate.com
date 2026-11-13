import React from 'react';
import { SoftIcon } from '@/src/shared/illustrations';
import type { NavSection } from './sectionDefs';
import type { RailSide } from './sectionNavStore';

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

/** One section in the thumb rail's panel: dash on the rail's edge, then icon, then label. */
const ThumbRailRow: React.FC<Props> = ({ section, side, height, hot, current, onSelect }) => (
  <li style={{ height }}>
    <button
      type="button"
      onClick={onSelect}
      aria-current={current ? 'true' : undefined}
      className={`w-full h-full flex items-center gap-3 px-3 rounded-xl text-[15px] font-bold transition-[transform,background-color,color] duration-150 motion-reduce:transition-none ${
        side === 'right' ? 'flex-row-reverse' : ''
      } ${
        hot
          ? 'thumb-glass-tint scale-[1.04]'
          : current
            ? 'bg-primary/10 text-primary-dark'
            : 'text-neutral-800 active:bg-white/70'
      }`}
    >
      <span
        aria-hidden="true"
        className={`flex-none rounded-full ${
          hot ? 'h-1 w-5 bg-white' : current ? 'h-1 w-5 bg-primary' : 'h-[3px] w-3 bg-neutral-400/70'
        }`}
      />
      <SoftIcon name={section.icon} className="w-5 h-5 flex-none" />
      <span className={`flex-1 min-w-0 truncate ${side === 'right' ? 'text-right' : 'text-left'}`}>{section.label}</span>
    </button>
  </li>
);

export default ThumbRailRow;
