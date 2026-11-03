import React, { Suspense, useEffect } from 'react';
import { lazyWithRetry } from '@/src/app/router/lazyWithRetry';
import { ErrorBoundary } from '@/src/app/components/ErrorBoundary';
import MapBusyOverlay from './MapBusyOverlay';
import type { MapComponentProps } from './useMapComponent';

/**
 * The search map, loaded only when a map is first wanted.
 *
 * The map code (Leaflet, the Google Maps bindings, the marker and cluster
 * machinery) is the heaviest part of the search pages. Imported statically it
 * downloaded and parsed before the list could show; on a phone that opens on
 * the list it was paid for nothing. Here it is its own chunk, warmed at idle
 * (`useWarmMap`) so the first tap on Map still finds it ready, and a failed
 * download stays inside the map area instead of taking the page down.
 */
const importMap = () => import('./MapComponent');
const MapComponent = lazyWithRetry(importMap);

let warmed = false;
/** Start downloading the map code. Safe to call any number of times. */
export function preloadMap(): void {
  if (warmed) return;
  warmed = true;
  importMap().catch(() => { warmed = false; });
}

/** Warm the map code once the browser is idle, so it never competes with first paint. */
export function useWarmMap(enabled = true): void {
  useEffect(() => {
    if (!enabled) return;
    const idle = (window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      cancelIdleCallback?: (h: number) => void;
    });
    if (idle.requestIdleCallback) {
      const handle = idle.requestIdleCallback(preloadMap, { timeout: 4000 });
      return () => idle.cancelIdleCallback?.(handle);
    }
    const timer = window.setTimeout(preloadMap, 2000);
    return () => window.clearTimeout(timer);
  }, [enabled]);
}

const LazyMap: React.FC<MapComponentProps> = (props) => (
  <ErrorBoundary level="feature">
    <Suspense fallback={<div className="relative h-full w-full bg-neutral-100"><MapBusyOverlay busy /></div>}>
      <MapComponent {...props} />
    </Suspense>
  </ErrorBoundary>
);

export default LazyMap;
