import React from 'react';
import { useTranslation } from 'react-i18next';
import { Minus, Plus, RotateCcw } from 'lucide-react';

interface ZoomControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  isZoomed: boolean;
}

const btn =
  'flex h-11 w-11 items-center justify-center bg-white/95 text-slate-800 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-40';

/** +/−/reset zoom buttons for the explorer stage. */
export const ZoomControls: React.FC<ZoomControlsProps> = ({ onZoomIn, onZoomOut, onReset, isZoomed }) => {
  const { t } = useTranslation('developments');
  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-slate-200 shadow-md" onPointerDown={(e) => e.stopPropagation()}>
      <button type="button" className={btn} onClick={onZoomIn} aria-label={t('explorer.zoomIn', 'Zoom in')}>
        <Plus className="h-5 w-5" aria-hidden="true" />
      </button>
      <button type="button" className={`${btn} border-t border-slate-200`} onClick={onZoomOut} disabled={!isZoomed} aria-label={t('explorer.zoomOut', 'Zoom out')}>
        <Minus className="h-5 w-5" aria-hidden="true" />
      </button>
      <button type="button" className={`${btn} border-t border-slate-200`} onClick={onReset} disabled={!isZoomed} aria-label={t('explorer.resetZoom', 'Reset zoom')}>
        <RotateCcw className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
};
