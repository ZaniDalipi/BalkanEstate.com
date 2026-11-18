import React from 'react';
import { useTranslation } from 'react-i18next';
import type { GoogleMapControlsProps } from '../GoogleMapControls';
import MobileLayerMenuPanel from './MobileLayerMenuPanel';

/** Phone "Layers" button (bottom left) and the menu it opens. */
const MobileLayerMenu: React.FC<GoogleMapControlsProps> = (props) => {
  const { isLayerMenuOpen, setIsLayerMenuOpen } = props;
  const { t } = useTranslation('search');
  return (
    <div className="absolute bottom-32 left-3 z-[1003]">
      {isLayerMenuOpen && (
        <div className="absolute bottom-full left-0 mb-3 animate-fade-in">
          <MobileLayerMenuPanel {...props} />
        </div>
      )}
      <button
        onClick={() => setIsLayerMenuOpen(!isLayerMenuOpen)}
        className={`w-12 h-12 rounded-full shadow-lg flex flex-col items-center justify-center gap-0.5 transition-all border border-white/40 ${
          isLayerMenuOpen ? 'bg-primary text-white' : 'bg-white/90 text-gray-700'
        }`}
        style={{ backdropFilter: 'blur(10px)' }}
        aria-label={t('search:map.layers')}
        title={t('search:map.layers')}
        aria-expanded={isLayerMenuOpen}
        aria-haspopup="menu"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
        </svg>
        <span className="text-[8px] font-semibold leading-none">{t('search:map.layers')}</span>
      </button>
    </div>
  );
};

export default MobileLayerMenu;
