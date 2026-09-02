import React, { useLayoutEffect, useRef, useState } from 'react';
import AdSlot from './Slot';
import { useAdPreview } from '../hooks/usePreview';
import type { AdPage } from '../types';

interface SideRailAdsProps {
  page: AdPage;
  /** Content max-width (px) the rails must clear on each side. */
  contentMaxWidth?: number;
  children: React.ReactNode;
}

const RAIL_HEIGHT = 600;
const RAIL_TOP = 40;
const GAP = 20;

/**
 * The vertical units a rail may use, widest first. A half-page needs an
 * ultra-wide screen; a 1920px monitor (whose content area is ~1840px once the
 * desktop icon rail is subtracted) only has room for a skyscraper. Stepping
 * down rather than giving up is what puts rails on a Full-HD screen without
 * them clipping the section they sit beside.
 */
const RAIL_UNITS = [
  { format: 'halfpage', width: 300 },
  { format: 'skyscraper', width: 160 },
] as const;

/**
 * A rail is absolutely positioned, so a section shorter than the rail cannot
 * contain it: the rail spills out of its own box and lands on whatever follows
 * — and when a section renders nothing at all (these podium sections return
 * null with no data), two sets of rails end up drawn over each other. Below
 * this height the rails are not shown.
 */
const MIN_SECTION_HEIGHT = RAIL_TOP + RAIL_HEIGHT;

/** The widest rail that fits beside the content in the space actually available. */
export const pickRail = (availableWidth: number, contentMaxWidth: number, gap: number = GAP) =>
  RAIL_UNITS.find(u => availableWidth >= contentMaxWidth + 2 * (u.width + gap)) ?? null;

/** Shortest a section may be and still contain a rail. Exported for tests. */
export const MIN_RAIL_SECTION_HEIGHT = MIN_SECTION_HEIGHT;

/**
 * Wraps a section and floats a vertical ad in each side margin.
 *
 * Rails only appear when the section is wide enough to fit one beside the
 * centred content without overlapping, and tall enough to contain it —
 * otherwise they're hidden entirely. Left rail shows sidebar banner [0], right
 * rail shows [1], so each side is independently controllable from the admin
 * (by order within the placement).
 */
const SideRailAds: React.FC<SideRailAdsProps> = ({ page, contentMaxWidth = 1280, children }) => {
  const [rail, setRail] = useState<(typeof RAIL_UNITS)[number] | null>(null);
  const [isTallEnough, setIsTallEnough] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const preview = useAdPreview();

  // Both checks measure this wrapper, not the window.
  //
  // Width, because the viewport is not what the rails have to fit into: the
  // desktop icon rail takes ~80px off the left, so at 1920px there is only
  // ~1840px of content area. Sizing against innerWidth showed the rails at
  // exactly the width where they no longer fit, and they clipped the section
  // by ~40px a side. The wrapper knows the real number.
  //
  // Height, because a lazy section starts empty and grows once its data lands.
  useLayoutEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;

    // In preview mode the gap is dropped so the admin can see the rails
    // without an ultra-wide monitor.
    const gap = preview.active ? 0 : GAP;

    const measure = () => {
      setRail(pickRail(el.offsetWidth, contentMaxWidth, gap));
      setIsTallEnough(el.offsetHeight >= MIN_SECTION_HEIGHT);
    };
    measure();

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', measure);
      return () => window.removeEventListener('resize', measure);
    }
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [contentMaxWidth, preview.active]);

  // Both must hold: a rail unit that fits beside the content, and a section
  // tall enough to hold it inside its own box.
  const showRails = rail !== null && isTallEnough;

  return (
    <div ref={wrapperRef} style={{ position: 'relative' }}>
      {showRails && (
        <>
          <AdSlot
            page={page}
            placement="sidebar"
            index={0}
            format={rail.format}
            style={{
              position: 'absolute',
              top: RAIL_TOP,
              left: GAP,
              width: rail.width,
              zIndex: 1,
            }}
          />
          <AdSlot
            page={page}
            placement="sidebar"
            index={1}
            format={rail.format}
            style={{
              position: 'absolute',
              top: RAIL_TOP,
              right: GAP,
              width: rail.width,
              zIndex: 1,
            }}
          />
        </>
      )}
      {children}
    </div>
  );
};

export default SideRailAds;
