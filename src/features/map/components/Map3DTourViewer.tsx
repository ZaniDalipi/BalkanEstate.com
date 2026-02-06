// Map3DTourViewer Component
// Extracted from Map3DBuildings.tsx
// Contains the 360 virtual tour overlay and entering building animation

import React from 'react';
import { useTranslation } from 'react-i18next';

export interface Map3DTourViewerProps {
  show360Tour: boolean;
  virtualTour360Url?: string;
  handleClose360Tour: () => void;
  floorNumber?: number;
  isEnteringBuilding: boolean;
}

const Map3DTourViewer: React.FC<Map3DTourViewerProps> = ({
  show360Tour,
  virtualTour360Url,
  handleClose360Tour,
  floorNumber,
  isEnteringBuilding,
}) => {
  const { t } = useTranslation(['property']);

  return (
    <>
      {/* 360 Virtual Tour Overlay */}
      {show360Tour && virtualTour360Url && (
        <div className="absolute inset-0 z-50 bg-black animate-fadeIn">
          {/* Close button */}
          <button
            onClick={handleClose360Tour}
            className="absolute top-4 right-4 z-60 flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white font-medium rounded-lg shadow-lg transition-all border border-white/20"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            {t('property:virtualTour.exit', 'Exit Tour')}
          </button>

          {/* Tour indicator badge */}
          <div className="absolute top-4 left-4 z-60 flex items-center gap-2 px-4 py-2 bg-green-500/90 backdrop-blur-sm text-white font-bold rounded-lg shadow-lg">
            <span>{floorNumber ? '\u{1F3E2}' : '\u{1F6AA}'}</span>
            <span>
              {floorNumber
                ? t('property:virtualTour.floor', 'Floor {{floor}}', { floor: floorNumber })
                : t('property:virtualTour.title', '360° Virtual Tour')}
            </span>
          </div>

          {/* 360 Tour iframe */}
          <iframe
            src={virtualTour360Url}
            className="w-full h-full border-0"
            allowFullScreen
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; xr-spatial-tracking"
            title="360 Virtual Tour"
          />

          {/* Instructions hint */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-60 px-4 py-2 bg-black/60 backdrop-blur-sm text-white text-sm rounded-lg">
            {t('property:virtualTour.hint', 'Drag to look around \u2022 Scroll to zoom')}
          </div>
        </div>
      )}

      {/* Entering building animation overlay */}
      {isEnteringBuilding && (
        <div className="absolute inset-0 z-40 bg-gradient-to-b from-transparent via-black/30 to-black/60 pointer-events-none flex items-center justify-center">
          <div className="text-center animate-pulse">
            <div className="text-4xl mb-2">{'\u{1F6AA}'}</div>
            <p className="text-white font-bold text-lg">{t('property:virtualTour.entering', 'Entering building...')}</p>
          </div>
        </div>
      )}
    </>
  );
};

export default Map3DTourViewer;
