import { useEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import type { PlacePrecision } from '../../../utils/businessPlace';
import { APPROXIMATE_RADIUS_M } from '../../../utils/businessPlace';
import type { LatLng } from '../../../utils/travel';
import { addBusinessLayers, BUSINESS_MAP_STYLE, drawBusinessShape, drawTrip, setSatellite } from './businessMapLayers';
import { createBusinessMarker } from './businessMarker';

export type MapLayer = 'map' | 'satellite';

export interface BusinessMapOptions {
  business: LatLng;
  precision: PlacePrecision;
  name: string;
  logoUrl?: string;
  layer: MapLayer;
  visitor: LatLng | null;
  path: Array<[number, number]> | null;
  /** Translated "use two fingers / ctrl + scroll" hints. */
  gestureText: { desktop: string; mac: string; mobile: string };
  reduceMotion: boolean;
}

const ZOOM: Record<PlacePrecision, number> = { pin: 17.6, address: 17, city: 13 };
/** The dot at the foot of the stem sits on the point: 44px tile + 46px stem + half the 10px dot, less its 3px overlap. */
const MARKER_OFFSET: [number, number] = [0, -92];

/**
 * A MapLibre map of the business, tilted to show 3D buildings, with its own
 * building raised in blue, its badge, and — once asked for — the visitor and
 * route. Created once per place; the layer, visitor and route update in place.
 */
export function useBusinessMap(container: React.RefObject<HTMLDivElement>, o: BusinessMapOptions) {
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [ready, setReady] = useState(false);
  const [foundBuilding, setFoundBuilding] = useState<boolean | null>(null);
  const latest = useRef(o);
  latest.current = o;
  const { lat, lng } = o.business;

  useEffect(() => {
    if (!container.current) return undefined;
    const { precision, name, logoUrl, gestureText } = latest.current;
    const map = new maplibregl.Map({
      container: container.current,
      style: BUSINESS_MAP_STYLE,
      center: [lng, lat],
      zoom: ZOOM[precision],
      pitch: precision === 'city' ? 0 : 40,
      bearing: precision === 'city' ? 0 : -18,
      cooperativeGestures: true,
      attributionControl: { compact: true },
      locale: {
        'CooperativeGesturesHandler.WindowsHelpText': gestureText.desktop,
        'CooperativeGesturesHandler.MacHelpText': gestureText.mac,
        'CooperativeGesturesHandler.MobileHelpText': gestureText.mobile,
      },
    });
    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-left');
    const marker = new maplibregl.Marker({ element: createBusinessMarker(name, logoUrl), anchor: 'top', offset: MARKER_OFFSET }).setLngLat([lng, lat]).addTo(map);

    map.on('load', () => {
      addBusinessLayers(map);
      setReady(true);
      // Building footprints are only queryable once their tiles have drawn.
      map.once('idle', () => {
        setFoundBuilding(drawBusinessShape(map, [lng, lat], APPROXIMATE_RADIUS_M[precision], precision !== 'city'));
      });
    });

    return () => {
      marker.remove();
      map.remove();
      mapRef.current = null;
      setReady(false);
      setFoundBuilding(null);
    };
  }, [container, lat, lng]);

  // Map ⇄ satellite.
  useEffect(() => {
    if (ready && mapRef.current) setSatellite(mapRef.current, o.layer === 'satellite');
  }, [ready, o.layer]);

  // Visitor and route: draw, then frame the whole trip.
  const { visitor, path, reduceMotion } = o;
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    drawTrip(map, visitor, path);
    const points: Array<[number, number]> = path && path.length > 1 ? path.map(([a, b]) => [b, a]) : visitor ? [[visitor.lng, visitor.lat], [lng, lat]] : [];
    if (points.length > 1) {
      const bounds = points.reduce((b, p) => b.extend(p), new maplibregl.LngLatBounds(points[0], points[0]));
      map.fitBounds(bounds, { padding: 56, maxZoom: 16, pitch: 30, duration: reduceMotion ? 0 : 900 });
    }
  }, [ready, visitor, path, lat, lng, reduceMotion]);

  return { ready, foundBuilding };
}
