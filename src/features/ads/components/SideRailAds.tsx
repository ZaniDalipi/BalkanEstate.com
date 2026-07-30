import React, { useEffect, useState } from 'react';
import AdSlot from './AdSlot';
import { useAdPreview } from '../hooks/useAdPreview';
import type { AdPage } from '../types';

interface SideRailAdsProps {
  page: AdPage;
  /** Content max-width (px) the rails must clear on each side. */
  contentMaxWidth?: number;
  children: React.ReactNode;
}

const RAIL_WIDTH = 160;
const GAP = 24;

/**
 * Wraps a section and floats a vertical skyscraper ad in each side margin.
 *
 * Rails only appear when the viewport is wide enough to fit them beside the
 * centered content without overlapping — otherwise they're hidden entirely.
 * Left rail shows sidebar banner [0], right rail shows [1], so each side is
 * independently controllable from the admin (by order within the placement).
 */
const SideRailAds: React.FC<SideRailAdsProps> = ({ page, contentMaxWidth = 1280, children }) => {
  const [showRails, setShowRails] = useState(false);
  const preview = useAdPreview();

  useEffect(() => {
    // Normally need room for content + both rails + gaps on either side.
    // In preview mode, drop the bar to any wide-ish desktop so the admin can
    // see the rails without an ultra-wide monitor.
    const minWidth = preview.active
      ? 1100
      : contentMaxWidth + 2 * (RAIL_WIDTH + GAP) + 32;
    const mq = window.matchMedia(`(min-width: ${minWidth}px)`);
    const update = () => setShowRails(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, [contentMaxWidth, preview.active]);

  return (
    <div style={{ position: 'relative' }}>
      {showRails && (
        <>
          <AdSlot
            page={page}
            placement="sidebar"
            index={0}
            format="skyscraper"
            style={{
              position: 'absolute',
              top: 40,
              left: GAP,
              width: RAIL_WIDTH,
              zIndex: 1,
            }}
          />
          <AdSlot
            page={page}
            placement="sidebar"
            index={1}
            format="skyscraper"
            style={{
              position: 'absolute',
              top: 40,
              right: GAP,
              width: RAIL_WIDTH,
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
