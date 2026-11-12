/**
 * Step two: what the ground is like — size, height range, average and
 * steepest slope, a way into 3D, the split across slope classes, the best
 * place to build, and how to read the map.
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import { formatMeasureArea } from '../../hooks/useMeasurement';
import type { TerrainAnalysis, TerrainPoint } from '../types';
import BuildSpotCard from './BuildSpotCard';
import SlopeDistribution from './SlopeDistribution';
import StatTile, { splitUnit } from './StatTile';
import { CAPTION, SECONDARY_BUTTON } from './terrainStyles';
import Terrain3DButton from './view3d/Terrain3DButton';

export interface TerrainResultsProps {
  analysis: TerrainAnalysis;
  /** The drawn area the analysis is for. */
  polygon: TerrainPoint[];
  resolutionM: number;
  onShowSpot: (spot: TerrainPoint) => void;
  onEdit: () => void;
  onRedraw: () => void;
}

const TerrainResults: React.FC<TerrainResultsProps> = ({ analysis, polygon, resolutionM, onShowSpot, onEdit, onRedraw }) => {
  const { t } = useTranslation('search');
  const { stats, contourIntervalM } = analysis;
  const [area, areaUnit] = splitUnit(formatMeasureArea(stats.areaM2));
  // How to read the map: only what is actually drawn on it.
  const mapKey = [
    analysis.arrows.length > 0 ? t('terrain.arrowsHint', 'Arrows point downhill') : null,
    contourIntervalM !== null ? t('terrain.contours', 'Contour lines every {{n}} m', { n: contourIntervalM }) : null,
  ].filter(Boolean);

  return (
    <>
      <dl className="grid grid-cols-2 gap-2">
        <StatTile label={t('terrain.stats.area', 'Area')} value={area} unit={areaUnit} />
        <StatTile
          label={t('terrain.stats.elevation', 'Elevation range')}
          value={`${Math.round(stats.minElevation)}–${Math.round(stats.maxElevation)}`}
          unit="m"
        />
        <StatTile label={t('terrain.stats.meanSlope', 'Average slope')} value={stats.meanSlope.toFixed(1)} unit="%" />
        <StatTile label={t('terrain.stats.maxSlope', 'Steepest slope')} value={stats.maxSlope.toFixed(1)} unit="%" />
      </dl>

      <Terrain3DButton analysis={analysis} polygon={polygon} />
      <SlopeDistribution shares={stats.classShares} />
      <BuildSpotCard spot={analysis.buildSpot} onShow={onShowSpot} />

      <div className="flex gap-2">
        <button type="button" onClick={onEdit} className={SECONDARY_BUTTON}>
          {t('terrain.editArea', 'Edit area')}
        </button>
        <button type="button" onClick={onRedraw} className={SECONDARY_BUTTON}>
          {t('terrain.redraw', 'Draw another area')}
        </button>
      </div>

      <p className={CAPTION}>
        {mapKey.length > 0 && <>{mapKey.join(' · ')}.{' '}</>}
        {t('terrain.disclaimer', 'Estimate from ~{{resolution}} m elevation data. Not a topographic survey.', { resolution: resolutionM })}
      </p>
    </>
  );
};

export default TerrainResults;
