import React, { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { ExternalLink, Rotate3d } from 'lucide-react';
import type { DashboardUnit } from '../../../types';
import { isUsableTourUrl } from '../../../validation/developmentValidation';
import type { UnitSectionProps } from './UnitFieldControls';

interface UnitTourFieldProps extends Pick<UnitSectionProps, 'form' | 'set' | 'errors' | 'disabled'> {
  unit: DashboardUnit;
}

/**
 * The unit's own 360° virtual tour link (Matterport, Kuula, Z360, …). When it
 * has none but a linked listing has a tour, buyers see that one, and the field
 * says so; a link here then shows instead.
 */
export const UnitTourField: React.FC<UnitTourFieldProps> = ({ unit, form, set, errors, disabled }) => {
  const { t } = useTranslation('developments');
  const id = useId();
  const value = form.virtualTourUrl.trim();
  const fromListing = !value && (unit.linkedListings ?? []).some((l) => l.hasTour);
  const helpId = `${id}-help`;
  const errorId = `${id}-err`;
  return (
    <fieldset className="rounded-xl border border-slate-200 p-3">
      <legend className="flex items-center gap-1.5 px-1 text-sm font-semibold text-slate-900">
        <Rotate3d className="h-4 w-4 text-primary" aria-hidden="true" />
        {t('inventory.tour.title', '360° virtual tour')}
      </legend>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-gray-700">
        {t('inventory.tour.label', 'Tour link')}
      </label>
      <div className="flex gap-2">
        <input
          id={id}
          type="url"
          inputMode="url"
          value={form.virtualTourUrl}
          maxLength={2000}
          onChange={(e) => set('virtualTourUrl', e.target.value)}
          disabled={disabled.unit}
          placeholder="https://my.matterport.com/show/?m=…"
          aria-invalid={errors.virtualTourUrl ? 'true' : undefined}
          aria-describedby={errors.virtualTourUrl ? errorId : helpId}
          className="min-h-[44px] w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:bg-gray-100 aria-[invalid=true]:border-red-400"
        />
        {value && isUsableTourUrl(value) && (
          <a
            href={value}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-[44px] shrink-0 items-center gap-1 rounded-lg border border-slate-300 px-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
            {t('inventory.tour.test', 'Open')}
          </a>
        )}
      </div>
      {errors.virtualTourUrl ? (
        <p id={errorId} role="alert" className="mt-1 text-sm text-red-600">{errors.virtualTourUrl}</p>
      ) : (
        <p id={helpId} className="mt-1 text-xs leading-relaxed text-slate-500">
          {fromListing
            ? t('inventory.tour.fromListing', 'Buyers see the 360° tour of the linked listing. Add a link here to show a different tour for this unit.')
            : t('inventory.tour.help', 'Paste the share link of the tour (Matterport, Kuula, Z360 or another 360° viewer). Buyers see a 360° badge on this unit and can open the tour.')}
        </p>
      )}
    </fieldset>
  );
};
