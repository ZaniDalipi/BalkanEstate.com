/**
 * "View in 3D": opens the 3D terrain view. The view (and MapLibre with it)
 * downloads only when first opened; focus comes back here when it closes.
 */
import React, { Suspense, useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SoftIcon } from '@/src/shared/illustrations';
import { lazyWithRetry } from '@/src/app/router/lazyWithRetry';
import type { TerrainAnalysis, TerrainPoint } from '../../types';

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
      <button
        ref={button}
        type="button"
        onClick={() => setOpen(true)}
        className="w-full min-h-11 flex items-center justify-center gap-2 px-4 text-sm font-bold rounded-xl bg-slate-800 text-white hover:bg-slate-900 transition-colors"
      >
        <SoftIcon name="cube" className="w-5 h-5" />
        {t('terrain.view3d.open', 'View in 3D')}
      </button>
      {open && (
        <Suspense fallback={<div role="status" aria-label={t('terrain.view3d.loading', 'Loading 3D terrain…')} className="fixed inset-0 z-[99990] bg-black/40" />}>
          <Terrain3DDialog analysis={analysis} polygon={polygon} onClose={close} />
        </Suspense>
      )}
    </>
  );
};

export default Terrain3DButton;
