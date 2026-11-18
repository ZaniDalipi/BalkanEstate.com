import React from 'react';
import { useTranslation } from 'react-i18next';
import { PencilIcon, XCircleIcon, SearchPlusIcon, CrosshairsIcon } from '@/constants';
import { SoftIcon } from '@/src/shared/illustrations';
import type { GoogleMapControlsProps } from '../GoogleMapControls';

/**
 * Phone controls, top right below the floating search bar. Each button pairs
 * its icon with a short caption + aria-label so the action is self-explanatory
 * on touch devices (no hover tooltips).
 */
const MobileMapActions: React.FC<GoogleMapControlsProps> = ({ handleRecenter, handleResetView, mapStyle, setMapStyle, isDrawing, onDrawStart, drawnBounds, onDrawComplete, onSaveSearch, isSaving, isAuthenticated }) => {
  const { t } = useTranslation(['search', 'common']);
  return (
    <div className="absolute right-2 z-[999]" style={{ top: 'calc(var(--floating-search-top-pad, 8px) + 60px)' }}>
      <div className="flex flex-col gap-1.5 items-end">
        <div
          className="flex items-stretch gap-1 p-1.5 rounded-2xl shadow-xl border border-white/30"
          style={{
            background: 'rgba(255, 255, 255, 0.9)',
            backdropFilter: 'blur(20px) saturate(180%)',
          }}
        >
          {(() => {
            const isSatellite = mapStyle === 'satellite' || mapStyle === 'hybrid';
            const mapTypeLabel = isSatellite ? t('search:map.mapView') : t('search:map.satellite');
            return (
              <button
                onClick={() => setMapStyle(isSatellite ? 'street' : 'satellite')}
                className="flex flex-col items-center justify-center gap-0.5 px-2 py-1.5 rounded-xl text-gray-700 hover:bg-white/50 active:scale-95 transition-all"
                aria-label={t('search:map.switchTo', { view: mapTypeLabel })}
                title={t('search:map.switchTo', { view: mapTypeLabel })}
              >
                <SoftIcon name={isSatellite ? 'city' : 'globe'} className="w-5 h-5" />
                <span className="text-[9px] font-semibold leading-none">{mapTypeLabel}</span>
              </button>
            );
          })()}
          {handleResetView && (
            <button
              onClick={handleResetView}
              className="flex flex-col items-center justify-center gap-0.5 px-2 py-1.5 rounded-xl hover:bg-white/50 text-neutral-600 active:scale-95 transition-all"
              aria-label={t('common:aria.resetView')}
              title={t('common:aria.resetView')}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
              </svg>
              <span className="text-[9px] font-semibold leading-none">{t('search:map.reset')}</span>
            </button>
          )}
          <button
            onClick={handleRecenter}
            className="flex flex-col items-center justify-center gap-0.5 px-2 py-1.5 rounded-xl hover:bg-white/50 text-neutral-600 active:scale-95 transition-all"
            aria-label={t('search:map.centerOnLocation')}
            title={t('search:map.centerOnLocation')}
          >
            <CrosshairsIcon className="w-5 h-5" />
            <span className="text-[9px] font-semibold leading-none">{t('search:map.locate')}</span>
          </button>
          <button
            onClick={onDrawStart}
            className={`flex flex-col items-center justify-center gap-0.5 px-2 py-1.5 rounded-xl transition-all active:scale-95 ${
              isDrawing ? 'bg-red-500 text-white' : 'bg-neutral-800 text-white'
            }`}
            aria-label={isDrawing ? t('search:map.cancel') : t('search:map.drawAreaHint')}
            title={isDrawing ? t('search:map.cancel') : t('search:map.drawAreaHint')}
          >
            {isDrawing ? <XCircleIcon className="w-5 h-5" /> : <PencilIcon className="w-5 h-5" />}
            <span className="text-[9px] font-semibold leading-none">{isDrawing ? t('search:map.cancel') : t('search:map.draw')}</span>
          </button>
        </div>

        {drawnBounds && !isDrawing && (
          <div
            className="flex items-center gap-2 p-2 rounded-2xl shadow-2xl border border-white/40"
            style={{
              background: 'rgba(255, 255, 255, 0.92)',
              backdropFilter: 'blur(20px) saturate(180%)',
            }}
          >
            {isAuthenticated && (
              <button
                onClick={onSaveSearch}
                disabled={isSaving}
                className="flex flex-col items-center justify-center gap-0.5 px-3 py-2 bg-gradient-to-r from-primary to-blue-600 text-white rounded-xl disabled:opacity-50 active:scale-95 transition-all"
                aria-label={isSaving ? t('search:map.saving') : t('search:map.saveArea')}
                title={t('search:map.saveArea')}
                aria-busy={isSaving}
              >
                <SearchPlusIcon className="w-5 h-5" />
                <span className="text-[9px] font-semibold leading-none">{isSaving ? t('search:map.saving') : t('search:map.save')}</span>
              </button>
            )}
            <button
              onClick={() => onDrawComplete(null)}
              className="flex flex-col items-center justify-center gap-0.5 px-3 py-2 bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-xl active:scale-95 transition-all"
              aria-label={t('search:map.clearArea')}
              title={t('search:map.clearArea')}
            >
              <XCircleIcon className="w-5 h-5" />
              <span className="text-[9px] font-semibold leading-none">{t('search:map.clear')}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MobileMapActions;
