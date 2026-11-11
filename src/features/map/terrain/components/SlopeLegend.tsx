/**
 * The five slope bands, green (easiest to build) to red, with what each means
 * for building and how much of the drawn area falls in it.
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import type { SlopeClassId } from '../types';
import { SLOPE_CLASSES, slopeRangeLabel } from '../utils/slopeClasses';
import { CLASS_ADVICE_TEXT, CLASS_NAME_TEXT } from './terrainText';

export interface SlopeLegendProps {
  shares: Record<SlopeClassId, number>;
}

const percent = (share: number): string => `${Math.round(share * 100)}%`;

const SlopeLegend: React.FC<SlopeLegendProps> = ({ shares }) => {
  const { t } = useTranslation('search');
  return (
    <div>
      <p className="text-[11px] font-semibold text-gray-500 mb-2">
        {t('terrain.legendTitle', 'Rating · green is easiest to build on')}
      </p>
      <ul className="space-y-2">
        {SLOPE_CLASSES.map((c) => (
          <li key={c.id} className="flex items-start gap-2.5">
            <span aria-hidden="true" className="mt-1 w-3.5 h-3.5 rounded shrink-0" style={{ backgroundColor: c.color }} />
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline justify-between gap-2 text-xs">
                <span className="font-semibold text-gray-800">
                  {t(`terrain.classes.${c.id}`, CLASS_NAME_TEXT[c.id])}
                  <span className="font-normal text-gray-500"> · {slopeRangeLabel(c)}</span>
                </span>
                <span className="font-bold tabular-nums text-gray-700">{percent(shares[c.id])}</span>
              </div>
              <p className="text-[11px] text-gray-500">{t(`terrain.advice.${c.id}`, CLASS_ADVICE_TEXT[c.id])}</p>
              <div className="mt-1 h-1 rounded-full bg-gray-100 overflow-hidden" aria-hidden="true">
                <div className="h-full rounded-full" style={{ width: percent(shares[c.id]), backgroundColor: c.color }} />
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default SlopeLegend;
