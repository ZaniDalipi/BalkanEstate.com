/**
 * Step one: place corners on the map. Shows how many are down and the area so
 * far, says why the area can't be analysed yet, and sends it off when it can.
 */
import React from 'react';
import { Trash2, TriangleAlert, Undo2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatMeasureArea } from '../../hooks/useMeasurement';
import type { TerrainTool } from '../hooks/useTerrainTool';
import { BODY_TEXT, CARD, PRIMARY_BUTTON, SECONDARY_BUTTON } from './terrainStyles';
import { AREA_ERROR_TEXT } from './terrainText';

export interface TerrainDrawStepProps {
  tool: Pick<TerrainTool, 'points' | 'areaM2' | 'validation' | 'undo' | 'clear' | 'analyze'>;
}

const TerrainDrawStep: React.FC<TerrainDrawStepProps> = ({ tool }) => {
  const { t } = useTranslation('search');
  const { points, areaM2, validation } = tool;
  // "Add at least 3" is already the instruction; only explain other problems.
  const problem = validation.isValid === false && validation.error !== 'tooFewPoints' ? validation.error : null;

  return (
    <>
      <p className={BODY_TEXT}>
        {t('terrain.instructions', 'Tap the map to place corners 1, 2, 3… around the land. Add at least 3.')}
      </p>

      {points.length > 0 && (
        <div className={`${CARD} flex items-center justify-between px-3.5 py-2.5 text-[13px]`}>
          <span className="text-gray-600">{t('terrain.corners', 'Corners: {{n}}', { n: points.length })}</span>
          {points.length >= 3 && <span className="font-semibold tabular-nums text-gray-900">{formatMeasureArea(areaM2)}</span>}
        </div>
      )}

      {problem && (
        <p role="alert" className="flex gap-2.5 rounded-2xl bg-red-500/10 px-3.5 py-2.5 text-[13px] leading-snug text-red-700">
          <TriangleAlert aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2} />
          {t(`terrain.errors.${problem}`, AREA_ERROR_TEXT[problem])}
        </p>
      )}

      <div className="flex gap-2">
        <button type="button" onClick={tool.undo} disabled={points.length === 0} className={SECONDARY_BUTTON}>
          <Undo2 aria-hidden="true" className="h-4 w-4" strokeWidth={2} />
          {t('terrain.undo', 'Undo')}
        </button>
        <button type="button" onClick={tool.clear} disabled={points.length === 0} className={SECONDARY_BUTTON}>
          <Trash2 aria-hidden="true" className="h-4 w-4" strokeWidth={2} />
          {t('terrain.clear', 'Clear')}
        </button>
      </div>
      <button type="button" onClick={tool.analyze} disabled={!validation.isValid} className={PRIMARY_BUTTON}>
        {t('terrain.analyze', 'Show slope')}
      </button>
    </>
  );
};

export default TerrainDrawStep;
