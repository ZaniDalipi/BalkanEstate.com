/**
 * The land around a plot, for the 3D view: a square box centred on the plot,
 * a few times its size, so the hills, valleys and roads around it are in the
 * picture. Pure.
 */
import type { GridBounds } from '../types';
import { cellSpacingM, METERS_PER_DEG_LAT, METERS_PER_DEG_LNG } from './gridGeometry';

/** The surroundings reach this many plot widths across… */
const PLOT_WIDTHS = 4;
/** …but at least this far (a small plot still shows its neighbourhood)… */
const MIN_SIDE_M = 1200;
/** …and at most this far (the elevation service's limit is 8 km a side). */
const MAX_SIDE_M = 7000;
/** A plot larger than that still gets a margin round it. */
const MIN_MARGIN = 1.15;

type Box = GridBounds & { rows: number; cols: number };

/** Ground size of a grid's box, metres. */
export function boxSizeM(grid: Box): { widthM: number; depthM: number } {
  const { dx, dy } = cellSpacingM(grid);
  return { widthM: dx * grid.cols, depthM: dy * grid.rows };
}

/** The square box of surroundings for a plot's grid, rounded so the same plot is cached. */
export function surroundingsBounds(plot: Box): GridBounds {
  const { widthM, depthM } = boxSizeM(plot);
  const plotSide = Math.max(widthM, depthM);
  const side = Math.min(7900, Math.max(plotSide * MIN_MARGIN, Math.min(MAX_SIDE_M, Math.max(MIN_SIDE_M, plotSide * PLOT_WIDTHS))));
  const midLat = (plot.north + plot.south) / 2;
  const midLng = (plot.west + plot.east) / 2;
  const halfLat = side / 2 / METERS_PER_DEG_LAT;
  const halfLng = side / 2 / (METERS_PER_DEG_LNG * Math.cos((midLat * Math.PI) / 180));
  const round = (n: number) => Math.round(n * 1e5) / 1e5;
  return { south: round(midLat - halfLat), west: round(midLng - halfLng), north: round(midLat + halfLat), east: round(midLng + halfLng) };
}

