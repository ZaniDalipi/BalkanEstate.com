import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { XMarkIcon } from '@/constants';
import { adBannerKeys } from '@/src/shared/query/queryKeys';
import { getBannersForPlacement, trackBannerImpression, trackBannerClick } from '../api/adBannerApi';
import { PLACEMENT_MAP, type AdPlacement } from '../placements';
import type { AdBanner } from '../types';

interface AdBannerSlotProps {
  placement: AdPlacement;
  /** Extra classes for the wrapper (ignored for the sticky bottom variant). */
  className?: string;
  /** Rotate through multiple banners in this slot (default true). */
  rotate?: boolean;
  /** Rotation interval in ms (default 8000). */
  rotationMs?: number;
}

const ROTATION_DEFAULT_MS = 8000;

/**
 * Renders advertiser banners for a named placement slot.
 *
 * - Fetches the live banners for the placement (respecting active + schedule on the server).
 * - Rotates through multiple banners in the same slot.
 * - Tracks impressions (once per banner shown) and clicks.
 * - Renders as a fixed, dismissible bar for sticky placements.
 * - Renders nothing when there are no banners to show.
 */
const AdBannerSlot: React.FC<AdBannerSlotProps> = ({
  placement,
  className = '',
  rotate = true,
  rotationMs = ROTATION_DEFAULT_MS,
}) => {
  const placementDef = PLACEMENT_MAP[placement];
  const isStickyPlacement = !!placementDef?.sticky;

  const { data: banners = [] } = useQuery<AdBanner[]>({
    queryKey: adBannerKeys.placement(placement),
    queryFn: () => getBannersForPlacement(placement),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  const [activeIndex, setActiveIndex] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const trackedImpressions = useRef<Set<string>>(new Set());

  // Reset rotation when the banner set changes.
  useEffect(() => {
    setActiveIndex(0);
  }, [banners.length, placement]);

  // Rotate through banners.
  useEffect(() => {
    if (!rotate || banners.length <= 1) return;
    const timer = window.setInterval(() => {
      setActiveIndex((i) => (i + 1) % banners.length);
    }, Math.max(3000, rotationMs));
    return () => window.clearInterval(timer);
  }, [rotate, banners.length, rotationMs]);

  const active = banners[activeIndex];

  // Track an impression the first time each banner is shown.
  useEffect(() => {
    if (!active) return;
    if (trackedImpressions.current.has(active._id)) return;
    trackedImpressions.current.add(active._id);
    trackBannerImpression(active._id);
  }, [active]);

  // Restore per-session dismissal for sticky bars.
  const dismissKey = `adbanner_dismissed_${placement}`;
  useEffect(() => {
    if (isStickyPlacement && sessionStorage.getItem(dismissKey) === 'true') {
      setDismissed(true);
    }
  }, [isStickyPlacement, dismissKey]);

  const handleClick = useCallback(() => {
    if (active) trackBannerClick(active._id);
  }, [active]);

  const handleDismiss = useCallback(() => {
    setDismissed(true);
    try {
      sessionStorage.setItem(dismissKey, 'true');
    } catch {
      /* ignore storage errors */
    }
  }, [dismissKey]);

  if (!active || dismissed) return null;

  const label = active.advertiserName ? `Ad · ${active.advertiserName}` : 'Advertisement';

  const creative = (
    <a
      href={active.linkUrl}
      target={active.openInNewTab ? '_blank' : undefined}
      rel={active.openInNewTab ? 'noopener noreferrer sponsored' : 'sponsored'}
      onClick={handleClick}
      className="block w-full"
      aria-label={active.title}
    >
      <picture>
        {active.mobileImageUrl && (
          <source media="(max-width: 640px)" srcSet={active.mobileImageUrl} />
        )}
        <img
          src={active.imageUrl}
          alt={active.title}
          loading="lazy"
          className="w-full h-auto object-contain mx-auto"
        />
      </picture>
    </a>
  );

  // Sticky bottom bar variant.
  if (isStickyPlacement) {
    return (
      <div
        // Hidden on phones so it never covers the mobile bottom navigation bar.
        className="hidden md:block fixed inset-x-0 bottom-0 z-[150] bg-white/95 backdrop-blur-md border-t border-neutral-200 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        role="complementary"
        aria-label="Advertisement"
      >
        <div className="relative max-w-5xl mx-auto flex items-center justify-center px-10 py-2">
          <span className="absolute left-2 top-1 text-[9px] uppercase tracking-wide text-neutral-400 font-medium">
            {label}
          </span>
          <div className="w-full max-h-24 overflow-hidden flex items-center justify-center">
            {creative}
          </div>
          {active.dismissible && (
            <button
              type="button"
              onClick={handleDismiss}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
              aria-label="Dismiss advertisement"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    );
  }

  // Inline / in-flow variant.
  return (
    <div className={`relative w-full ${className}`} role="complementary" aria-label="Advertisement">
      <span className="block text-[9px] uppercase tracking-wide text-neutral-400 font-medium mb-1 text-center">
        {label}
      </span>
      <div className="rounded-xl overflow-hidden border border-neutral-200/70 bg-neutral-50">
        {creative}
      </div>
    </div>
  );
};

export default AdBannerSlot;
