// PropertyMapLink Component
// 3D map experience with extruded buildings and shadow timelapse

import React, { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Property } from '../../../types';
import { resolveMapDestination } from '@/shared/map/mapDestination';

// Lazy load the 3D map component for better initial page load
const loadMap3D = () => import('@/features/map/components/Map3DBuildings');
const Map3DBuildings = lazy(loadMap3D);

/**
 * Fetch the map's chunk once the browser is idle.
 *
 * Mounting the map and fetching the code for it are two different costs, and
 * only the first one belongs near the viewport: the module is a plain network
 * fetch that can happen while the reader is still looking at the photos, so
 * that scrolling down to the section — or tapping "3D Location Map", which
 * scrolls straight to it — finds the code already there and only has to build
 * the map itself.
 */
function warmMap3DChunk(): () => void {
  if (typeof window === 'undefined') return () => {};

  let cancelled = false;
  const fetchChunk = () => {
    if (!cancelled) void loadMap3D().catch(() => {});
  };

  const idle = (window as Window & {
    requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
  }).requestIdleCallback;
  const handle = idle ? idle(fetchChunk, { timeout: 4000 }) : window.setTimeout(fetchChunk, 2000);

  return () => {
    cancelled = true;
    if (idle) {
      (window as Window & { cancelIdleCallback?: (h: number) => void }).cancelIdleCallback?.(handle);
    } else {
      window.clearTimeout(handle);
    }
  };
}

interface PropertyMapLinkProps {
  property: Property;
  onNavigateToMap: () => void;
  /** Render edge-to-edge (no rounded card chrome) for full-screen-width placement. */
  fullBleed?: boolean;
}

/**
 * Placeholder for the map: the same box it will occupy, so nothing shifts when
 * it arrives.
 *
 * `heightClassName` is the map's own, not a second copy of it — the reservation
 * has to be exactly the size of the thing being reserved, or the page reflows
 * under the reader (and under a restored scroll offset) the moment it mounts.
 *
 * `busy` separates the two states this stands in for. Once the map is actually
 * loading, the spinner says so. Before that it is a section the reader has not
 * reached yet, and an animation running off-screen is only work.
 */
const MapPlaceholder: React.FC<{ heightClassName: string; busy?: boolean }> = ({
  heightClassName,
  busy = false,
}) => (
  <div
    className={`bg-gradient-to-br from-neutral-100 to-neutral-200 flex items-center justify-center ${heightClassName} ${busy ? 'animate-pulse' : ''}`}
  >
    {busy && (
      <div className="text-center">
        <div className="relative w-12 h-12 mx-auto mb-3">
          <div className="absolute inset-0 border-4 border-neutral-300 rounded-full" />
          <div
            className="absolute inset-0 border-4 border-primary rounded-full border-t-transparent animate-spin"
            style={{ animationDuration: '1s' }}
          />
        </div>
        <p className="text-neutral-500 text-sm font-medium">Loading map...</p>
      </div>
    )}
  </div>
);

/**
 * Mount the 3D map only once it is close to the viewport.
 *
 * The map is a live WebGL surface with its own tiles, its own animation loop
 * and a teardown to match — and it sits well below the fold, under the gallery
 * and the description. Mounting it with the page meant every listing opened
 * paid for a map the visitor may never scroll to, and every back press out of
 * the listing had to tear that map down inside the same commit that renders the
 * page being returned to. Both of those land on the frames where the navigation
 * is animating.
 *
 * `rootMargin` starts the work well before the section is reached, so scrolling
 * down to it still finds the map already there.
 */
