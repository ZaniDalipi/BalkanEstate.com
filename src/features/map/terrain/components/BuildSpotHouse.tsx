/**
 * The house at the best place to build, drawn on the map as seen from above:
 * a terracotta roof with its ridge, at real size (about 12 × 9 m), its long
 * side along the slope. Render inside <GoogleMap>.
 */
import React, { useMemo } from 'react';
import { PolygonF, PolylineF } from '@react-google-maps/api';
import type { BuildSpot, TerrainPoint } from '../types';
import { HOUSE, houseFootprint } from '../utils/house';

const mid = (a: TerrainPoint, b: TerrainPoint): TerrainPoint => ({ lat: (a.lat + b.lat) / 2, lng: (a.lng + b.lng) / 2 });

const ROOF = {
  fillColor: HOUSE.roofColor,
  fillOpacity: 0.95,
  strokeColor: '#ffffff',
  strokeOpacity: 1,
  strokeWeight: 2,
  clickable: false,
  zIndex: 20,
} as const;
const RIDGE = { strokeColor: '#ffffff', strokeOpacity: 0.85, strokeWeight: 2, clickable: false, zIndex: 21 } as const;

const BuildSpotHouse: React.FC<{ spot: BuildSpot }> = ({ spot }) => {
  const footprint = useMemo(() => houseFootprint(spot), [spot]);
  // Corners run along one long side then back along the other: the ridge joins the middles of the short sides.
  const ridge = useMemo(() => [mid(footprint[0], footprint[3]), mid(footprint[1], footprint[2])], [footprint]);
  return (
    <>
      <PolygonF paths={footprint} options={ROOF} />
      <PolylineF path={ridge} options={RIDGE} />
    </>
  );
};

export default BuildSpotHouse;
