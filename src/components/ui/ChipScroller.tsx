import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useReducedMotion } from 'framer-motion';
import { ChevronLeftIcon, ChevronRightIcon } from '@/constants';
import { useHorizontalScroll } from '@/src/shared/hooks/useHorizontalScroll';

interface ChipScrollerProps {
  /** Classes for the scrolling row itself (gap, padding, bleed margins). */
  className?: string;
  children: React.ReactNode;
}

const ARROW =
  'liquid-control pointer-events-auto hidden h-11 w-11 items-center justify-center rounded-full text-neutral-700 pointer-fine:flex';

/**
 * A row of chips that scrolls sideways. Touch swipes as usual; with a mouse,
 * the wheel scrolls it sideways and glass arrows page it, shown only on the
 * side that has more, over a fade so the cut-off chip reads as "more here".
 */
const ChipScroller: React.FC<ChipScrollerProps> = ({ className = '', children }) => {
  const { t } = useTranslation('common');
  const reduceMotion = useReducedMotion();
  const [row, setRow] = useState<HTMLDivElement | null>(null);
  const { canScrollStart, canScrollEnd, scrollPage } = useHorizontalScroll(row);

  return (
    <div className="relative">
      <div ref={setRow} className={`flex overflow-x-auto scrollbar-hide ${className}`}>
        {children}
      </div>
      {canScrollStart && (
        <div className="pointer-events-none absolute left-0 top-0 h-14 hidden items-start pt-2 bg-gradient-to-r from-[#f2f2f7] via-[#f2f2f7]/80 to-transparent pr-8 pointer-fine:flex">
          <button type="button" className={ARROW} onClick={() => scrollPage(-1, !reduceMotion)} aria-label={t('scroller.scrollLeft', 'Scroll left')}>
            <ChevronLeftIcon className="h-5 w-5" />
          </button>
        </div>
      )}
      {canScrollEnd && (
        <div className="pointer-events-none absolute right-0 top-0 h-14 hidden items-start justify-end pt-2 bg-gradient-to-l from-[#f2f2f7] via-[#f2f2f7]/80 to-transparent pl-8 pointer-fine:flex">
          <button type="button" className={ARROW} onClick={() => scrollPage(1, !reduceMotion)} aria-label={t('scroller.scrollRight', 'Scroll right')}>
            <ChevronRightIcon className="h-5 w-5" />
          </button>
        </div>
      )}
    </div>
  );
};

export default ChipScroller;
