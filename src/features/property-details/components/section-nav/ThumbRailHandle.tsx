// The part of the thumb rail that is always on the screen edge: a slim glass
// pill with one dash per section (current one in blue), or, when the reader
// tucked it away, a small glass tab. Either one is pressed and slid on.

import React, { forwardRef } from 'react';
import { IOS_EASE_CSS } from './railMotion';
import type { RailSide } from './sectionNavStore';
import type { NavSection } from './sectionDefs';

interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  side: RailSide;
  tucked: boolean;
  /** Stepped aside (scrolling, over the 3D map): slid off the edge and not pressable. */
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
    // Pressed: the glass swells a little toward the page, like an iOS control.
    const press = `transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none ${
      right ? 'origin-right' : 'origin-left'
    } ${expanded ? 'scale-[1.08]' : 'scale-100'}`;
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
        // While open it sits above the dimmed page, lit, like the source of
        // an iOS context menu.
        className={`fixed flex items-center w-12 py-3 select-none touch-none outline-none group motion-reduce:!transition-none ${
          expanded ? 'z-[46]' : 'z-[35]'
        } ${right ? 'justify-end' : 'justify-start'} ${away ? 'pointer-events-none' : ''} ${className}`}
        style={{
          top: '58%',
          // Transform and opacity only, so stepping aside runs on the compositor.
          transform: `translate(${away ? (right ? '100%' : '-100%') : '0'}, -50%)`,
          opacity: away ? 0 : 1,
          transition: `transform 0.45s ${IOS_EASE_CSS}, opacity 0.3s ${IOS_EASE_CSS}`,
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
            className={`thumb-glass relative ${shape} ${press} flex items-center justify-center w-5 h-[4.5rem] group-focus-visible:ring-2 group-focus-visible:ring-primary`}
          >
            <span className="w-1 h-9 rounded-full bg-neutral-500/80" />
          </span>
        ) : (
          <span
            aria-hidden="true"
            className={`thumb-glass relative ${shape} ${press} flex flex-col gap-[5px] py-3 px-2 group-focus-visible:ring-2 group-focus-visible:ring-primary ${
              right ? 'items-end' : 'items-start'
            }`}
          >
            {sections.map((s) => (
              // One size for every dash, scaled down when not current: the
              // change animates as a transform, never as a width.
              <span
                key={s.key}
                className={`h-1 w-5 rounded-full transition-[scale,background-color] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none ${
                  right ? 'origin-right' : 'origin-left'
                } ${s.key === activeKey ? 'bg-primary shadow-sm shadow-primary/50' : 'scale-x-[0.6] scale-y-75 bg-neutral-500/60'}`}
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
