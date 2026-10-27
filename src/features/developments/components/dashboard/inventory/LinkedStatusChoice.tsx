import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link2 } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import type { DashboardUnit } from '../../../types';
import { useExtraUnits } from '../../../hooks/useExtraUnits';
import type { UnitSectionProps } from './UnitFieldControls';

interface LinkedStatusChoiceProps extends Pick<UnitSectionProps, 'form' | 'set' | 'disabled'> {
  developmentId: string;
  unit: DashboardUnit;
}

/**
 * When the apartment's status changes (e.g. to Sold), the seller decides,
 * spot by spot, whether the parking spots / storage rooms it comes with change
 * too. Nothing is ticked by default: a spot sold separately stays as it is.
 */
export const LinkedStatusChoice: React.FC<LinkedStatusChoiceProps> = ({ developmentId, unit, form, set, disabled }) => {
  const { t } = useTranslation('developments');
  const changed = form.availability !== unit.availability;
  const linked = form.linkedUnitIds;
  const { extras } = useExtraUnits(developmentId, changed && linked.length > 0);
  if (!changed || linked.length === 0) return null;

  const status = t(`availability.${form.availability}`);
  const spots = linked.map((id) => extras.find((x) => x.id === id) ?? { id, unitNumber: '…', unitType: 'parking', availability: undefined });
  const toggle = (id: string) =>
    set('alsoLinkedUnitIds', form.alsoLinkedUnitIds.includes(id) ? form.alsoLinkedUnitIds.filter((x) => x !== id) : [...form.alsoLinkedUnitIds, id]);

  return (
    <fieldset className="rounded-xl border border-dashed border-teal-400 bg-teal-50/40 p-3">
      <legend className="flex items-center gap-1.5 px-1 text-sm font-semibold text-slate-900">
        <Link2 className="h-4 w-4 text-teal-600" aria-hidden="true" />
        {t('companions.status.title', 'Its parking and storage')}
      </legend>
      <p className="mb-2 text-sm text-slate-700">
        {t('companions.status.question', { status, defaultValue: 'This unit comes with the spots below. Tick the ones that are {{status}} with it.' })}
      </p>
      <div className="space-y-2">
        {spots.map((x) => {
          const already = x.availability === form.availability;
          const on = form.alsoLinkedUnitIds.includes(x.id);
          return (
            <label
              key={x.id}
              className={cn('flex min-h-[44px] cursor-pointer items-center gap-3 rounded-lg border bg-white px-3 text-sm', on ? 'border-teal-500' : 'border-slate-300', (disabled.availability || already) && 'cursor-not-allowed opacity-60')}
            >
              <input type="checkbox" checked={on || already} disabled={disabled.availability || already} onChange={() => toggle(x.id)} className="h-4 w-4" />
              <span className="flex-1">
                {t('companions.status.alsoMark', {
                  unit: `${t(`explorer.unitType.${x.unitType}`, x.unitType)} ${x.unitNumber}`,
                  status,
                  defaultValue: 'Also mark {{unit}} as {{status}}',
                })}
              </span>
              {x.availability && (
                <span className="text-xs text-slate-500">
                  {already
                    ? t('companions.status.already', 'Already')
                    : t('companions.status.now', { status: t(`availability.${x.availability}`), defaultValue: 'Now {{status}}' })}
                </span>
              )}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
};
