/** Show or hide the buildings round the plot in the 3D view. */
import React from 'react';
import { Building2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { GLASS } from '../terrainStyles';

const BuildingsToggle: React.FC<{ on: boolean; onChange: (on: boolean) => void }> = ({ on, onChange }) => {
  const { t } = useTranslation('search');
  return (
    <div className={`rounded-full p-1 ${GLASS}`}>
      <button
        type="button"
        onClick={() => onChange(!on)}
        aria-pressed={on}
        className={`flex min-h-11 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 text-[13px] font-semibold transition ${
          on ? 'bg-gray-900 text-white shadow-sm' : 'text-gray-700 hover:bg-black/[0.06]'
        }`}
      >
        <Building2 aria-hidden="true" className="h-4 w-4" strokeWidth={2} />
        {t('terrain.view3d.buildings', 'Buildings')}
      </button>
    </div>
  );
};

export default BuildingsToggle;
