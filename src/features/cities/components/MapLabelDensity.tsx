/**
 * Hides the labels of shapes too small to carry one at the current zoom.
 *
 * Drawing every neighbourhood in a city means drawing every name too, and at
 * city zoom those names overlap into an unreadable pile — a small polygon's
 * label is wider than the polygon itself. So each label is shown only while
 * its shape is big enough on screen to hold it, and appears as the reader
 * zooms in. Nothing is removed from the map: the shape is still drawn, still
 * coloured and still clickable, whether or not its name is currently showing.
 *
 * Implemented by toggling a class on the tooltip element rather than by
 * binding and unbinding tooltips, which would churn DOM on every zoom frame.
 */

import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import type { Map as LeafletMap, Layer, LatLngBounds, Point } from 'leaflet';
import { shouldShowLabel } from '../utils/boundaryLayers';

/** Class that hides a permanent tooltip; defined in the map's stylesheet. */
export const HIDDEN_LABEL_CLASS = 'mlabel-hidden';

/**
 * The three things this needs off a layer. Declared structurally rather than
 * as an extension of `Layer`: only some layers are groups, and only some have
 * bounds, so Leaflet's own type says neither.
 */
interface BoundedLayer {
  getBounds?: () => LatLngBounds;
  getTooltip?: () => { getElement?: () => HTMLElement | undefined } | undefined;
  eachLayer?: (fn: (layer: Layer) => void) => void;
}

/** Every leaf layer under `root`, since a GeoJSON layer is a group. */
function eachLeaf(root: Layer, visit: (leaf: BoundedLayer) => void): void {
  const group = root as unknown as BoundedLayer;
  if (typeof group.eachLayer === 'function') {
    group.eachLayer(child => eachLeaf(child, visit));
    return;
  }
  visit(group);
}

function applyLabelVisibility(map: LeafletMap, root: Layer): void {
  eachLeaf(root, leaf => {
    const tooltip = leaf.getTooltip?.();
    const element = tooltip?.getElement?.();
    if (!element || typeof leaf.getBounds !== 'function') return;

    const bounds = leaf.getBounds();
    // Projected at the current zoom: a shape's pixel size is what decides
    // whether a label fits, not its size in degrees.
    const nw: Point = map.latLngToLayerPoint(bounds.getNorthWest());
    const se: Point = map.latLngToLayerPoint(bounds.getSouthEast());
    const visible = shouldShowLabel(Math.abs(se.x - nw.x), Math.abs(se.y - nw.y));

    element.classList.toggle(HIDDEN_LABEL_CLASS, !visible);
  });
}

interface Props {
  /**
   * The layers to police, newest first — usually the district and
   * neighbourhood GeoJSON layers. Refs are read on every zoom, so a layer that
   * has not mounted yet is simply skipped.
   */
  layers: Array<React.RefObject<Layer | null>>;
  /** Bumped by the caller when the layers are rebuilt, to re-run the pass. */
  revision?: unknown;
}

const MapLabelDensity: React.FC<Props> = ({ layers, revision }) => {
  const map = useMap() as LeafletMap;

  useEffect(() => {
    const run = () => {
      for (const ref of layers) {
        if (ref.current) applyLabelVisibility(map, ref.current);
      }
    };

    // Once now, for the layers already on the map, and again after Leaflet has
    // attached tooltip elements for any that mounted in this same frame.
    run();
    const settle = window.setTimeout(run, 120);

    map.on('zoomend', run);
    // A pan changes nothing about a shape's size, but Leaflet recreates
    // tooltip elements for layers entering the view, so they need the pass too.
    map.on('moveend', run);

    return () => {
      window.clearTimeout(settle);
      map.off('zoomend', run);
      map.off('moveend', run);
    };
    // `layers` is a stable array of refs from the parent; `revision` is what
    // signals that their contents changed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, revision]);

  return null;
};

export default MapLabelDensity;
