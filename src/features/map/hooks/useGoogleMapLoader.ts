/**
 * useGoogleMapLoader - Handles Google Maps API loading
 */
import { useJsApiLoader } from '@react-google-maps/api';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY || '';
const GOOGLE_MAPS_LIBRARIES: ('places' | 'drawing' | 'geometry' | 'marker')[] = ['places', 'geometry', 'marker'];

export const useGoogleMapLoader = () => {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: GOOGLE_MAPS_LIBRARIES,
  });

  // Log errors for debugging
  if (loadError) {
    // Google Maps load error available via loadError
  }

  return { isLoaded, loadError };
};

// Only pass mapId if actually configured - an invalid mapId prevents AdvancedMarkerElement from working
export const GOOGLE_MAPS_MAP_ID = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID || undefined;
