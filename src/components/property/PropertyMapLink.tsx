// PropertyMapLink Component
// 3D map experience with extruded buildings and shadow timelapse

import React, { Suspense, lazy } from 'react';
import { useTranslation } from 'react-i18next';
import { Property } from '../../../types';

// Lazy load the 3D map component for better initial page load
const Map3DBuildings = lazy(
  () => import('@/features/map/components/Map3DBuildings')
);

interface PropertyMapLinkProps {
  property: Property;
  onNavigateToMap: () => void;
  /** Render edge-to-edge (no rounded card chrome) for full-screen-width placement. */
  fullBleed?: boolean;
}

/**
 * Map loading fallback component
 */
const MapLoadingFallback: React.FC = () => (
  <div className="bg-gradient-to-br from-neutral-100 to-neutral-200 rounded-xl animate-pulse flex items-center justify-center h-[420px] sm:h-[520px] lg:h-[650px]">
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
  </div>
);

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

  // Responsive map heights — taller in full-bleed (full-screen) placement.
  const heightClassName = fullBleed
    ? 'h-[460px] sm:h-[600px] lg:h-[78vh]'
    : 'h-[420px] sm:h-[520px] lg:h-[650px]';

  return (
    <div
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
      {hasValidCoordinates ? (
        <Suspense fallback={<MapLoadingFallback />}>
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
            virtualTour360Url={property.virtualTour360Url}
            orientation={property.orientation}
          />
        </Suspense>
      ) : (
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
