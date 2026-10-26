import React from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, Info } from 'lucide-react';
import type { DevelopmentFloor, PublicUnit } from '../../../types';
import { StackingPlan } from './StackingPlan';

interface FloorByFloorProps {
  title: string;
  floors: DevelopmentFloor[];
  units: PublicUnit[];
  matchedIds?: Set<string>;
  onOpenUnit: (unitId: string) => void;
  openUnitId?: string | null;
  /** "← Residence" when the building has no picture (the stage isn't shown). */
  back?: { label: string; onClick: () => void };
  /** Shown above the list when the picture has no regions yet. */
  note?: string;
}

/**
 * Every apartment of a building, floor by floor — so a building is always
 * explorable: on its own when it has no picture, and under the picture while
 * its floors/apartments are not marked on it yet.
 */
export const FloorByFloor: React.FC<FloorByFloorProps> = ({ title, floors, units, matchedIds, onOpenUnit, openUnitId, back, note }) => {
  const { t } = useTranslation('developments');
  return (
    <section className="bg-slate-900 px-4 py-6 sm:px-8" aria-label={title}>
      <div className="mx-auto max-w-6xl">
        <div className="mb-4">
          {back && (
            <button type="button" onClick={back.onClick} className="mb-1 inline-flex min-h-[44px] items-center gap-1 text-sm font-semibold text-teal-300 hover:text-teal-200">
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              {back.label}
            </button>
          )}
          <h2 className="text-xl font-bold text-white">{title}</h2>
          {note && (
            <p className="mt-2 flex items-start gap-2 text-sm text-slate-300">
              <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              {note}
            </p>
          )}
        </div>
        {units.length > 0 ? (
          <StackingPlan floors={floors} units={units} matchedIds={matchedIds} onOpenUnit={onOpenUnit} openUnitId={openUnitId} />
        ) : (
          <p className="text-sm text-slate-400">{t('explorer.noUnitsHere', 'No apartments are published in this building yet.')}</p>
        )}
      </div>
    </section>
  );
};
