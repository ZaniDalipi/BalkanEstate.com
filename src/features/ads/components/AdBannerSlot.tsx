import React, { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PhotoIcon } from '@/constants';
import { adBannerKeys } from '@/src/shared/query/queryKeys';
import { getBannersForPlacement, trackBannerImpression, trackBannerClick } from '../api/adBannerApi';
import { PLACEMENT_MAP, type AdPlacement } from '../placements';
import type { AdBanner } from '../types';

interface AdBannerSlotProps {
  placement: AdPlacement;
  /** Extra classes for the wrapper. */
  className?: string;
  /** Rotate through multiple banners in this slot (default true). */
  rotate?: boolean;
  /** Rotation interval in ms (default 8000). */
  rotationMs?: number;
  /** Show a "Your Ad Here" placeholder when the slot has no banner (default true). */
  showPlaceholder?: boolean;
}

const ROTATION_DEFAULT_MS = 8000;

/**
 * Renders advertiser banners for a named placement slot.
 *
 * - Fetches the live banners for the placement (respecting active + schedule on the server).
 * - Sizes every creative to the slot's fixed aspect ratio and fills it (object-cover),
 *   so uploads of any dimensions always fit the slot cleanly.
 * - Rotates through multiple banners in the same slot and tracks impressions/clicks.
 * - When empty, shows a tasteful "Your Ad Here" placeholder (unless disabled).
 */
const AdBannerSlot: React.FC<AdBannerSlotProps> = ({
  placement,
  className = '',
  rotate = true,
  rotationMs = ROTATION_DEFAULT_MS,
  showPlaceholder = true,
}) => {
  const placementDef = PLACEMENT_MAP[placement];
  const aspectRatio = placementDef?.aspectRatio || '16 / 9';

  const { data: banners = [] } = useQuery<AdBanner[]>({
    queryKey: adBannerKeys.placement(placement),
    queryFn: () => getBannersForPlacement(placement),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  const [activeIndex, setActiveIndex] = useState(0);
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

  // ---- Empty slot: show a "Your Ad Here" placeholder ----
  if (!active) {
    if (!showPlaceholder) return null;
    return (
      <div className={`relative w-full ${className}`} role="complementary" aria-label="Advertising slot">
        <span className="block text-[9px] uppercase tracking-wide text-neutral-400 font-medium mb-1 text-center">
          Advertisement
        </span>
        <div
          className="w-full rounded-xl border-2 border-dashed border-neutral-300 bg-neutral-50/70 flex flex-col items-center justify-center text-center gap-1.5 p-3"
          style={{ aspectRatio }}
        >
          <PhotoIcon className="w-6 h-6 text-neutral-300" />
          <span className="text-sm font-semibold text-neutral-500">Your Ad Here</span>
          <span className="text-[11px] text-neutral-400 leading-tight">
            Advertise on BalkanEstate
            <br />
            <span className="text-neutral-300">{placementDef?.recommendedSize}px</span>
          </span>
        </div>
      </div>
    );
  }

  // ---- Live banner ----
  const label = active.advertiserName ? `Ad · ${active.advertiserName}` : 'Advertisement';

  return (
    <div className={`relative w-full ${className}`} role="complementary" aria-label="Advertisement">
      <span className="block text-[9px] uppercase tracking-wide text-neutral-400 font-medium mb-1 text-center">
        {label}
      </span>
      <a
        href={active.linkUrl}
        target={active.openInNewTab ? '_blank' : undefined}
        rel={active.openInNewTab ? 'noopener noreferrer sponsored' : 'sponsored'}
        onClick={() => trackBannerClick(active._id)}
        className="block w-full rounded-xl overflow-hidden border border-neutral-200/70 bg-neutral-100"
        style={{ aspectRatio }}
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
            className="w-full h-full object-cover"
          />
        </picture>
      </a>
    </div>
  );
};

export default AdBannerSlot;
