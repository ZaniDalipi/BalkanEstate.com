/**
 * While the heights load, and when they can't be used: what happened and
 * what to do next (try again, change the area, or start over).
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import type { TerrainPhase } from '../utils/terrainPhase';
import { PRIMARY_BUTTON, SECONDARY_BUTTON } from './terrainButtons';
import { FAILURE_TEXT } from './terrainText';

export interface TerrainStatusProps {
  phase: Extract<TerrainPhase, { kind: 'loading' } | { kind: 'failed' }>;
  onRetry: () => void;
  onEdit: () => void;
  onRedraw: () => void;
}

const TerrainStatus: React.FC<TerrainStatusProps> = ({ phase, onRetry, onEdit, onRedraw }) => {
  const { t } = useTranslation('search');

  if (phase.kind === 'loading') {
    return (
      <div role="status" className="flex items-center gap-3 py-4 text-sm text-gray-600">
        <span className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin motion-reduce:animate-none" />
        {t('terrain.loading', 'Reading the ground…')}
      </div>
    );
  }

  // A retry can help when the service was down or busy; not when the area itself is the problem.
  const canRetry = phase.reason === 'unavailable' || phase.reason === 'busy';
  return (
    <>
      <p role="alert" className="p-3 rounded-xl bg-red-50 border border-red-100 text-xs text-red-700">
        {t(`terrain.failed.${phase.reason}`, FAILURE_TEXT[phase.reason])}
      </p>
      {canRetry && (
        <button type="button" onClick={onRetry} className={PRIMARY_BUTTON}>
          {t('terrain.retry', 'Try again')}
        </button>
      )}
      <div className="flex gap-2">
        <button type="button" onClick={onEdit} className={SECONDARY_BUTTON}>
          {t('terrain.editArea', 'Edit area')}
        </button>
        <button type="button" onClick={onRedraw} className={SECONDARY_BUTTON}>
          {t('terrain.redraw', 'Draw another area')}
        </button>
      </div>
    </>
  );
};

export default TerrainStatus;
