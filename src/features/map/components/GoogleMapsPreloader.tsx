/**
 * GoogleMapsPreloader - Preloads Google Maps API as early as possible
 *
 * This component should be rendered near the root of the app to start
 * loading the Google Maps API before the user navigates to the map.
 */
import { useEffect } from 'react';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY || '';

// Global flag to prevent multiple loads
let isPreloading = false;
let isLoaded = false;

export const preloadGoogleMaps = () => {
  if (isPreloading || isLoaded || typeof window === 'undefined') return;
  if (window.google?.maps) {
    isLoaded = true;
    return;
  }

  isPreloading = true;

  // Create script element
  const script = document.createElement('script');
  script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places,geometry,marker&loading=async`;
  script.async = true;
  script.defer = true;
  script.id = 'google-maps-preload';

  script.onload = () => {
    isLoaded = true;
    isPreloading = false;
  };

  script.onerror = () => {
    isPreloading = false;
    // Don't set isLoaded = true - allow retry
  };

  // Only add if not already present
  if (!document.getElementById('google-maps-preload') && !document.querySelector('script[src*="maps.googleapis.com"]')) {
    document.head.appendChild(script);
  }
};

/**
 * Hook to check if Google Maps is loaded
 */
export const useGoogleMapsReady = () => {
  return typeof window !== 'undefined' && !!window.google?.maps;
};

/**
 * Component that preloads Google Maps when mounted
 * Loads immediately without delay for fastest possible map display
 */
const GoogleMapsPreloader: React.FC = () => {
  useEffect(() => {
    // Start preloading immediately - no delay
    preloadGoogleMaps();
  }, []);

  return null; // This component doesn't render anything
};

export default GoogleMapsPreloader;
