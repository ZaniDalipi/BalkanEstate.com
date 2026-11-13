/**
 * Where to build: the roomiest patch of easy ground, with a button to fly
 * the map to it. When there is none, says so plainly and what to expect.
 */
import React from 'react';
import { House, TriangleAlert } from 'lucide-react';
import { useTranslation } from 'react-i18next';
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
      <div className="flex gap-2.5 rounded-2xl bg-amber-500/10 p-3.5 text-[13px] leading-snug text-amber-900">
        <TriangleAlert aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2} />
        {t('terrain.spot.none', 'No easy spot to build: most of this land is steep. Expect terraces and retaining walls, and ask an engineer before you buy.')}
      </div>
    );
  }

  const area = formatMeasureArea(spot.areaM2);
  return (
    <div className="rounded-2xl bg-emerald-500/10 p-3.5">
      <p className="flex items-center gap-2 text-[13px] font-semibold text-emerald-900">
        <House aria-hidden="true" className="h-4 w-4" strokeWidth={2} />
        {t('terrain.spot.title', 'Best place to build')}
      </p>
      <p className="mt-1 text-[13px] leading-snug text-emerald-950/80">
        {spot.quality === 'easy'
          ? t('terrain.spot.easy', 'About {{area}} of flat to gentle ground in one piece.', { area })
          : t('terrain.spot.workable', 'No flat ground here. The gentlest piece is about {{area}}, buildable with some earthworks.', { area })}
      </p>
      <button
        type="button"
        onClick={() => onShow(spot)}
        className="mt-2.5 min-h-11 w-full rounded-full bg-white/80 px-4 text-[13px] font-semibold text-emerald-800 transition hover:bg-white active:scale-[0.98]"
      >
        {t('terrain.spot.show', 'Show on map')}
      </button>
    </div>
  );
};

export default BuildSpotCard;
