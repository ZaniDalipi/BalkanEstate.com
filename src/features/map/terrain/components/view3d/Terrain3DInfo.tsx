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
import { MIN_FALL_M, type SlopeFall } from '../../utils/slopeFall';
import { CAPTION, GLASS } from '../terrainStyles';
import FallScale from './FallScale';
import SlopeScale from './SlopeScale';

export interface Terrain3DInfoProps {
  titleId: string;
  analysis: TerrainAnalysis;
  /** How far the plot falls, said in words. */
  fall: SlopeFall | null;
  surface: PlotSurface;
  /** How much heights are stretched; null on Google's photorealistic 3D map, which shows them as they are. */
  exaggeration: Exaggeration | null;
  /** Whether buildings from the map stand round the plot. */
  buildings: boolean;
}

const Terrain3DInfo: React.FC<Terrain3DInfoProps> = ({ titleId, analysis, fall, surface, exaggeration, buildings }) => {
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
      {fall && fall.dropM >= MIN_FALL_M && (
        <p className="mt-1.5 text-[13px] font-semibold leading-snug text-gray-900">
          {t('terrain.view3d.fall', 'Falls {{drop}} m over {{run}} m: {{pct}}% on average.', {
            drop: Math.round(fall.dropM),
            run: Math.round(fall.runM),
            pct: Math.round(fall.gradePct),
          })}
        </p>
      )}
      {surface === 'slope' && (
        <div className="mt-2.5">
          <SlopeScale />
        </div>
      )}
      {exaggeration === null && fall && fall.dropM >= MIN_FALL_M && (
        <div className="mt-2.5">
          <FallScale dropM={fall.dropM} />
        </div>
      )}
      <p className={`mt-2 ${CAPTION}`}>
        {exaggeration === null && t('terrain.view3d.googleNote', '3D imagery from Google, at true scale.')}
        {exaggeration === null && fall && fall.dropM >= MIN_FALL_M && (
          <> {t('terrain.view3d.lidNote', 'The glass lid is level with the highest ground; the walls under it turn darker blue where the land falls further.')}</>
        )}
        {exaggeration === null && analysis.contourIntervalM !== null && (
          <> {t('terrain.view3d.contourNote', 'White lines join ground of equal height every {{n}} m: the closer they are, the steeper.', { n: analysis.contourIntervalM })}</>
        )}
        {exaggeration === 1 && t('terrain.view3d.trueScale', 'Heights are shown true to scale.')}
        {exaggeration !== null && exaggeration > 1
          && t('terrain.view3d.exaggerated', 'Heights are stretched ×{{n}} so the shape of the land is easier to see.', { n: exaggeration })}
        {exaggeration === null && analysis.buildSpot && (
          <> {t('terrain.view3d.pinNote', 'The pin marks the best place to build.')}</>
        )}
        {exaggeration !== null && analysis.buildSpot && (
          <> {t('terrain.view3d.houseNote', 'The house marks the best place to build, at true size (about 12 × 9 m).')}</>
        )}
        {buildings && (
          <> {t('terrain.view3d.buildingsNote', 'Buildings around are from OpenStreetMap; where a height is missing it is taken as 5 m.')}</>
        )}
      </p>
    </div>
  );
};

export default Terrain3DInfo;
