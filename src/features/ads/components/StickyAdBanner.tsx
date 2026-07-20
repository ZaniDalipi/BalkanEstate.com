import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { XMarkIcon } from '@/constants';
import { optimizeCloudinaryUrl } from '@/config/cloudinaryConfig';
import { useAdBanners, selectByPlacement } from '../hooks/useAdBanners';
import { trackClick, trackImpression } from '../api/adBannerApi';
import type { AdPage, AdPlacement } from '../types';

interface StickyAdBannerProps {
  /** Which page the visitor is currently on (drives which banners load). */
  page: AdPage;
  /** Which placement slot to render. Defaults to the sticky bottom bar. */
  placement?: AdPlacement;
}

const SESSION_DISMISS_PREFIX = 'ad-banner-dismissed:';

/**
 * Renders the highest-priority active banner for a page + placement.
 *
 * `sticky-top` / `sticky-bottom` pin to the viewport edge; other placements
 * render inline. Visitors can dismiss a sticky banner for the session.
 */
const StickyAdBanner: React.FC<StickyAdBannerProps> = ({ page, placement = 'sticky-bottom' }) => {
  const { t } = useTranslation(['common']);
  const { data } = useAdBanners(page);
  const [dismissed, setDismissed] = useState(false);
  const trackedRef = useRef<string | null>(null);

  const banner = useMemo(() => selectByPlacement(data, placement)[0], [data, placement]);

  // Restore per-session dismissal for this specific banner.
  useEffect(() => {
    if (!banner) return;
    try {
      const key = `${SESSION_DISMISS_PREFIX}${banner.id}`;
      setDismissed(sessionStorage.getItem(key) === '1');
    } catch {
      /* sessionStorage unavailable — treat as not dismissed */
    }
  }, [banner]);

  // Record one impression per banner per mount.
  useEffect(() => {
    if (!banner || dismissed) return;
    if (trackedRef.current === banner.id) return;
    trackedRef.current = banner.id;
    trackImpression(banner.id);
  }, [banner, dismissed]);

  if (!banner || dismissed) return null;

  const isSticky = placement === 'sticky-top' || placement === 'sticky-bottom';
  // sticky-bottom sits above the mobile bottom nav (3.5rem + safe area), flush to
  // the bottom on desktop where the bottom nav is hidden (md:).
  const stickyPosition =
    placement === 'sticky-top'
      ? 'fixed top-0 left-0 right-0'
      : 'fixed left-0 right-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom,0px))] md:bottom-0';

  const handleClick = () => {
    trackClick(banner.id);
  };

  const handleDismiss = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem(`${SESSION_DISMISS_PREFIX}${banner.id}`, '1');
    } catch {
      /* ignore */
    }
  };

  const imageSrc = optimizeCloudinaryUrl(banner.imageUrl, { width: 1200, quality: 'auto' });

  return (
    <div
      className={`${isSticky ? `${stickyPosition} z-[120]` : 'relative w-full'} pointer-events-none`}
      role="complementary"
      aria-label={t('ads.advertisement', 'Advertisement')}
    >
      <div className="pointer-events-auto mx-auto flex max-w-5xl items-stretch justify-center px-2 pb-2 pt-2 sm:px-4">
        <div className="relative flex w-full overflow-hidden rounded-xl border border-neutral-200/70 bg-white shadow-lg">
          {/* Sponsored label */}
          <span className="absolute left-2 top-1 z-10 rounded bg-black/55 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-white">
            {t('ads.sponsored', 'Sponsored')}
          </span>

          <a
            href={banner.linkUrl}
            target="_blank"
            rel="noopener noreferrer sponsored"
            onClick={handleClick}
            className="block w-full"
            aria-label={banner.title}
          >
            <img
              src={imageSrc}
              alt={banner.title}
              loading="lazy"
              className="h-16 w-full object-cover sm:h-20 md:h-24"
            />
          </a>

          {/* Dismiss */}
          <button
            type="button"
            onClick={handleDismiss}
            className="absolute right-1.5 top-1.5 z-10 rounded-full bg-black/45 p-1 text-white transition-colors hover:bg-black/70"
            aria-label={t('ads.close', 'Close advertisement')}
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default StickyAdBanner;
