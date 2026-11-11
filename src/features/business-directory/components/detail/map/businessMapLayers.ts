import * as maplibregl from 'maplibre-gl';
import { circleRing, inflatePolygon, pickFootprint, type GeoGeometry, type Position } from '../../../utils/geoShapes';

/** The same open vector style the property 3D map uses: OSM data with 3D buildings. */
export const BUSINESS_MAP_STYLE = 'https://tiles.openfreemap.org/styles/liberty';

const SATELLITE_TILES = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
const BLUE = '#0A84FF';
const EMPTY: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] };

/** The base style's own building layers (vector `building` source-layer or named so). */
export const baseBuildingLayerIds = (map: maplibregl.Map): string[] =>
  (map.getStyle().layers ?? [])
    .filter((l) => (l.type === 'fill-extrusion' || l.type === 'fill') && !l.id.startsWith('biz-'))
    .filter((l) => ('source-layer' in l && l['source-layer'] === 'building') || /building/i.test(l.id))
    .map((l) => l.id);

/** Satellite imagery (hidden until asked for) and the business, route and visitor layers. */
export function addBusinessLayers(map: maplibregl.Map): void {
  const firstSymbol = (map.getStyle().layers ?? []).find((l) => l.type === 'symbol')?.id;
  map.addSource('biz-satellite', { type: 'raster', tiles: [SATELLITE_TILES], tileSize: 256, maxzoom: 19, attribution: 'Imagery © Esri, Maxar, Earthstar Geographics' });
  map.addLayer({ id: 'biz-satellite', type: 'raster', source: 'biz-satellite', layout: { visibility: 'none' } }, firstSymbol);

  for (const id of ['biz-area', 'biz-building', 'biz-route', 'biz-visitor']) map.addSource(id, { type: 'geojson', data: EMPTY });
  map.addLayer({ id: 'biz-area-fill', type: 'fill', source: 'biz-area', paint: { 'fill-color': BLUE, 'fill-opacity': 0.14 } });
  map.addLayer({ id: 'biz-area-line', type: 'line', source: 'biz-area', paint: { 'line-color': BLUE, 'line-width': 2, 'line-dasharray': [2, 1.5] } });
  map.addLayer({
    id: 'biz-building',
    type: 'fill-extrusion',
    source: 'biz-building',
    paint: { 'fill-extrusion-color': BLUE, 'fill-extrusion-opacity': 1, 'fill-extrusion-vertical-gradient': true, 'fill-extrusion-height': ['get', 'height'], 'fill-extrusion-base': ['get', 'base'] },
  });
  map.addLayer({ id: 'biz-building-outline', type: 'line', source: 'biz-building', paint: { 'line-color': '#ffffff', 'line-width': 2.5 } });
  map.addLayer({ id: 'biz-route-casing', type: 'line', source: 'biz-route', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#ffffff', 'line-width': 9 } });
  map.addLayer({ id: 'biz-route-line', type: 'line', source: 'biz-route', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': BLUE, 'line-width': 5 } });
  map.addLayer({ id: 'biz-visitor-halo', type: 'circle', source: 'biz-visitor', paint: { 'circle-radius': 18, 'circle-color': BLUE, 'circle-opacity': 0.18 } });
  map.addLayer({ id: 'biz-visitor-dot', type: 'circle', source: 'biz-visitor', paint: { 'circle-radius': 7, 'circle-color': BLUE, 'circle-stroke-color': '#ffffff', 'circle-stroke-width': 3 } });
}

/** Show satellite imagery or the drawn map; base 3D buildings would hide the photo, so they go with it. */
export function setSatellite(map: maplibregl.Map, on: boolean): void {
  map.setLayoutProperty('biz-satellite', 'visibility', on ? 'visible' : 'none');
  for (const id of baseBuildingLayerIds(map)) map.setLayoutProperty(id, 'visibility', on ? 'none' : 'visible');
}

const source = (map: maplibregl.Map, id: string) => map.getSource(id) as maplibregl.GeoJSONSource | undefined;

/**
 * Draw the business: its own building raised in blue when the vector tiles
 * have a footprint under the pin, otherwise a dashed area the size of the
 * uncertainty. Returns whether a building was found.
 */
export function drawBusinessShape(map: maplibregl.Map, at: Position, areaRadiusMeters: number, useBuilding: boolean): boolean {
  const layers = baseBuildingLayerIds(map);
  const point = map.project(at);
  const box: [maplibregl.PointLike, maplibregl.PointLike] = [[point.x - 40, point.y - 40], [point.x + 40, point.y + 40]];
  const features = useBuilding && layers.length ? map.queryRenderedFeatures(box, { layers }) : [];
  const footprint = pickFootprint(features.map((f) => f.geometry as GeoGeometry), at);
  if (footprint) {
    const props = features.find((f) => pickFootprint([f.geometry as GeoGeometry], at))?.properties ?? {};
    const height = Math.max(Number(props.render_height ?? props.height) || 9, 6) + 1;
    const base = Number(props.render_min_height ?? props.min_height) || 0;
    source(map, 'biz-building')?.setData({ type: 'Feature', properties: { height, base }, geometry: { type: 'Polygon', coordinates: inflatePolygon(footprint, 0.5) } });
    source(map, 'biz-area')?.setData(EMPTY);
    // Neighbours turn see-through, so a taller building in front can't hide theirs.
    for (const id of layers) {
      if (map.getLayer(id)?.type === 'fill-extrusion') map.setPaintProperty(id, 'fill-extrusion-opacity', 0.45);
    }
    return true;
  }
  source(map, 'biz-building')?.setData(EMPTY);
  source(map, 'biz-area')?.setData({ type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [circleRing(at, areaRadiusMeters)] } });
  return false;
}

/** The visitor's dot and the route line ([lat, lng] pairs in, GeoJSON out). */
export function drawTrip(map: maplibregl.Map, visitor: { lat: number; lng: number } | null, path: Array<[number, number]> | null): void {
  source(map, 'biz-visitor')?.setData(visitor ? { type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [visitor.lng, visitor.lat] } } : EMPTY);
  source(map, 'biz-route')?.setData(
    path && path.length > 1 ? { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: path.map(([lat, lng]) => [lng, lat]) } } : EMPTY,
  );
}
