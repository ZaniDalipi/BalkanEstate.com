/**
 * While the heights load, and when they can't be used: what happened and
 * what to do next (try again, change the area, or start over).
 */
import React from 'react';
import { TriangleAlert } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { TerrainPhase } from '../utils/terrainPhase';
import { PRIMARY_BUTTON, SECONDARY_BUTTON } from './terrainStyles';
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
      <div role="status" className="flex items-center gap-3 py-5 text-[13px] text-gray-600">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-gray-900 motion-reduce:animate-none" />
        {t('terrain.loading', 'Reading the ground…')}
      </div>
    );
  }

  // A retry can help when the service was down or busy; not when the area itself is the problem.
  const canRetry = phase.reason === 'unavailable' || phase.reason === 'busy';
  return (
    <>
      <p role="alert" className="flex gap-2.5 rounded-2xl bg-red-500/10 p-3.5 text-[13px] leading-snug text-red-700">
        <TriangleAlert aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2} />
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
