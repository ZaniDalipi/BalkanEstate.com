// Type definitions for leaflet.heat
// Provides heat map visualization for Leaflet maps

import * as L from 'leaflet';

declare module 'leaflet' {
  interface HeatMapOptions {
    /** Minimum opacity the heat will start at (default: 0.05) */
    minOpacity?: number;
    /** Maximum point intensity (default: 1.0) */
    maxZoom?: number;
    /** Maximum point intensity - values above this will be capped */
    max?: number;
    /** Radius of each point of the heatmap (default: 25) */
    radius?: number;
    /** Amount of blur (default: 15) */
    blur?: number;
    /** Color gradient config, e.g. {0.4: 'blue', 0.65: 'lime', 1: 'red'} */
    gradient?: Record<number, string>;
  }

  interface HeatLayer extends L.Layer {
    setOptions(options: HeatMapOptions): this;
    addLatLng(latlng: L.LatLngExpression): this;
    setLatLngs(latlngs: Array<[number, number, number?]>): this;
    redraw(): this;
  }

  function heatLayer(
    latlngs: Array<[number, number, number?]>,
    options?: HeatMapOptions
  ): HeatLayer;
}

declare module 'leaflet.heat' {
  export = L;
}
