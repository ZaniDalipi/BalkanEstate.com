import { useEffect, useRef } from 'react';
import type { TerrainPoint } from '../types';

/**
 * While `enabled`, every tap on the map hands its spot to `onPoint`. The map
 * shows a crosshair, and double-tap zoom is paused so a quick second tap adds
 * a corner instead of zooming.
 */
export function useMapPointDrawing(
  map: google.maps.Map | null,
  enabled: boolean,
  onPoint: (point: TerrainPoint) => void,
): void {
  const onPointRef = useRef(onPoint);
  onPointRef.current = onPoint;

  useEffect(() => {
    if (!map || !enabled) return undefined;
    const listener = map.addListener('click', (e: google.maps.MapMouseEvent) => {
      if (e.latLng) onPointRef.current({ lat: e.latLng.lat(), lng: e.latLng.lng() });
    });
    const hadDoubleClickZoomOff = map.get('disableDoubleClickZoom') === true;
    map.setOptions({ draggableCursor: 'crosshair', disableDoubleClickZoom: true });
    return () => {
      google.maps.event.removeListener(listener);
      map.setOptions({ draggableCursor: null, disableDoubleClickZoom: hadDoubleClickZoomOff });
    };
  }, [map, enabled]);
}
