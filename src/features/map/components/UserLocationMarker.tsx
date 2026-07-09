/**
 * UserLocationMarker - Animated "you are here" dot for the Leaflet fallback map.
 * Mirrors the Google Maps AdvancedMarkerElement rendered in useGoogleMap.ts so
 * both map engines show the same pulsing indicator.
 */

import React, { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Marker } from 'react-leaflet';
import L from 'leaflet';
import { validateCoordinates } from '@/shared/utils/validation';
import { injectUserLocationMarkerStyles, userLocationMarkerHtml } from '../utils/userLocationMarker';

interface UserLocationMarkerProps {
  location: [number, number] | null;
}

const UserLocationMarker: React.FC<UserLocationMarkerProps> = ({ location }) => {
  const { t } = useTranslation(['search']);

  useEffect(() => {
    injectUserLocationMarkerStyles();
  }, []);

  const icon = useMemo(() => {
    const label = t('search:map.myLocation', 'My Location');
    return L.divIcon({
      html: userLocationMarkerHtml(label),
      className: 'user-location-marker-icon',
      iconSize: [22, 22],
      iconAnchor: [11, 11],
    });
  }, [t]);

  // Validate at the boundary — coordinates originate from navigator.geolocation
  if (!location || !validateCoordinates(location[0], location[1]).isValid) return null;

  return <Marker position={location} icon={icon} zIndexOffset={500} />;
};

export default UserLocationMarker;
