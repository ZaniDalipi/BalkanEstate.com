import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ADSENSE_CLIENT, AdPlacement, getAdSlotId, isPlacementEnabled } from '../adsConfig';
import { requestAd, useAdSense } from '../useAdSense';

/**
 * Standard IAB units, largest first.
 *
 * Fixed sizes are deliberate. AdSense's fully responsive mode is what produced
 * the oversized and hand-sized banners on this site: it stretches a unit to
 * whatever the parent happens to be, which on a full-bleed section means a
 * banner the width of the screen, and inside a narrow flex child means a strip
 * a few pixels tall. Picking a real unit that fits the measured width instead
 * gives every page the same familiar banner sizes and a height we can reserve
 * up front, so nothing shifts or lands on top of the content below.
 */
const UNITS = {
  /** In-content banners: billboard → leaderboard → mobile banner. */
  horizontal: [
    { w: 970, h: 250 },
    { w: 970, h: 90 },
    { w: 728, h: 90 },
    { w: 468, h: 60 },
    { w: 320, h: 100 },
    { w: 300, h: 100 },
  ],
  /** Sidebar / in-grid blocks. */
  rectangle: [
    { w: 336, h: 280 },
    { w: 300, h: 250 },
    { w: 250, h: 250 },
    { w: 200, h: 200 },
  ],
  /** Side rails: half page → wide skyscraper → skyscraper. */
  vertical: [
    { w: 300, h: 600 },
    { w: 160, h: 600 },
    { w: 120, h: 600 },
  ],
  /** The bottom anchor bar — kept short so it covers as little as possible. */
  anchor: [
    { w: 728, h: 90 },
    { w: 468, h: 60 },
    { w: 320, h: 50 },
  ],
} as const;

export type AdShape = keyof typeof UNITS;

interface AdSlotProps {
  placement: AdPlacement;
  /** Which family of standard sizes to pick from. Defaults to `horizontal`. */
  shape?: AdShape;
  /** Extra classes on the outer wrapper. */
  className?: string;
  /** Hide the "Advertisement" caption (the anchor bar draws its own). */
  hideLabel?: boolean;
  /** Called when the slot decides it has nothing to show and collapses. */
  onCollapse?: () => void;
}

/**
 * The largest standard unit that fits the space actually available, or null
 * when not even the smallest one does.
 *
 * The returned object is the module-level constant itself, so repeated
 * measurements of an unchanged box hand `setUnit` the same reference and React
 * skips the re-render.
 */
const pickUnit = (shape: AdShape, availableWidth: number, availableHeight: number) => {
  const candidates = UNITS[shape];
  const fits = candidates.find(u => u.w <= availableWidth && u.h <= availableHeight);
  return fits ?? null;
};

/**
 * One Google AdSense unit.
 *
 * Renders nothing at all unless the placement is configured *and* the visitor
 * has consented to marketing cookies, and collapses itself when AdSense returns
 * no ad — so an unfilled slot never leaves a blank gap in the page.
 */
const AdSlot: React.FC<AdSlotProps> = ({
  placement,
  shape = 'horizontal',
  className = '',
  hideLabel = false,
  onCollapse,
}) => {
  const { t } = useTranslation(['common']);
  const { canServeAds, isReady } = useAdSense();
  const containerRef = useRef<HTMLDivElement>(null);
  const insRef = useRef<HTMLModElement>(null);
  /** Size key of the unit already handed to AdSense, so it is never pushed twice. */
  const pushedSizeRef = useRef<string | null>(null);
  const [unit, setUnit] = useState<{ w: number; h: number } | null>(null);
  const [isUnfilled, setIsUnfilled] = useState(false);

  const slotId = getAdSlotId(placement);
  const enabled = isPlacementEnabled(placement) && canServeAds && !isUnfilled;

  // Measure the space we actually have and lock in a real ad size before the
  // unit is requested, so the reserved height matches what gets drawn.
  useLayoutEffect(() => {
    if (!enabled) return;
    const el = containerRef.current;
    if (!el) return;

    const measure = () => {
      const width = el.clientWidth || el.getBoundingClientRect().width;
      const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 0;
      // A rail must not be taller than the screen, or it scrolls past its own
      // section and ends up beside the wrong content.
      const heightBudget = shape === 'vertical' ? Math.max(0, viewportHeight - 96) : Infinity;
      setUnit(pickUnit(shape, width, heightBudget));
    };

    measure();

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', measure);
      return () => window.removeEventListener('resize', measure);
    }
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [enabled, shape]);

  // Ask AdSense to fill the slot once — and only once it has a settled size.
  // A resize that picks a different unit remounts the <ins> (see its key), and
  // the fresh, unclaimed element is pushed again.
  useEffect(() => {
    if (!enabled || !isReady || !unit) return;
    const sizeKey = `${unit.w}x${unit.h}`;
    if (pushedSizeRef.current === sizeKey) return;
    const el = insRef.current;
    if (!el) return;

    pushedSizeRef.current = sizeKey;
    requestAd(el);
  }, [enabled, isReady, unit]);

  // AdSense stamps data-ad-status="unfilled" when it has no ad for the slot.
  // Collapsing then is what keeps an unsold placement from leaving a hole.
  useEffect(() => {
    if (!enabled || !unit) return;
    const el = insRef.current;
    if (!el || typeof MutationObserver === 'undefined') return;

    const check = () => {
      if (el.getAttribute('data-ad-status') === 'unfilled') {
        setIsUnfilled(true);
        onCollapse?.();
      }
    };

    const observer = new MutationObserver(check);
    observer.observe(el, { attributes: true, attributeFilter: ['data-ad-status'] });
    check();
    return () => observer.disconnect();
  }, [enabled, unit, onCollapse]);

  if (!enabled || !slotId) return null;

  // `unit` is null before the first measurement, and whenever the space is too
  // narrow even for the smallest unit of this shape (a phone beside a side rail,
  // say) — then the wrapper stays empty: better nothing than a squeezed or
  // overflowing banner. The wrapper itself stays mounted either way, since it is
  // what gets measured.
  return (
    <div
      ref={containerRef}
      // w-full/min-w-0 matter more than they look: this element is what gets
      // measured, and a content-sized box inside a flex row starts at zero
      // width — which would leave the slot measuring 0 and never drawing.
      className={`flex w-full min-w-0 flex-col items-center ${className}`}
      // Reserving the exact height the unit will occupy is what stops the ad
      // pushing — or landing on top of — whatever renders next.
      style={{ minHeight: unit ? unit.h + (hideLabel ? 0 : 16) : undefined }}
    >
      {unit && !hideLabel && (
        <span className="mb-1 text-[10px] font-medium uppercase tracking-wider text-neutral-400 select-none">
          {t('common:advertisement.label', 'Advertisement')}
        </span>
      )}
      {unit && (
        <ins
          ref={insRef}
          // The key ties the element to its size: when a resize picks a
          // different unit, React replaces the <ins> so AdSense fills a clean
          // one instead of redrawing over an already-claimed slot.
          key={`${unit.w}x${unit.h}`}
          className="adsbygoogle block"
          style={{ display: 'inline-block', width: unit.w, height: unit.h }}
          data-ad-client={ADSENSE_CLIENT}
          data-ad-slot={slotId}
          // Explicitly off: this is the flag that lets a unit blow past its
          // container width on wide screens.
          data-full-width-responsive="false"
        />
      )}
    </div>
  );
};

export default AdSlot;
