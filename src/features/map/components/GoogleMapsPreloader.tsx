/**
 * GoogleMapsPreloader - Pre-warms connections to Google Maps servers
 *
 * Instead of injecting a <script> tag (which conflicts with useJsApiLoader
 * from @react-google-maps/api), this preloader just adds <link rel="preconnect">
 * hints so DNS/TCP/TLS are already done when useJsApiLoader loads the script.
 * This avoids dual-loading conflicts that could cause the map to not render.
 */
import { useEffect } from 'react';

let preconnected = false;

export const preloadGoogleMaps = () => {
  if (preconnected || typeof window === 'undefined') return;
  if (window.google?.maps) return; // Already loaded

  preconnected = true;

  // Pre-warm connections to Google Maps servers so the actual script loads faster
  const origins = [
    'https://maps.googleapis.com',
    'https://maps.gstatic.com',
  ];

  origins.forEach(origin => {
    if (!document.querySelector(`link[rel="preconnect"][href="${origin}"]`)) {
      const link = document.createElement('link');
      link.rel = 'preconnect';
      link.href = origin;
      link.crossOrigin = 'anonymous';
      document.head.appendChild(link);
    }
  });
};

/**
 * Hook to check if Google Maps is loaded
 */
export const useGoogleMapsReady = () => {
  return typeof window !== 'undefined' && !!window.google?.maps;
};

/**
 * Component that preloads Google Maps when mounted
 * Adds preconnect hints for faster loading
 */
const GoogleMapsPreloader: React.FC = () => {
  useEffect(() => {
    preloadGoogleMaps();
  }, []);

  return null;
};

export default GoogleMapsPreloader;
