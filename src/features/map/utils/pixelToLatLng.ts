/**
 * Turning a point on the map's screen into a latitude/longitude.
 *
 * Google Maps draws in Web Mercator: longitude is spread evenly across the
 * screen, latitude is not (it stretches towards the poles). Interpolating
 * latitude linearly between the top and bottom edges is close enough when
 * zoomed in, but zoomed out over a whole region it lands far from the cursor.
 * So we go through Google's world coordinates (a 256×256 square at zoom 0).
 */

const TILE_SIZE = 256;

export interface LatLngLiteral { lat: number; lng: number }

export interface MapView {
  center: LatLngLiteral;
  zoom: number;
  width: number;
  height: number;
}

/** Latitude/longitude → Google world coordinates (zoom 0, 0…256 on each axis). */
export const latLngToWorld = ({ lat, lng }: LatLngLiteral): { x: number; y: number } => {
  const sin = Math.min(Math.max(Math.sin((lat * Math.PI) / 180), -0.9999), 0.9999);
  return {
    x: TILE_SIZE * (0.5 + lng / 360),
    y: TILE_SIZE * (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)),
  };
};

/** Google world coordinates → latitude/longitude (longitude wrapped into -180…180). */
export const worldToLatLng = ({ x, y }: { x: number; y: number }): LatLngLiteral => {
  const n = Math.PI - (2 * Math.PI * y) / TILE_SIZE;
  const lat = (180 / Math.PI) * Math.atan(Math.sinh(n));
  const rawLng = (x / TILE_SIZE) * 360 - 180;
  const lng = ((((rawLng + 180) % 360) + 360) % 360) - 180;
  return { lat, lng };
};

/** The latitude/longitude under pixel (x, y) of a map view with no tilt or rotation. */
export const pixelToLatLng = (view: MapView, x: number, y: number): LatLngLiteral => {
  const scale = Math.pow(2, view.zoom);
  const c = latLngToWorld(view.center);
  return worldToLatLng({
    x: c.x + (x - view.width / 2) / scale,
    y: c.y + (y - view.height / 2) / scale,
  });
};
