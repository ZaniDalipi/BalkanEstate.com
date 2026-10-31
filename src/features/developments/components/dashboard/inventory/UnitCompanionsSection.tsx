import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link2 } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import type { DashboardUnit } from '../../../types';
import { useExtraUnits } from '../../../hooks/useExtraUnits';
import { isExtraUnit } from '../../../utils/unitCompanions';
import type { UnitSectionProps } from './UnitFieldControls';

interface UnitCompanionsSectionProps extends UnitSectionProps {
  developmentId: string;
  unit: DashboardUnit;
}

/**
 * "Comes with": the parking spots and storage rooms sold together with this
 * apartment. Each is a unit of its own (own region on the picture, price and
 * details); on the public explorer they light up together. A spot that already
 * comes with another unit is shown but can't be picked.
 */
export const UnitCompanionsSection: React.FC<UnitCompanionsSectionProps> = ({ developmentId, unit, form, set, errors, disabled }) => {
  const { t } = useTranslation('developments');
  const isExtra = isExtraUnit(form.unitType);
  const { extras, isLoading, isError, refetch } = useExtraUnits(developmentId, !isExtra);
  const toggle = (id: string) =>
    set('linkedUnitIds', form.linkedUnitIds.includes(id) ? form.linkedUnitIds.filter((x) => x !== id) : [...form.linkedUnitIds, id]);
  const errorId = 'unit-edit-companions-error';

  return (
    <fieldset className="rounded-xl border border-slate-200 p-3" aria-describedby={errors.linkedUnitIds ? errorId : undefined}>
      <legend className="flex items-center gap-1.5 px-1 text-sm font-semibold text-slate-900">
        <Link2 className="h-4 w-4 text-teal-600" aria-hidden="true" />
        {t('companions.editor.title', 'Comes with')}
      </legend>
      {isExtra ? (
        <p className="text-sm text-slate-600">
          {unit.soldWith?.length
            ? t('companions.editor.soldWith', { units: unit.soldWith.map((u) => u.unitNumber).join(', '), defaultValue: 'Sold together with {{units}}. Change it on that unit.' })
            : t('companions.editor.extraHint', 'Parking spots and storage rooms are added to an apartment from the apartment.')}
        </p>
      ) : (
        <>
          <p className="mb-2 text-xs text-slate-500">
            {t('companions.editor.hint', 'Parking spots and storage rooms sold with this unit. Buyers see them light up together on the picture.')}
          </p>
          {isLoading ? (
            <div className="h-11 animate-pulse rounded-lg bg-slate-100" aria-busy="true" />
          ) : isError ? (
            <p role="alert" className="text-sm text-red-700">
              {t('companions.editor.loadError', 'Could not load the parking spots.')}{' '}
              <button type="button" onClick={() => void refetch()} className="min-h-[44px] font-semibold underline">
                {t('companions.editor.retry', 'Try again')}
              </button>
            </p>
          ) : extras.length === 0 ? (
            <p className="text-sm text-slate-600">
              {t('companions.editor.none', 'No parking spots or storage rooms yet. Add them as units with the type Parking or Storage, then pick them here.')}
            </p>
          ) : (
            <div className="flex flex-wrap gap-2" role="group" aria-label={t('companions.editor.title', 'Comes with')}>
              {extras.map((x) => {
                const on = form.linkedUnitIds.includes(x.id);
                const takenBy = x.soldWith?.find((o) => o.id !== unit.id);
                const locked = disabled.unit || (!!takenBy && !on);
                return (
                  <label
                    key={x.id}
                    title={takenBy ? t('companions.editor.taken', { unit: takenBy.unitNumber, defaultValue: 'Comes with {{unit}}' }) : undefined}
                    className={cn(
                      'flex min-h-[44px] cursor-pointer items-center gap-2 rounded-full border px-3 text-sm',
                      on ? 'border-teal-500 bg-teal-50 text-teal-900' : 'border-slate-300 bg-white text-slate-700',
                      locked && 'cursor-not-allowed opacity-60'
                    )}
                  >
                    <input type="checkbox" checked={on} onChange={() => toggle(x.id)} disabled={locked} className="h-4 w-4" />
                    <span>
                      {t(`explorer.unitType.${x.unitType}`, x.unitType)} {x.unitNumber}
                      {takenBy && (
                        <span className="ml-1 text-xs text-slate-500">
                          · {t('companions.editor.taken', { unit: takenBy.unitNumber, defaultValue: 'Comes with {{unit}}' })}
                        </span>
                      )}
                    </span>
                  </label>
                );
              })}
            </div>
          )}
        </>
      )}
      {errors.linkedUnitIds && (
        <p id={errorId} role="alert" className="mt-2 text-sm text-red-600">
          {errors.linkedUnitIds}
        </p>
      )}
    </fieldset>
  );
};
