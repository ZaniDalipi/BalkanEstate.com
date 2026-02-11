/**
 * GoogleMapMeasurement - Measurement tool panel and save measurement modal
 * Includes distance/area drawing UI, measurement results, and save form.
 * Extracted from GoogleMapComponent.tsx
 */

import React from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { XCircleIcon } from '@/constants';
import {
  formatMeasureDistance,
  formatMeasureArea,
  type MeasurementPoint,
  type LocalMeasurement,
} from '../hooks';

export interface GoogleMapMeasurementProps {
  showMeasurement: boolean;
  setShowMeasurement: (show: boolean) => void;
  measurementMode: 'distance' | 'area';
  setMeasurementMode: (mode: 'distance' | 'area') => void;
  measurementPoints: MeasurementPoint[];
  setMeasurementPoints: React.Dispatch<React.SetStateAction<MeasurementPoint[]>>;
  measurementDistance: number;
  measurementArea: number;
  measurementPerimeter: number;
  handleOpenSaveModal: () => void;
  handleQuickSave: () => void;
  handleSaveMeasurementToBackend: () => void;
  isAuthenticated: boolean;

  // Save modal
  showSaveModal: boolean;
  setShowSaveModal: (show: boolean) => void;
  pendingMeasurement: LocalMeasurement | null;
  setPendingMeasurement: (m: LocalMeasurement | null) => void;
  savingMeasurement: boolean;
  measurementName: string;
  setMeasurementName: (name: string) => void;
  measurementAddress: string;
  setMeasurementAddress: (addr: string) => void;
  measurementNotes: string;
  setMeasurementNotes: (notes: string) => void;
  measurementSaveError: string | null;
  setMeasurementSaveError: (err: string | null) => void;
  measurementCount: number;
  measurementMaxAllowed: number;
  measurementIsPro: boolean;
  isAtMeasurementLimit: boolean;
}