function useNearViewport<T extends HTMLElement>(ref: React.RefObject<T | null>): boolean {
  const [near, setNear] = useState(false);

  useEffect(() => {
    if (near) return;
    const node = ref.current;
    if (!node) return;

    // No IntersectionObserver (or a test environment without one): behave
    // exactly as the page did before and mount straight away.
    if (typeof IntersectionObserver === 'undefined') {
      setNear(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setNear(true);
          observer.disconnect();
        }
      },
      { rootMargin: '600px 0px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [ref, near]);

  return near;
}

/**
 * PropertyMapLink Component
 *
 * Immersive map experience with cinematic flythrough animation.
 * Features:
 * - Dramatic fly-to animation from country to property level
 * - Progress indicator during animation
 * - Play/skip/replay controls
 * - Navigate to full search map option
 *
 * Usage:
 * ```tsx
 * <PropertyMapLink
 *   property={property}
 *   onNavigateToMap={() => {
 *     dispatch({ type: 'UPDATE_SEARCH_PAGE_STATE', payload: { focusMapOnProperty: {...} } });
 *     dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'search' });
 *   }}
 * />
 * ```
 */
export const PropertyMapLink: React.FC<PropertyMapLinkProps> = ({
  property,
  onNavigateToMap,
  fullBleed = false,
}) => {
  const { t } = useTranslation(['property']);

  // Validate coordinates exist
  const hasValidCoordinates =
    property.lat != null &&
    property.lng != null &&
    !isNaN(property.lat) &&
    !isNaN(property.lng);

  // Which full map the "Full Map" button leads to (villas / rentals / buy).
  // Resolved here and passed down so the button's label names the same map the
  // page's `onNavigateToMap` handler actually opens.
  const { propertyType, listingType } = property;
  const mapDestination = useMemo(
    () => resolveMapDestination({ propertyType, listingType }),
    [propertyType, listingType],
  );

  // Responsive map heights — taller in full-bleed (full-screen) placement.
  const heightClassName = fullBleed
    ? 'h-[460px] sm:h-[600px] lg:h-[78vh]'
    : 'h-[420px] sm:h-[520px] lg:h-[650px]';

  const containerRef = useRef<HTMLDivElement>(null);
  const isNearViewport = useNearViewport(containerRef);

  useEffect(() => warmMap3DChunk(), []);

  return (
    <div
      ref={containerRef}
      className={
        fullBleed
          ? 'bg-white rounded-2xl shadow-lg border border-neutral-200 overflow-hidden'
          : 'bg-white rounded-xl shadow-lg border border-neutral-200 overflow-hidden'
      }
    >
      {/* Header */}
      <div className="p-4 border-b border-neutral-100 bg-gradient-to-r from-blue-50 to-purple-50">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
            <svg
              className="w-5 h-5 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-bold text-neutral-800">
              {t('cinematicMap.title', 'Property Location')}
            </h3>
            <p className="text-sm text-neutral-600">
              {t('cinematicMap.description', 'Experience a cinematic journey to this property')}
            </p>
          </div>
        </div>
      </div>

      {/* 3D Map with Buildings */}
      {!hasValidCoordinates ? null : !isNearViewport ? (
        <MapPlaceholder heightClassName={heightClassName} />
      ) : (
        <Suspense fallback={<MapPlaceholder heightClassName={heightClassName} busy />}>
          <Map3DBuildings
            lat={property.lat}
            lng={property.lng}
            address={property.address || `${property.city}, ${property.country}`}
            title={property.title}
            onNavigateToMap={onNavigateToMap}
            heightClassName={heightClassName}
            pitch={60}
            bearing={-20}
            zoom={16}
            enableShadowTimelapse={true}
            floorNumber={property.floorNumber}
            totalFloors={property.totalFloors}
            propertyType={property.propertyType}
            mapDestination={mapDestination}
            virtualTour360Url={property.virtualTour360Url}
            orientation={property.orientation}
          />
        </Suspense>
      )}
      {!hasValidCoordinates && (
        <div className={`${heightClassName} bg-neutral-100 flex items-center justify-center`}>
          <div className="text-center text-neutral-500">
            <svg
              className="w-12 h-12 mx-auto mb-2 opacity-50"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            <p className="font-medium">
              {t('cinematicMap.errors.noLocation', 'Location data unavailable')}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
