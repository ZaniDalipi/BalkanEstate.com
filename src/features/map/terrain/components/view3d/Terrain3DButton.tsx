/**
 * "View in 3D": opens the 3D terrain view. The view (and MapLibre with it)
 * downloads only when first opened; focus comes back here when it closes.
 */
import React, { Suspense, useCallback, useRef, useState } from 'react';
import { Box } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { lazyWithRetry } from '@/src/app/router/lazyWithRetry';
import type { TerrainAnalysis, TerrainPoint } from '../../types';
import { PRIMARY_BUTTON } from '../terrainStyles';

const Terrain3DDialog = lazyWithRetry(() => import('./Terrain3DDialog'));

export interface Terrain3DButtonProps {
  analysis: TerrainAnalysis;
  polygon: TerrainPoint[];
}

const Terrain3DButton: React.FC<Terrain3DButtonProps> = ({ analysis, polygon }) => {
  const { t } = useTranslation('search');
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const close = useCallback(() => {
    setOpen(false);
    button.current?.focus();
  }, []);

  return (
    <>
      <button ref={button} type="button" onClick={() => setOpen(true)} className={PRIMARY_BUTTON}>
        <Box aria-hidden="true" className="h-[18px] w-[18px]" strokeWidth={2} />
        {t('terrain.view3d.open', 'View in 3D')}
      </button>
      {open && (
        <Suspense fallback={<div role="status" aria-label={t('terrain.view3d.loading', 'Loading 3D terrain…')} className="fixed inset-0 z-[99990] bg-black/45 backdrop-blur-sm" />}>
          <Terrain3DDialog analysis={analysis} polygon={polygon} onClose={close} />
        </Suspense>
      )}
    </>
  );
};

export default Terrain3DButton;
