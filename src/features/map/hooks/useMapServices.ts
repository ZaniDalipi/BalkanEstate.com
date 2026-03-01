/**
 * useMapServices - Checks which map proxy services (OWM, FIRMS) are available
 * on the backend so the frontend can choose the right tile source without
 * exposing API keys.
 */

import { useState, useEffect } from 'react';
import { API_URL } from '@/shared/api/config';

export interface MapServices {
  owm: boolean;
  firms: boolean;
}

const DEFAULT: MapServices = { owm: false, firms: false };

let cached: MapServices | null = null;
let fetchPromise: Promise<MapServices> | null = null;

function fetchServices(): Promise<MapServices> {
  if (!fetchPromise) {
    fetchPromise = fetch(`${API_URL}/map/available`)
      .then(r => (r.ok ? r.json() : DEFAULT))
      .catch(() => DEFAULT);
    fetchPromise.then(result => {
      cached = result;
    });
  }
  return fetchPromise;
}

export function useMapServices(): MapServices {
  const [services, setServices] = useState<MapServices>(cached || DEFAULT);

  useEffect(() => {
    if (cached) {
      setServices(cached);
      return;
    }
    fetchServices().then(setServices);
  }, []);

  return services;
}

/** Base URL for the map proxy endpoints */
export const MAP_PROXY_BASE = `${API_URL}/map`;

/** Proxy URL template for OWM weather tiles (Leaflet / Google Maps compatible) */
export const weatherTileProxyUrl = (layer: 'wind_new' | 'temp_new') =>
  `${MAP_PROXY_BASE}/weather-tile/${layer}/{z}/{x}/{y}`;

/** Proxy base URL for FIRMS WMS (Leaflet appends WMS params automatically) */
export const FIRMS_WMS_PROXY_BASE = `${MAP_PROXY_BASE}/firms-wms`;

/** Full FIRMS WMS proxy URL for Google Maps (manual bbox construction) */
export const firmsWmsProxyUrl = (bbox: string) =>
  `${MAP_PROXY_BASE}/firms-wms?LAYERS=fires_viirs_24&STYLES=&FORMAT=image%2Fpng&TRANSPARENT=true&SRS=EPSG%3A3857&BBOX=${bbox}&WIDTH=256&HEIGHT=256&VERSION=1.1.1`;