const GoogleMapMeasurement: React.FC<GoogleMapMeasurementProps> = ({
  showMeasurement,
  setShowMeasurement,
  measurementMode,
  setMeasurementMode,
  measurementPoints,
  setMeasurementPoints,
  measurementDistance,
  measurementArea,
  measurementPerimeter,
  handleOpenSaveModal,
  handleQuickSave,
  handleSaveMeasurementToBackend,
  isAuthenticated,
  showSaveModal,
  setShowSaveModal,
  pendingMeasurement,
  setPendingMeasurement,
  savingMeasurement,
  measurementName,
  setMeasurementName,
  measurementAddress,
  setMeasurementAddress,
  measurementNotes,
  setMeasurementNotes,
  measurementSaveError,
  setMeasurementSaveError,
  measurementCount,
  measurementMaxAllowed,
  measurementIsPro,
  isAtMeasurementLimit,
}) => {
  const { t } = useTranslation(['search', 'common']);

  return (
    <>
      {/* Measurement Tool Panel */}
      {showMeasurement && (
        <div
          className="absolute top-16 left-4 z-[1002] p-4 rounded-2xl shadow-2xl border border-white/30 max-w-xs"
          style={{ background: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(20px)' }}
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-sm text-gray-800 flex items-center gap-2">
              <span>📏</span>
              {t('search:map.measure', 'Measure Land')}
            </h3>
            <button
              onClick={() => setShowMeasurement(false)}
              aria-label="Close measurement tool"
              className="p-1 rounded-full hover:bg-gray-100 text-gray-500"
            >
              <XCircleIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Mode toggle */}
          <div className="flex gap-1 mb-3 p-1 bg-gray-100 rounded-lg">
            <button
              onClick={() => { setMeasurementMode('area'); setMeasurementPoints([]); }}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${
                measurementMode === 'area' ? 'bg-white shadow text-emerald-600' : 'text-gray-600 hover:bg-white/50'
              }`}
            >
              📐 Area
            </button>
            <button
              onClick={() => { setMeasurementMode('distance'); setMeasurementPoints([]); }}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${
                measurementMode === 'distance' ? 'bg-white shadow text-emerald-600' : 'text-gray-600 hover:bg-white/50'
              }`}
            >
              📍 Distance
            </button>
          </div>

          {/* Instructions */}
          <p className="text-xs text-gray-500 mb-3">
            {measurementMode === 'area'
              ? 'Click on the map to draw a polygon. Add at least 3 points.'
              : 'Click on the map to add points and measure distance.'}
          </p>

          {/* Current measurement results */}
          {measurementPoints.length >= 2 && (
            <div className="space-y-2 mb-3 p-3 bg-emerald-50 rounded-xl border border-emerald-100">
              {measurementMode === 'area' && measurementPoints.length >= 3 && (
                <>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">Area:</span>
                    <span className="font-bold text-emerald-600">{formatMeasureArea(measurementArea)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">Perimeter:</span>
                    <span className="font-semibold text-gray-700">{formatMeasureDistance(measurementPerimeter)}</span>
                  </div>
                </>
              )}
              {measurementMode === 'distance' && (
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-600">Distance:</span>
                  <span className="font-bold text-emerald-600">{formatMeasureDistance(measurementDistance)}</span>
                </div>
              )}
              <div className="text-[10px] text-gray-400">
                {measurementPoints.length} point{measurementPoints.length !== 1 ? 's' : ''} placed
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => setMeasurementPoints(prev => prev.slice(0, -1))}
              disabled={measurementPoints.length === 0}
              className="flex-1 py-2 text-xs font-semibold rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              ↩️ Undo
            </button>
            {isAuthenticated ? (
              <button
                onClick={handleOpenSaveModal}
                disabled={measurementPoints.length < 2 || (measurementMode === 'area' && measurementPoints.length < 3)}
                className="flex-1 py-2 text-xs font-semibold rounded-lg bg-indigo-500 text-white hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                💾 Save
              </button>
            ) : (
              <button
                onClick={handleQuickSave}
                disabled={measurementPoints.length < 2 || (measurementMode === 'area' && measurementPoints.length < 3)}
                className="flex-1 py-2 text-xs font-semibold rounded-lg bg-indigo-500 text-white hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                💾 Keep
              </button>
            )}
            <button
              onClick={() => setMeasurementPoints([])}
              disabled={measurementPoints.length === 0}
              className="flex-1 py-2 text-xs font-semibold rounded-lg bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              🗑️ New
            </button>
          </div>

        </div>
      )}

      {/* Save Measurement Modal - Portal to body for proper z-index */}
      {showSaveModal && pendingMeasurement && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-5 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl">📏</span>
                  <div>
                    <h3 className="font-bold text-lg">{t('search:map.saveMeasurement', 'Save Measurement')}</h3>
                    <p className="text-xs text-white/80">
                      {pendingMeasurement.mode === 'area'
                        ? formatMeasureArea(pendingMeasurement.area)
                        : formatMeasureDistance(pendingMeasurement.distance)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => { setShowSaveModal(false); setPendingMeasurement(null); }}
                  aria-label="Close save measurement dialog"
                  className="p-1 rounded-full hover:bg-white/20 transition-colors"
                >
                  <XCircleIcon className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Form */}
            <div className="p-5 space-y-4">
              {/* Name field */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  {t('search:map.measurementName', 'Name')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={measurementName}
                  onChange={(e) => setMeasurementName(e.target.value)}
                  placeholder={t('search:map.measurementNamePlaceholder', 'e.g., Garden plot, Building lot...')}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  autoFocus
                />
              </div>

              {/* Address/Location field */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  {t('search:map.measurementLocation', 'Location / Address')}
                </label>
                <input
                  type="text"
                  value={measurementAddress}
                  onChange={(e) => setMeasurementAddress(e.target.value)}
                  placeholder={t('search:map.measurementLocationPlaceholder', 'e.g., Near Lake Ohrid, Albania...')}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                />
              </div>

              {/* Notes field */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  {t('search:map.measurementNotes', 'Notes')}
                </label>
                <textarea
                  value={measurementNotes}
                  onChange={(e) => setMeasurementNotes(e.target.value)}
                  placeholder={t('search:map.measurementNotesPlaceholder', 'Any additional details...')}
                  rows={3}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all resize-none"
                />
              </div>

              {/* Measurement details */}
              <div className="p-3 bg-indigo-50 rounded-xl">
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-indigo-600 font-semibold">{pendingMeasurement.mode === 'area' ? '📐 Area' : '📍 Distance'}</span>
                  <span className="text-gray-500">•</span>
                  <span className="text-gray-700">{pendingMeasurement.points.length} points</span>
                  {pendingMeasurement.mode === 'area' && (
                    <>
                      <span className="text-gray-500">•</span>
                      <span className="text-gray-700">Perimeter: {formatMeasureDistance(pendingMeasurement.perimeter)}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Measurement limit indicator */}
              {isAuthenticated && (
                <div className={`p-3 rounded-xl ${isAtMeasurementLimit ? 'bg-red-50 border border-red-200' : 'bg-gray-50'}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">
                      {t('search:map.measurementUsage', 'Saved measurements')}
                    </span>
                    <span className={`text-sm font-bold ${isAtMeasurementLimit ? 'text-red-600' : 'text-gray-700'}`}>
                      {measurementCount} / {measurementMaxAllowed}
                    </span>
                  </div>
                  {!measurementIsPro && measurementCount >= measurementMaxAllowed - 1 && (
                    <p className="text-xs text-amber-600 mt-1">
                      {isAtMeasurementLimit
                        ? '⚠️ You\'ve reached the free limit. Upgrade to Pro for more!'
                        : '⚠️ 1 slot remaining. Upgrade to Pro for more measurements.'
                      }
                    </p>
                  )}
                </div>
              )}

              {/* Error message */}
              {measurementSaveError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
                  <div className="flex items-start gap-2">
                    <span className="text-red-500 text-lg">❌</span>
                    <div>
                      <p className="text-sm font-semibold text-red-700">
                        {t('search:map.saveFailed', 'Could not save')}
                      </p>
                      <p className="text-xs text-red-600 mt-0.5">{measurementSaveError}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="px-5 py-4 bg-gray-50 flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setShowSaveModal(false);
                  setPendingMeasurement(null);
                  setMeasurementSaveError(null);
                }}
                className="px-4 py-2 text-sm font-semibold text-gray-600 hover:text-gray-800 transition-colors"
              >
                {t('common:cancel', 'Cancel')}
              </button>
              <button
                onClick={handleSaveMeasurementToBackend}
                disabled={!measurementName.trim() || savingMeasurement || (isAuthenticated && isAtMeasurementLimit)}
                className="px-5 py-2.5 text-sm font-bold rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
              >
                {savingMeasurement ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>{t('common:saving', 'Saving...')}</span>
                  </>
                ) : isAtMeasurementLimit && isAuthenticated ? (
                  <>
                    <span>🔒</span>
                    <span>{t('search:map.limitReached', 'Limit Reached')}</span>
                  </>
                ) : (
                  <>
                    <span>💾</span>
                    <span>{t('search:map.saveToProfile', 'Save to Profile')}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

export default GoogleMapMeasurement;
