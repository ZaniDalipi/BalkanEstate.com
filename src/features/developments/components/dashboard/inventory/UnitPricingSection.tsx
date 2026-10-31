import React from 'react';
import { useTranslation } from 'react-i18next';
import { Lock } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { UNIT_FEATURES } from '../../../types';
import { NumberField, SelectField, type UnitSectionProps } from './UnitFieldControls';

/** Price, currency, price per m² and whether the price is public. */
export const UnitPricingSection: React.FC<UnitSectionProps> = (p) => {
  const { t } = useTranslation('developments');
  const d = p.disabled.price;
  return (
    <fieldset className="rounded-xl border border-slate-200 p-3">
      <legend className="px-1 text-sm font-semibold text-slate-900">{t('inventory.edit.pricing', 'Pricing')}</legend>
      <p className="mb-2 text-xs text-slate-600">{t('inventory.edit.euroOnly', 'All prices are in euros (€).')}</p>
      {d && (
        <p className="mb-2 flex items-center gap-1.5 text-xs text-slate-600">
          <Lock className="h-3.5 w-3.5" aria-hidden="true" />
          {t('inventory.edit.priceLocked', 'Your role cannot change prices.')}
        </p>
      )}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <NumberField {...p} name="price" label={t('unit.price', 'Price')} suffix="€" step="1" disabled={d} />
        <NumberField {...p} name="pricePerSqm" label={t('inventory.edit.pricePerSqm', 'Price per m²')} suffix="€" step="1" disabled={d} />
        <SelectField
          {...p}
          name="priceVisibility"
          label={t('inventory.edit.priceVisibility', 'Price shown to buyers')}
          disabled={d}
          options={[
            { value: 'public', label: t('inventory.edit.pricePublic', 'Show price') },
            { value: 'on_request', label: t('unit.priceOnRequest', 'Price on request') },
          ]}
        />
      </div>
    </fieldset>
  );
};

/** Feature flags (checkbox group) and the free-text description. */
export const UnitDetailsSection: React.FC<UnitSectionProps> = ({ form, set, errors, disabled }) => {
  const { t } = useTranslation('developments');
  const toggle = (f: string) =>
    set('features', form.features.includes(f) ? form.features.filter((x) => x !== f) : [...form.features, f]);

  return (
    <fieldset className="rounded-xl border border-slate-200 p-3">
      <legend className="px-1 text-sm font-semibold text-slate-900">{t('inventory.edit.details', 'Features & description')}</legend>
      <div className="flex flex-wrap gap-2" role="group" aria-label={t('inventory.edit.features', 'Features')}>
        {UNIT_FEATURES.map((f) => {
          const on = form.features.includes(f);
          return (
            <label
              key={f}
              className={cn(
                'flex min-h-[44px] cursor-pointer items-center gap-2 rounded-full border px-3 text-sm sm:min-h-[36px]',
                on ? 'border-primary bg-primary/10 text-primary' : 'border-slate-300 bg-white text-slate-700',
                disabled.unit && 'cursor-not-allowed opacity-60'
              )}
            >
              <input type="checkbox" checked={on} onChange={() => toggle(f)} disabled={disabled.unit} className="h-4 w-4" />
              {t(`feature.${f}`)}
            </label>
          );
        })}
      </div>
      <label htmlFor="unit-edit-description" className="mb-1.5 mt-3 block text-sm font-medium text-gray-700">
        {t('inventory.edit.description', 'Description')}
      </label>
      <textarea
        id="unit-edit-description"
        rows={4}
        maxLength={5000}
        value={form.description}
        onChange={(e) => set('description', e.target.value)}
        disabled={disabled.unit}
        aria-invalid={errors.description ? 'true' : undefined}
        className="w-full rounded-lg border border-slate-300 bg-white p-3 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:bg-gray-100"
      />
      {errors.description && <p className="mt-1 text-sm text-red-600">{errors.description}</p>}
    </fieldset>
  );
};
