/**
 * Everything the terrain tool draws on the map: the area's outline and
 * corners while drawing, then the slope picture, downhill arrows, slope
 * labels and the best place to build. Render inside <GoogleMap>.
 */
import React from 'react';
import { PolygonF, PolylineF } from '@react-google-maps/api';
import { useTranslation } from 'react-i18next';
import { useSlopeGroundOverlay } from '../hooks/useSlopeGroundOverlay';
import type { TerrainPoint } from '../types';
import type { TerrainPhase } from '../utils/terrainPhase';
import { BuildSpotMarker, CornerDot, SlopeArrowMarker, SlopeLabelMarker } from './TerrainMarkers';

export interface TerrainMapLayersProps {
  map: google.maps.Map | null;
  points: TerrainPoint[];
  phase: TerrainPhase;
}

const OUTLINE = { strokeColor: '#ffffff', strokeOpacity: 1, strokeWeight: 3, clickable: false } as const;

const TerrainMapLayers: React.FC<TerrainMapLayersProps> = ({ map, points, phase }) => {
  const { t } = useTranslation('search');
  const analysis = phase.kind === 'result' ? phase.analysis : null;
  useSlopeGroundOverlay(map, analysis, points);

  return (
    <>
      {points.length >= 3 && (
        <PolygonF
          paths={points}
          options={{ ...OUTLINE, fillColor: '#10b981', fillOpacity: analysis ? 0 : 0.2 }}
        />
      )}
      {points.length === 2 && <PolylineF path={points} options={OUTLINE} />}
      {points.map((p, i) => (
        <CornerDot key={`${i}-${p.lat}-${p.lng}`} position={p} number={i + 1} />
      ))}
      {analysis?.arrows.map((a) => (
        <SlopeArrowMarker key={`${a.lat}-${a.lng}`} arrow={a} />
      ))}
      {analysis?.labels.map((l) => (
        <SlopeLabelMarker key={`${l.text}-${l.lat}-${l.lng}`} label={l} />
      ))}
      {analysis?.buildSpot && (
        <BuildSpotMarker spot={analysis.buildSpot} label={t('terrain.spot.marker', 'Best spot')} />
      )}
    </>
  );
};

export default TerrainMapLayers;
