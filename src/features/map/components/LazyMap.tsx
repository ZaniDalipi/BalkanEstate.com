import React, { Suspense, useCallback, useEffect, useState } from 'react';
import { lazyWithRetry } from '@/src/app/router/lazyWithRetry';
import { ErrorBoundary } from '@/src/app/components/ErrorBoundary';
import MapLoadingVeil from './MapLoadingVeil';
import type { MapComponentProps } from './useMapComponent';

/**
 * The search map, loaded only when a map is first wanted, and shown in one
 * piece.
 *
 * The map code (Leaflet, the Google Maps bindings, the marker and cluster
 * machinery) is the heaviest part of the search pages, so it is its own chunk,
 * warmed at idle (`useWarmMap`) so the first tap on Map still finds it ready.
 * While the code, the tiles and the first pins arrive, `MapLoadingVeil` covers
 * the map in its own backdrop colour and fades away once the map says it is
 * ready, instead of the map assembling itself on screen. A failed download
 * stays inside the map area instead of taking the page down.
 */
const importMap = () => import('./MapComponent');
const MapComponent = lazyWithRetry(importMap);

/** Never leave the veil up: if the map has not said it is ready by then, show it as it is. */
export const MAP_REVEAL_TIMEOUT_MS = 6000;

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
    const idle = window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      cancelIdleCallback?: (h: number) => void;
    };
    if (idle.requestIdleCallback) {
      const handle = idle.requestIdleCallback(preloadMap, { timeout: 4000 });
      return () => idle.cancelIdleCallback?.(handle);
    }
    const timer = window.setTimeout(preloadMap, 2000);
    return () => window.clearTimeout(timer);
  }, [enabled]);
}

type LazyMapProps = MapComponentProps & {
  /** Listings are still arriving: show the loading pill over the map. */
  busy?: boolean;
};

const LazyMap: React.FC<LazyMapProps> = ({ busy = false, ...props }) => {
  const [ready, setReady] = useState(false);
  const markReady = useCallback(() => setReady(true), []);

  useEffect(() => {
    if (ready) return;
    const timer = window.setTimeout(markReady, MAP_REVEAL_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [ready, markReady]);

  return (
    <div className="relative h-full w-full">
      <ErrorBoundary level="feature">
        <Suspense fallback={null}>
          <MapComponent {...props} onReady={markReady} />
        </Suspense>
      </ErrorBoundary>
      <MapLoadingVeil covered={!ready} busy={!ready || busy} />
    </div>
  );
};

export default LazyMap;
