/**
 * Turning a point on the map's screen into a latitude/longitude.
 *
 * Google Maps draws in Web Mercator: longitude is spread evenly across the
 * screen, latitude is not (it stretches towards the poles). Interpolating
 * latitude linearly between the top and bottom edges is close enough when
 * zoomed in, but zoomed out over a whole region it lands far from the cursor.
 * So we go through Google's world coordinates (a 256×256 square at zoom 0).
 */
import { projectToWorld, unprojectFromWorld, type LatLngLiteral } from './clusterCamera';

export interface MapView {
  center: LatLngLiteral;
  zoom: number;
  width: number;
  height: number;
}

const wrapLng = (lng: number) => ((((lng + 180) % 360) + 360) % 360) - 180;

/** The latitude/longitude under pixel (x, y) of a map view with no tilt or rotation. */
export const pixelToLatLng = (view: MapView, x: number, y: number): LatLngLiteral => {
  const scale = Math.pow(2, view.zoom);
  const c = projectToWorld(view.center);
  const p = unprojectFromWorld({
    x: c.x + (x - view.width / 2) / scale,
    y: c.y + (y - view.height / 2) / scale,
  });
  return { lat: p.lat, lng: wrapLng(p.lng) };
};
