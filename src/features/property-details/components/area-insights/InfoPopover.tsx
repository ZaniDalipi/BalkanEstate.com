import React, { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Info } from 'lucide-react';
import { useEscapeLayer } from '@/src/features/developments/components/public/explorer/useEscapeLayer';

export interface InfoPopoverProps {
  /** What the popover explains; names the button ("About …") and the panel. */
  topic: string;
  /** Which edge of the button the panel lines up with. */
  align?: 'start' | 'end';
  children: React.ReactNode;
}

/** Space kept between the panel and the screen edge, as the page gutter. */
const EDGE_GUTTER_PX = 16;

/** How far to slide a panel sideways so it stays on screen. Pure. */
export const shiftIntoView = (left: number, right: number, viewportWidth: number, gutter = EDGE_GUTTER_PX): number => {
  if (right > viewportWidth - gutter) return Math.max(gutter - left, viewportWidth - gutter - right);
  if (left < gutter) return gutter - left;
  return 0;
};

/**
 * The ⓘ next to a card title: opens a short explanation. Closes on Esc (top
 * layer only), on a click outside, or on the button again; focus goes back to
 * the button when it closes from the keyboard.
 */
const InfoPopover: React.FC<InfoPopoverProps> = ({ topic, align = 'end', children }) => {
  const { t } = useTranslation(['property']);
  const [open, setOpen] = useState(false);
  const [shift, setShift] = useState(0);
  const panelId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const close = useCallback((refocus: boolean) => {
    setOpen(false);
    if (refocus) buttonRef.current?.focus();
  }, []);

  useEscapeLayer(panelRef, () => close(true), open);

  // Measure once it is open and slide it back on screen when it would spill.
  useLayoutEffect(() => {
    if (!open || !panelRef.current) {
      setShift(0);
      return;
    }
    const box = panelRef.current.getBoundingClientRect();
    setShift(shiftIntoView(box.left, box.right, document.documentElement.clientWidth));
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) close(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open, close]);

  const label = t('property:areaInsights.about', 'About: {{topic}}', { topic });

  return (
    <div ref={wrapRef} className="relative inline-flex">
      <button
        ref={buttonRef}
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-11 w-11 landscape:h-[32px] landscape:w-[32px] items-center justify-center rounded-full text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <Info aria-hidden="true" className="h-5 w-5" />
      </button>
      {open && (
        <div
          ref={panelRef}
          id={panelId}
          role="dialog"
          aria-label={topic}
          style={shift ? { transform: `translateX(${shift}px)` } : undefined}
          className={`absolute top-full z-30 mt-1 w-72 max-w-[calc(100vw-2rem)] rounded-xl border border-neutral-200 bg-white p-4 text-sm leading-relaxed text-neutral-600 shadow-lg ${
            align === 'end' ? 'right-0' : 'left-0'
          }`}
        >
          {children}
        </div>
      )}
    </div>
  );
};

export default InfoPopover;
