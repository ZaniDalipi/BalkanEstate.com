import React from 'react';
import { useTranslation } from 'react-i18next';
import { CrosshairsIcon, PencilIcon } from '@/constants';
import XmarkIcon from '@/src/components/ui/XmarkIcon';
import type { MapStyleType } from '../googleMapConstants';
import { DESKTOP_MAP_STYLES, planStyleChange } from '../../utils/mapStyleOptions';

export interface MapStyleBarProps {
  handleRecenter: () => void;
  mapStyle: MapStyleType;
  setMapStyle: (style: MapStyleType) => void;
  isDrawing: boolean;
  onDrawStart: () => void;
  hasDrawnArea: boolean;
  clearDrawnArea: () => void;
}

const STYLE_FALLBACK: Record<(typeof DESKTOP_MAP_STYLES)[number], string> = {
  clean: 'Clean',
  color: 'Color',
  street: 'Street',
  satellite: 'Satellite',
};

/** Desktop bar: locate, map style and Draw Area, on the same liquid glass as the layer dock. */
const MapStyleBar: React.FC<MapStyleBarProps> = ({
  handleRecenter, mapStyle, setMapStyle, isDrawing, onDrawStart, hasDrawnArea, clearDrawnArea,
}) => {
  const { t } = useTranslation(['search', 'common']);

  const pick = (style: string) => {
    const plan = planStyleChange(style, hasDrawnArea);
    if (plan === null) return;
    setMapStyle(plan.style);
    if (plan.clearDrawnArea) clearDrawnArea();
  };

  return (
    <div className="thumb-glass relative flex items-center gap-1 rounded-full p-1.5 landscape:p-1">
      <button
        type="button"
        onClick={handleRecenter}
        className="flex h-11 w-11 items-center justify-center rounded-full text-neutral-700 transition-colors hover:bg-white/60 landscape:h-8 landscape:w-8"
        aria-label={t('search:map.centerOnLocation')}
      >
        <CrosshairsIcon className="h-5 w-5" />
      </button>

      <div className="flex items-center rounded-full bg-neutral-900/[0.06] p-0.5" role="radiogroup" aria-label={t('common:aria.mapStyle')}>
        {DESKTOP_MAP_STYLES.map((style) => {
          const checked = mapStyle === style;
          return (
            <button
              key={style}
              type="button"
              role="radio"
              aria-checked={checked}
              onClick={() => pick(style)}
              className={`min-h-10 whitespace-nowrap rounded-full px-3 text-xs font-semibold transition-all motion-reduce:transition-none xl:text-[13px] landscape:min-h-8 landscape:px-2 ${
                checked ? 'bg-white text-primary shadow-sm shadow-black/10' : 'text-neutral-600 hover:bg-white/50'
              }`}
            >
              {t(`search:map.${style}`, STYLE_FALLBACK[style])}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={onDrawStart}
        className={`flex min-h-11 items-center gap-1.5 rounded-full px-3.5 text-xs font-semibold text-white shadow-md transition-colors xl:text-[13px] landscape:min-h-8 landscape:px-2 ${
          isDrawing ? 'bg-red-600 hover:bg-red-700' : 'bg-neutral-800/90 hover:bg-neutral-900'
        }`}
        aria-label={isDrawing ? t('search:map.cancel') : t('search:map.drawArea')}
        aria-pressed={isDrawing}
      >
        {isDrawing ? <XmarkIcon className="h-3.5 w-3.5" strokeWidth={3} /> : <PencilIcon className="h-4 w-4" />}
        <span className="inline landscape:hidden">{isDrawing ? t('search:map.cancel') : t('search:map.drawArea')}</span>
      </button>
    </div>
  );
};

export default MapStyleBar;
