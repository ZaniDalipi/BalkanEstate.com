/** The depth colours of the walls under the glass lid as one bar, pale to deep blue, from no gap to the whole fall. */
import React from 'react';
import { useTranslation } from 'react-i18next';
import { DEPTH_GRADIENT_CSS } from '../../utils/fallCurtain';

const FallScale: React.FC<{ dropM: number }> = ({ dropM }) => {
  const { t } = useTranslation('search');
  return (
    <div>
      <p className="text-[11px] font-medium text-gray-600">{t('terrain.view3d.gapLegend', 'Gap under the level glass')}</p>
      <div aria-hidden="true" className="mt-1 h-1.5 rounded-full" style={{ background: DEPTH_GRADIENT_CSS }} />
      <div aria-hidden="true" className="mt-1 flex justify-between text-[10px] font-medium tabular-nums text-gray-500">
        <span>0 m</span>
        <span>{Math.round(dropM)} m</span>
      </div>
    </div>
  );
};

export default FallScale;
