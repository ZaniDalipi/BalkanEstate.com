/**
 * Step two: what the ground is like — size, height range, average and
 * steepest slope, the slope bands, and the best place to build.
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import { formatMeasureArea } from '../../hooks/useMeasurement';
import type { TerrainAnalysis, TerrainPoint } from '../types';
import BuildSpotCard from './BuildSpotCard';
import Terrain3DButton from './view3d/Terrain3DButton';
import SlopeLegend from './SlopeLegend';
import { SECONDARY_BUTTON } from './terrainButtons';

export interface TerrainResultsProps {
  analysis: TerrainAnalysis;
  /** The drawn area the analysis is for. */
  polygon: TerrainPoint[];
  resolutionM: number;
  onShowSpot: (spot: TerrainPoint) => void;
  onEdit: () => void;
  onRedraw: () => void;
}

const StatTile: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="p-2.5 rounded-xl bg-gray-50">
    <dt className="text-[11px] text-gray-500">{label}</dt>
    <dd className="text-base font-bold text-gray-900 tabular-nums">{value}</dd>
  </div>
);

const pct = (n: number): string => `${n.toFixed(1)}%`;

const TerrainResults: React.FC<TerrainResultsProps> = ({ analysis, polygon, resolutionM, onShowSpot, onEdit, onRedraw }) => {
  const { t } = useTranslation('search');
  const { stats } = analysis;

  return (
    <>
      <dl className="grid grid-cols-2 gap-2">
        <StatTile label={t('terrain.stats.area', 'Area')} value={formatMeasureArea(stats.areaM2)} />
        <StatTile
          label={t('terrain.stats.elevation', 'Elevation range')}
          value={`${Math.round(stats.minElevation)}–${Math.round(stats.maxElevation)} m`}
        />
        <StatTile label={t('terrain.stats.meanSlope', 'Average slope')} value={pct(stats.meanSlope)} />
        <StatTile label={t('terrain.stats.maxSlope', 'Steepest slope')} value={pct(stats.maxSlope)} />
      </dl>
      <Terrain3DButton analysis={analysis} polygon={polygon} />

      <p className="text-[11px] text-gray-500">
        {t('terrain.disclaimer', 'Estimate from ~{{resolution}} m elevation data. Not a topographic survey.', { resolution: resolutionM })}
      </p>
      {analysis.arrows.length > 0 && (
        <p className="flex items-center gap-1.5 text-xs text-gray-600">
          <span aria-hidden="true" className="inline-block rotate-[135deg] font-bold">↑</span>
          {t('terrain.arrowsHint', 'Arrows point downhill')}
        </p>
      )}

      <SlopeLegend shares={stats.classShares} />
      <BuildSpotCard spot={analysis.buildSpot} onShow={onShowSpot} />

      <div className="flex gap-2">
        <button type="button" onClick={onEdit} className={SECONDARY_BUTTON}>
          {t('terrain.editArea', 'Edit area')}
        </button>
        <button type="button" onClick={onRedraw} className={SECONDARY_BUTTON}>
          {t('terrain.redraw', 'Draw another area')}
        </button>
      </div>
    </>
  );
};

export default TerrainResults;
