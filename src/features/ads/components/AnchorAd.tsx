import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { XMarkIcon } from '@/constants';
import AdSlot from './AdSlot';
import { isPlacementEnabled } from '../adsConfig';
import { useAdSense } from '../useAdSense';

/** Height the bar reserves at the foot of the page while it is on screen. */
export const ANCHOR_AD_HEIGHT_VAR = '--anchor-ad-height';

/** Dismissed for the rest of the visit only — the choice is not carried over. */
const DISMISS_KEY = 'balkanestate_anchor_ad_dismissed';

/**
 * Only one anchor bar may exist. Two mounted at once is exactly the bug in the
 * screenshots — a second sponsored bar drawn across the first — so the bar is
 * a single claim: whoever holds it renders, any other instance stands down.
 */
let claimOwner: symbol | null = null;

const wasDismissed = () => {
  try {
    return sessionStorage.getItem(DISMISS_KEY) === 'true';
  } catch {
    return false;
  }
};

interface AnchorAdProps {
  /** Set false on views that own the bottom of the screen (map, inbox, checkout). */
  enabled?: boolean;
  /**
   * Extra space to clear at the bottom, e.g. the mobile BottomNav or a page's
   * own sticky action bar. Any CSS length.
   */
  bottomOffset?: string;
}

/**
 * The dismissible ad bar pinned to the bottom of the viewport.
 *
 * Two rules keep it from covering anything:
 *  - it sits *above* whatever already owns the bottom edge (`bottomOffset`),
 *    rather than on the same line as it;
 *  - it publishes its own height as a CSS variable, which the app's main scroll
 *    container adds to its bottom padding — so the last section of a page can
 *    still be scrolled clear of the bar instead of hiding underneath it.
 */
const AnchorAd: React.FC<AnchorAdProps> = ({ enabled = true, bottomOffset = '0px' }) => {
  const { t } = useTranslation(['common']);
  const { canServeAds } = useAdSense();
  const barRef = useRef<HTMLDivElement>(null);
  const [isDismissed, setIsDismissed] = useState(wasDismissed);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isPrimary, setIsPrimary] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const token = Symbol('anchor-ad');
    if (claimOwner === null) {
      claimOwner = token;
      setIsPrimary(true);
    }
    setMounted(true);
    return () => {
      if (claimOwner === token) claimOwner = null;
    };
  }, []);

  const isVisible =
    mounted &&
    isPrimary &&
    enabled &&
    !isDismissed &&
    !isCollapsed &&
    canServeAds &&
    isPlacementEnabled('anchor');

  // Publish the bar's real height so the page can pad for it. Cleared whenever
  // the bar is not on screen, so no page keeps dead space at its foot.
  useEffect(() => {
    const root = document.documentElement;
    if (!isVisible) {
      root.style.removeProperty(ANCHOR_AD_HEIGHT_VAR);
      return;
    }

    const publishHeight = () => {
      const height = barRef.current?.offsetHeight ?? 0;
      root.style.setProperty(ANCHOR_AD_HEIGHT_VAR, `${height}px`);
    };

    publishHeight();

    const el = barRef.current;
    if (!el || typeof ResizeObserver === 'undefined') {
      return () => root.style.removeProperty(ANCHOR_AD_HEIGHT_VAR);
    }
    const observer = new ResizeObserver(publishHeight);
    observer.observe(el);
    return () => {
      observer.disconnect();
      root.style.removeProperty(ANCHOR_AD_HEIGHT_VAR);
    };
  }, [isVisible]);

  const handleDismiss = useCallback(() => {
    setIsDismissed(true);
    try {
      sessionStorage.setItem(DISMISS_KEY, 'true');
    } catch {
      // Storage unavailable: the bar simply comes back on the next page load.
    }
  }, []);

  const handleCollapse = useCallback(() => setIsCollapsed(true), []);

  if (!isVisible) return null;

  return createPortal(
    <div
      ref={barRef}
      // Below the bottom nav (z-50) and every modal, so it can never sit over a
      // control the visitor is reaching for. md:left-20 starts the bar after the
      // desktop icon rail rather than running underneath it.
      className="fixed left-0 right-0 z-40 flex items-center justify-center gap-2 border-t border-neutral-200 bg-white/95 px-2 py-1.5 shadow-[0_-2px_12px_rgba(0,0,0,0.08)] backdrop-blur-md md:left-20"
      style={{ bottom: `calc(${bottomOffset} + env(safe-area-inset-bottom, 0px))` }}
      role="complementary"
      aria-label={t('common:advertisement.label', 'Advertisement')}
    >
      <span className="hidden shrink-0 text-[10px] font-medium uppercase tracking-wider text-neutral-400 sm:block">
        {t('common:advertisement.label', 'Advertisement')}
      </span>

      <AdSlot placement="anchor" shape="anchor" hideLabel onCollapse={handleCollapse} />

      <button
        type="button"
        onClick={handleDismiss}
        className="shrink-0 rounded-full p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700"
        aria-label={t('common:advertisement.dismiss', 'Close advertisement')}
      >
        <XMarkIcon className="h-4 w-4" />
      </button>
    </div>,
    document.body,
  );
};

export default AnchorAd;
