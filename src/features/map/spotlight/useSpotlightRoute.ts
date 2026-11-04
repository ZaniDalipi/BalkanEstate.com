import { useMemo, useState } from 'react';
import { useHomePlace } from './useHomePlace';
import { useRoute } from './useRoute';
import { useRouteLine } from './useRouteLine';
import { isValidLatLng, straightLineMeters, type LatLng, type TravelMode } from './spotlightUtils';

/**
 * Everything the spotlight knows about getting to the listing: where the
 * visitor starts ("My place", else their live position), the chosen mode, the
 * route, and the line drawn on the map. Kept by the spotlight itself so the
 * line stays on the map while the visitor reads the details or asks the AI.
 */
export function useSpotlightRoute(map: google.maps.Map | null, destination: LatLng, liveLocation: [number, number] | null) {
  const place = useHomePlace();
  const [mode, setMode] = useState<TravelMode>('driving');

  const origin = useMemo<LatLng | null>(() => {
    if (place.home) return { lat: place.home.lat, lng: place.home.lng };
    const live = liveLocation ? { lat: liveLocation[0], lng: liveLocation[1] } : null;
    return isValidLatLng(live) ? live : null;
  }, [place.home, liveLocation]);

  const route = useRoute(origin, destination, mode);
  const result = route.data ?? null;
  useRouteLine(map, result?.ok ? result.path : null);

  const straightMeters = origin ? straightLineMeters(origin, destination) : null;
  return { ...place, origin, mode, setMode, result, isRouting: route.isFetching, straightMeters };
}

export type SpotlightRoute = ReturnType<typeof useSpotlightRoute>;
