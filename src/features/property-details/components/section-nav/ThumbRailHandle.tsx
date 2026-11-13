// The part of the thumb rail that is always on the screen edge: a slim glass
// pill with one dash per section (current one in blue), or, when the reader
// tucked it away, a small glass tab. Either one is pressed and slid on.

import React, { forwardRef } from 'react';
import type { RailSide } from './sectionNavStore';
import type { NavSection } from './sectionDefs';

interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  side: RailSide;
  tucked: boolean;
  /** Stepped aside (scrolling, over the 3D map): faded out and not pressable. */
  away: boolean;
  sections: NavSection[];
  activeKey: string;
  expanded: boolean;
  label: string;
}

const ThumbRailHandle = forwardRef<HTMLButtonElement, Props>(
  ({ side, tucked, away, sections, activeKey, expanded, label, className = '', ...pointer }, ref) => {
    const right = side === 'right';
    const shape = right ? 'rounded-l-2xl border-r-0' : 'rounded-r-2xl border-l-0';
    return (
      <button
        ref={ref}
        type="button"
        aria-label={label}
        aria-haspopup="dialog"
        aria-expanded={expanded}
        aria-hidden={away || undefined}
        tabIndex={away ? -1 : 0}
        data-testid="thumb-rail-handle"
        // A 48px-wide invisible hit area around a slim visible pill; no page
        // scroll or text selection may start from it, the slide is ours.
        className={`fixed z-[35] flex items-center w-12 py-3 select-none touch-none outline-none group transition-opacity duration-300 motion-reduce:transition-none ${
          right ? 'justify-end' : 'justify-start'
        } ${away ? 'opacity-0 pointer-events-none' : 'opacity-100'} ${className}`}
        style={{
          top: '58%',
          transform: 'translateY(-50%)',
          ...(right
            ? { right: 'env(safe-area-inset-right, 0px)' }
            : { left: 'var(--thumb-rail-left)' }),
          WebkitTouchCallout: 'none',
        }}
        {...pointer}
      >
        {tucked ? (
          <span
            aria-hidden="true"
            className={`thumb-glass relative ${shape} flex items-center justify-center w-5 h-[4.5rem] group-focus-visible:ring-2 group-focus-visible:ring-primary`}
          >
            <span className="w-1 h-9 rounded-full bg-neutral-500/80" />
          </span>
        ) : (
          <span
            aria-hidden="true"
            className={`thumb-glass relative ${shape} flex flex-col gap-[5px] py-3 px-2 group-focus-visible:ring-2 group-focus-visible:ring-primary ${
              right ? 'items-end' : 'items-start'
            }`}
          >
            {sections.map((s) => (
              <span
                key={s.key}
                className={`rounded-full transition-all duration-300 motion-reduce:transition-none ${
                  s.key === activeKey ? 'h-1 w-5 bg-primary shadow-sm shadow-primary/50' : 'h-[3px] w-3 bg-neutral-500/60'
                }`}
              />
            ))}
          </span>
        )}
      </button>
    );
  }
);
ThumbRailHandle.displayName = 'ThumbRailHandle';

export default ThumbRailHandle;
