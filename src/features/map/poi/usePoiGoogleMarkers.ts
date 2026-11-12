import { useEffect, useRef } from 'react';
import { buildPoiElement } from './poiMarkerElement';
import type { Poi } from './poiTypes';

/** Keeps one Google marker per place: adds new ones, removes the ones that left the view, clears on unmount. */
export function usePoiGoogleMarkers(map: google.maps.Map | null, pois: Poi[]): void {
  const markers = useRef(new Map<string, google.maps.marker.AdvancedMarkerElement>());

  useEffect(() => {
    if (!map || !google.maps.marker?.AdvancedMarkerElement) return;
    const wanted = new Set(pois.map((p) => p.id));
    for (const [id, marker] of markers.current) {
      if (!wanted.has(id)) { marker.map = null; markers.current.delete(id); }
    }
    for (const poi of pois) {
      if (markers.current.has(poi.id)) continue;
      markers.current.set(poi.id, new google.maps.marker.AdvancedMarkerElement({
        map, position: { lat: poi.lat, lng: poi.lng }, content: buildPoiElement(poi), zIndex: 1,
      }));
    }
  }, [map, pois]);

  useEffect(() => {
    const current = markers.current;
    return () => { current.forEach((m) => { m.map = null; }); current.clear(); };
  }, [map]);
}
