/**
 * Everything the terrain tool draws on the map: the area's outline and
 * numbered corners while drawing, then the slope picture, downhill arrows,
 * slope labels, and a house at the best place to build with its label above
 * it. Render inside <GoogleMap>.
 */
import React from 'react';
import { PolygonF, PolylineF } from '@react-google-maps/api';
import { useTranslation } from 'react-i18next';
import { useSlopeGroundOverlay } from '../hooks/useSlopeGroundOverlay';
import type { TerrainPoint } from '../types';
import type { TerrainPhase } from '../utils/terrainPhase';
import BuildSpotHouse from './BuildSpotHouse';
import { BuildSpotMarker, CornerDot, SlopeArrowMarker, SlopeLabelMarker } from './TerrainMarkers';

export interface TerrainMapLayersProps {
  map: google.maps.Map | null;
  points: TerrainPoint[];
  phase: TerrainPhase;
}

/** A white line on a soft dark edge: it reads on forest, field and rooftop alike. */
const EDGE = { strokeColor: '#000000', strokeOpacity: 0.28, strokeWeight: 6, fillOpacity: 0, clickable: false, zIndex: 1 } as const;
const LINE = { strokeColor: '#ffffff', strokeOpacity: 1, strokeWeight: 2.5, clickable: false, zIndex: 2 } as const;

const TerrainMapLayers: React.FC<TerrainMapLayersProps> = ({ map, points, phase }) => {
  const { t } = useTranslation('search');
  const analysis = phase.kind === 'result' ? phase.analysis : null;
  useSlopeGroundOverlay(map, analysis, points);

  return (
    <>
      {points.length >= 3 && (
        <>
          <PolygonF paths={points} options={EDGE} />
          <PolygonF paths={points} options={{ ...LINE, fillColor: '#ffffff', fillOpacity: analysis ? 0 : 0.18 }} />
        </>
      )}
      {points.length === 2 && (
        <>
          <PolylineF path={points} options={EDGE} />
          <PolylineF path={points} options={LINE} />
        </>
      )}
      {points.map((p, i) => (
        <CornerDot key={`${i}-${p.lat}-${p.lng}`} position={p} number={i + 1} plain={analysis !== null} />
      ))}
      {analysis?.arrows.map((a) => (
        <SlopeArrowMarker key={`${a.lat}-${a.lng}`} arrow={a} />
      ))}
      {analysis?.labels.map((l) => (
        <SlopeLabelMarker key={`${l.text}-${l.lat}-${l.lng}`} label={l} />
      ))}
      {analysis?.buildSpot && (
        <>
          <BuildSpotHouse spot={analysis.buildSpot} />
          <BuildSpotMarker spot={analysis.buildSpot} label={t('terrain.spot.marker', 'Best spot')} />
        </>
      )}
    </>
  );
};

export default TerrainMapLayers;
