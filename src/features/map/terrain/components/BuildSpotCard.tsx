/**
 * Where to build: the roomiest patch of easy ground, with a button to fly
 * the map to it. When there is none, says so plainly and what to expect.
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import { SoftIcon } from '@/src/shared/illustrations';
import { formatMeasureArea } from '../../hooks/useMeasurement';
import type { BuildSpot, TerrainPoint } from '../types';

export interface BuildSpotCardProps {
  spot: BuildSpot | null;
  onShow: (spot: TerrainPoint) => void;
}

const BuildSpotCard: React.FC<BuildSpotCardProps> = ({ spot, onShow }) => {
  const { t } = useTranslation('search');

  if (!spot) {
    return (
      <div className="p-3 rounded-xl bg-amber-50 border border-amber-100 text-xs text-amber-800">
        {t('terrain.spot.none', 'No easy spot to build: most of this land is steep. Expect terraces and retaining walls, and ask an engineer before you buy.')}
      </div>
    );
  }

  const area = formatMeasureArea(spot.areaM2);
  return (
    <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100">
      <p className="flex items-center gap-1.5 text-xs font-bold text-emerald-800">
        <SoftIcon name="home" className="w-4 h-4" />
        {t('terrain.spot.title', 'Best place to build')}
      </p>
      <p className="mt-1 text-xs text-emerald-900">
        {spot.quality === 'easy'
          ? t('terrain.spot.easy', 'About {{area}} of flat to gentle ground in one piece.', { area })
          : t('terrain.spot.workable', 'No flat ground here. The gentlest piece is about {{area}}, buildable with some earthworks.', { area })}
      </p>
      <button
        type="button"
        onClick={() => onShow(spot)}
        className="mt-2 min-h-11 w-full px-3 text-xs font-semibold rounded-xl bg-white text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors"
      >
        {t('terrain.spot.show', 'Show on map')}
      </button>
    </div>
  );
};

export default BuildSpotCard;
