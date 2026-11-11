/**
 * Step one: place corners on the map. Shows how many are down and the area so
 * far, says why the area can't be analysed yet, and sends it off when it can.
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import { formatMeasureArea } from '../../hooks/useMeasurement';
import type { TerrainTool } from '../hooks/useTerrainTool';
import { PRIMARY_BUTTON, SECONDARY_BUTTON } from './terrainButtons';
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
      <p className="text-xs text-gray-600 leading-relaxed">
        {t('terrain.instructions', 'Tap the map to place corners 1, 2, 3… around the land. Add at least 3.')}
      </p>

      {points.length > 0 && (
        <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-100 text-xs">
          <span className="text-gray-600">{t('terrain.corners', 'Corners: {{n}}', { n: points.length })}</span>
          {points.length >= 3 && <span className="font-bold text-emerald-700">{formatMeasureArea(areaM2)}</span>}
        </div>
      )}

      {problem && (
        <p role="alert" className="text-xs font-medium text-red-600">
          {t(`terrain.errors.${problem}`, AREA_ERROR_TEXT[problem])}
        </p>
      )}

      <div className="flex gap-2">
        <button type="button" onClick={tool.undo} disabled={points.length === 0} className={SECONDARY_BUTTON}>
          {t('terrain.undo', 'Undo')}
        </button>
        <button type="button" onClick={tool.clear} disabled={points.length === 0} className={SECONDARY_BUTTON}>
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
