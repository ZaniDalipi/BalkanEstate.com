/**
 * How the land splits across the five slope classes: one bar divided in
 * proportion, then each class with what it means for building. Classes the
 * land has none of are listed dimmed, without advice.
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import type { SlopeClassId } from '../types';
import { SLOPE_CLASSES, slopeRangeLabel } from '../utils/slopeClasses';
import { CLASS_ADVICE_TEXT, CLASS_NAME_TEXT } from './terrainText';

export interface SlopeDistributionProps {
  shares: Record<SlopeClassId, number>;
}

const percent = (share: number): string => `${Math.round(share * 100)}%`;

const SlopeDistribution: React.FC<SlopeDistributionProps> = ({ shares }) => {
  const { t } = useTranslation('search');
  return (
    <section>
      <h4 className="mb-2 text-xs text-gray-500">{t('terrain.legendTitle', 'Rating · green is easiest to build on')}</h4>
      <div className="flex h-2.5 gap-0.5 overflow-hidden rounded-full" aria-hidden="true">
        {SLOPE_CLASSES.filter((c) => shares[c.id] > 0).map((c) => (
          <span key={c.id} className="min-w-1 rounded-[2px]" style={{ flexGrow: shares[c.id], flexBasis: 0, backgroundColor: c.color }} />
        ))}
      </div>
      <ul className="mt-3 space-y-2.5">
        {SLOPE_CLASSES.map((c) => {
          const present = shares[c.id] > 0;
          return (
            <li key={c.id} className={`flex items-start gap-2.5 ${present ? '' : 'opacity-45'}`}>
              <span aria-hidden="true" className="mt-[5px] h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: c.color }} />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2 text-[13px]">
                  <span className="font-medium text-gray-900">
                    {t(`terrain.classes.${c.id}`, CLASS_NAME_TEXT[c.id])}
                    <span className="ml-1.5 font-normal tabular-nums text-gray-500">{slopeRangeLabel(c)}</span>
                  </span>
                  <span className="font-semibold tabular-nums text-gray-900">{percent(shares[c.id])}</span>
                </div>
                {present && <p className="text-xs text-gray-500">{t(`terrain.advice.${c.id}`, CLASS_ADVICE_TEXT[c.id])}</p>}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
};

export default SlopeDistribution;
