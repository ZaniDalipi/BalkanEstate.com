/**
 * The house at the best place to build, drawn on the map as seen from above:
 * a dark pitched roof, one slope in the light and one in shade, at real size
 * (about 12 × 9 m), its long side along the slope. Render inside <GoogleMap>.
 */
import React, { useMemo } from 'react';
import { PolygonF } from '@react-google-maps/api';
import type { BuildSpot } from '../types';
import { houseFootprint, roofHalves } from '../utils/house';

const ROOF_LIT = '#5d5d63';
const ROOF_SHADED = '#3d3d42';
const SLOPE = { fillOpacity: 1, strokeOpacity: 0, clickable: false, zIndex: 20 } as const;
const EDGE = { fillOpacity: 0, strokeColor: '#ffffff', strokeOpacity: 1, strokeWeight: 1.5, clickable: false, zIndex: 21 } as const;

const BuildSpotHouse: React.FC<{ spot: BuildSpot }> = ({ spot }) => {
  const halves = useMemo(() => roofHalves(spot), [spot]);
  const footprint = useMemo(() => houseFootprint(spot), [spot]);
  return (
    <>
      {halves.map((half, i) => (
        <PolygonF key={i} paths={half.points} options={{ ...SLOPE, fillColor: half.lit ? ROOF_LIT : ROOF_SHADED }} />
      ))}
      <PolygonF paths={footprint} options={EDGE} />
    </>
  );
};

export default BuildSpotHouse;
