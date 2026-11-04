import React, { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useReducedMotion } from 'framer-motion';
import 'maplibre-gl/dist/maplibre-gl.css';
import { optimizeImageUrl } from '@/config/mediaConfig';
import type { PlacePrecision } from '../../utils/businessPlace';
import type { LatLng } from '../../utils/travel';
import { useBusinessMap, type MapLayer } from './map/useBusinessMap';

export type { MapLayer };

interface BusinessLocationMapProps {
  business: LatLng;
  precision: PlacePrecision;
  name: string;
  logoUrl?: string;
  layer: MapLayer;
  visitor?: LatLng | null;
  /** [lat, lng] pairs of the route, when there is one. */
  path?: Array<[number, number]> | null;
}

/**
 * The business on a MapLibre map: 3D buildings with theirs raised in blue,
 * a logo badge on the spot, satellite on request, and the visitor's route.
 * Two fingers (or Ctrl/⌘ + scroll) move it, so the page still scrolls.
 */
const BusinessLocationMap: React.FC<BusinessLocationMapProps> = ({ business, precision, name, logoUrl, layer, visitor = null, path = null }) => {
  const { t } = useTranslation('businessDirectory');
  const reduceMotion = !!useReducedMotion();
  const container = useRef<HTMLDivElement>(null);
  const { ready, foundBuilding } = useBusinessMap(container, {
    business,
    precision,
    name,
    logoUrl: logoUrl ? optimizeImageUrl(logoUrl, { width: 112, height: 112 }) || logoUrl : undefined,
    layer,
    visitor,
    path,
    reduceMotion,
    gestureText: {
      desktop: t('detail.map.gestureDesktop', 'Use Ctrl + scroll to zoom the map'),
      mac: t('detail.map.gestureMac', 'Use ⌘ + scroll to zoom the map'),
      mobile: t('detail.map.gestureMobile', 'Use two fingers to move the map'),
    },
  });

  return (
    <div className="relative h-full w-full">
      <div
        ref={container}
        className="h-full w-full"
        data-shape={foundBuilding === null ? 'pending' : foundBuilding ? 'building' : 'area'}
        role="region"
        aria-label={t('detail.map.label', { name, defaultValue: 'Map showing {{name}}' })}
      />
      {!ready && <div className="absolute inset-0 animate-pulse bg-neutral-200/70" aria-hidden="true" />}
    </div>
  );
};

export default BusinessLocationMap;
