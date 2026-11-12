import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { buildPoiElement } from './poiMarkerElement';
import { usePoiTiles } from './usePoiTiles';
import PoiStatusPill from './PoiStatusPill';
import type { ViewBounds } from './poiTiles';
import type { PoiStatus } from './poiTypes';

const viewOf = (map: L.Map): { bounds: ViewBounds; zoom: number } => {
  const b = map.getBounds();
  return { bounds: { north: b.getNorth(), south: b.getSouth(), east: b.getEast(), west: b.getWest() }, zoom: map.getZoom() };
};

/** Shows the status pill over the map: it sits in the map's parent, outside Leaflet's own panes. */
const PoiStatusHost: React.FC<{ status: PoiStatus }> = ({ status }) => {
  const map = useMap();
  const host = map.getContainer().parentElement;
  return host ? createPortal(<PoiStatusPill status={status} />, host) : null;
};

/** Places of interest on the Leaflet fallback map, from the same backend tiles as the Google map. */
const PoiLeafletLayer: React.FC<{ enabled: boolean }> = ({ enabled }) => {
  const map = useMap();
  const [view, setView] = useState(() => viewOf(map));
  useMapEvents({ moveend: () => setView(viewOf(map)) });
  const { pois, status } = usePoiTiles(enabled, view.bounds, view.zoom);

  useEffect(() => {
    const layer = L.layerGroup().addTo(map);
    pois.forEach((poi) => {
      L.marker([poi.lat, poi.lng], {
        icon: L.divIcon({ className: '', html: buildPoiElement(poi), iconSize: [44, 44], iconAnchor: [22, 22] }),
        zIndexOffset: -1000,
      }).addTo(layer);
    });
    return () => { layer.remove(); };
  }, [map, pois]);

  return enabled ? <PoiStatusHost status={status} /> : null;
};

export default PoiLeafletLayer;
