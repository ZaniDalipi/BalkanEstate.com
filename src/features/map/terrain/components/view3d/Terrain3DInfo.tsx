/**
 * The card in the corner of the 3D view: what is on show (area, height
 * range), the colour scale, and what could mislead if left unsaid — how much
 * heights are stretched, and that the house is true size.
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import { formatMeasureArea } from '../../../hooks/useMeasurement';
import type { TerrainAnalysis } from '../../types';
import type { PlotSurface } from '../../hooks/usePlotModel';
import type { Exaggeration } from '../../utils/terrain3dScene';
import { CAPTION, GLASS } from '../terrainStyles';
import SlopeScale from './SlopeScale';

export interface Terrain3DInfoProps {
  titleId: string;
  analysis: TerrainAnalysis;
  surface: PlotSurface;
  exaggeration: Exaggeration;
}

const Terrain3DInfo: React.FC<Terrain3DInfoProps> = ({ titleId, analysis, surface, exaggeration }) => {
  const { t } = useTranslation('search');
  const { stats } = analysis;
  return (
    <div className={`w-[min(17rem,calc(100vw-5.5rem))] rounded-2xl px-3.5 py-3 ${GLASS}`}>
      <h2 id={titleId} className="text-[15px] font-semibold tracking-tight text-gray-900">
        {t('terrain.view3d.title', 'Terrain in 3D')}
      </h2>
      <p className="text-xs tabular-nums text-gray-600">
        {formatMeasureArea(stats.areaM2)} · {Math.round(stats.minElevation)}–{Math.round(stats.maxElevation)} m
      </p>
      {surface === 'slope' && (
        <div className="mt-2.5">
          <SlopeScale />
        </div>
      )}
      <p className={`mt-2 ${CAPTION}`}>
        {exaggeration === 1
          ? t('terrain.view3d.trueScale', 'Heights are shown true to scale.')
          : t('terrain.view3d.exaggerated', 'Heights are stretched ×{{n}} so the shape of the land is easier to see.', { n: exaggeration })}
        {analysis.buildSpot && (
          <> {t('terrain.view3d.houseNote', 'The house marks the best place to build, at true size (about 12 × 9 m).')}</>
        )}
      </p>
    </div>
  );
};

export default Terrain3DInfo;
