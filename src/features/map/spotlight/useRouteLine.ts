import { useEffect } from 'react';
import { useReducedMotion } from 'motion/react';
import type { LatLng } from './spotlightUtils';

/** Room kept clear of the sheet when fitting the route on screen. */
const FIT_PADDING = { top: 90, right: 40, bottom: 320, left: 40 };
const DRAW_MS = 700;

/**
 * Draw `path` on the map — a white casing under a blue line, drawn in from the
 * start over DRAW_MS (at once under reduced motion) — and frame it. Removed
 * when the path changes or the spotlight closes.
 */
export function useRouteLine(map: google.maps.Map | null, path: LatLng[] | null) {
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!map || !path || path.length < 2 || typeof google === 'undefined') return undefined;
    const casing = new google.maps.Polyline({ map, path: [], strokeColor: '#ffffff', strokeOpacity: 1, strokeWeight: 9, zIndex: 900 });
    const line = new google.maps.Polyline({
      map, path: [], strokeColor: '#0252CD', strokeOpacity: 1, strokeWeight: 5, zIndex: 901,
      icons: [{ icon: { path: google.maps.SymbolPath.CIRCLE, scale: 5, fillColor: '#0252CD', fillOpacity: 1, strokeColor: '#fff', strokeWeight: 2 }, offset: '0%' }],
    });

    const bounds = new google.maps.LatLngBounds();
    path.forEach((p) => bounds.extend(p));
    map.fitBounds(bounds, FIT_PADDING);

    let frame = 0;
    const start = performance.now();
    const draw = (now: number) => {
      const t = reduceMotion ? 1 : Math.min(1, (now - start) / DRAW_MS);
      const eased = 1 - (1 - t) ** 3;
      const shown = path.slice(0, Math.max(2, Math.ceil(path.length * eased)));
      casing.setPath(shown);
      line.setPath(shown);
      if (t < 1) frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(frame);
      casing.setMap(null);
      line.setMap(null);
    };
  }, [map, path, reduceMotion]);
}
