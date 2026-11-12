/** What covers a 3D scene while it loads, or when the browser can't draw it. */
import React from 'react';
import { useTranslation } from 'react-i18next';
import { GLASS, PRIMARY_BUTTON } from '../terrainStyles';

export const SceneLoading: React.FC = () => {
  const { t } = useTranslation('search');
  return (
    <div role="status" className="absolute inset-0 flex items-center justify-center bg-[#e7eae4]">
      <span className={`flex items-center gap-3 rounded-full px-4 py-2.5 text-[13px] font-medium text-gray-700 ${GLASS}`}>
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-900 motion-reduce:animate-none" />
        {t('terrain.view3d.loading', 'Loading 3D terrain…')}
      </span>
    </div>
  );
};

export const SceneFailed: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { t } = useTranslation('search');
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-white p-6 text-center">
      <p role="alert" className="max-w-sm text-[15px] leading-relaxed text-gray-700">
        {t('terrain.view3d.noWebgl', "This browser can't show 3D maps (WebGL is off or not supported). The slope map still works.")}
      </p>
      <button type="button" onClick={onClose} className={`${PRIMARY_BUTTON} !w-auto`}>
        {t('terrain.view3d.back', 'Back to the slope map')}
      </button>
    </div>
  );
};
