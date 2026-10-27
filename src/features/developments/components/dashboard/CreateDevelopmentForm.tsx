import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { navigate, goBack } from '@/src/app/router/navigation';
import { paths } from '@/src/app/router/paths';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/shared/components/ui/Input';
import { FormSelect } from '../shared/FormSelect';
import { LocationFields } from './details/LocationFields';
import type { LocationValue } from './details/useLocationFields';
import { useCreateDevelopment } from '../../hooks';
import {
  DEVELOPMENT_CATEGORIES,
  DEVELOPMENT_CONSTRUCTION_STATUSES,
  type CreateDevelopmentPayload,
  type DevelopmentCategory,
  type DevelopmentConstructionStatus,
} from '../../types';
import { validateCreateDevelopment, type CreateDevelopmentErrors } from '../../validation/developmentValidation';
import { useApiErrorText } from '../../hooks/useApiErrorText';

type BasicsForm = Omit<CreateDevelopmentPayload, keyof LocationValue>;

const EMPTY: BasicsForm = { name: '', category: 'apartment_building', constructionStatus: 'planned' };
const EMPTY_LOCATION: LocationValue = { country: '', city: '', municipality: '', address: '', lat: '', lng: '' };
const toNumber = (v: string) => (v.trim() ? Number(v) : undefined);

/**
 * Step 1 of the development wizard: basic information.
 *
 * Location uses the shared `LocationFields` (the same fields as the edit form
 * in Settings): a country dropdown drives a dependent city dropdown, and
 * picking a city auto-fills the coordinates and a default address, and the map
 * pin below lets the owner place the residence exactly before creating it.
 * Creating is free; the Residence Pass applies when it is published.
 */
const CreateDevelopmentForm: React.FC = () => {
  const { t } = useTranslation('developments');
  const apiText = useApiErrorText();
  const { create, isLoading } = useCreateDevelopment();

  const [form, setForm] = useState<BasicsForm>(EMPTY);
  const [location, setLocation] = useState<LocationValue>(EMPTY_LOCATION);
  const [errors, setErrors] = useState<CreateDevelopmentErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  const set = <K extends keyof BasicsForm>(key: K, value: BasicsForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const fieldError = (key: keyof CreateDevelopmentErrors): string | undefined =>
    errors[key] ? t(errors[key] as string) : undefined;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    const validation = validateCreateDevelopment({ ...form, country: location.country, city: location.city });
    setErrors(validation);
    if (Object.keys(validation).length > 0) return;

    try {
      const { development } = await create({
        ...form,
        name: form.name.trim(),
        country: location.country.trim(),
        city: location.city.trim(),
        address: location.address.trim() || undefined,
        lat: toNumber(location.lat),
        lng: toNumber(location.lng),
      });
      navigate(paths.developmentManage(development.id));
    } catch (err) {
      // Creating is free (the Residence Pass applies when publishing), so any
      // refusal here is about the form itself.
      const { text, status } = apiText.describe(err);
      setSubmitError(status === 400 || status === undefined ? text : t('errors.createFailed'));
    }
  };

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">{t('wizard.title')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('wizard.basics')}</p>
        <p className="mt-2 text-sm text-slate-600">
          {t('billing.createNote', 'Free to set up. Publishing starts a free 15-day trial; after it, a Residence Pass keeps it online.')}
        </p>
      </header>

      <form onSubmit={onSubmit} className="rounded-2xl border border-border bg-white p-5 space-y-5" noValidate>
        <Input
          label={t('wizard.name')}
          placeholder={t('wizard.namePlaceholder')}
          value={form.name}
          onChange={(e) => set('name', e.target.value)}
          error={fieldError('name')}
          required
        />

        <LocationFields
          value={location}
          onChange={(patch) => setLocation((prev) => ({ ...prev, ...patch }))}
          errors={{ country: fieldError('country'), city: fieldError('city') }}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormSelect
            label={t('wizard.category')}
            options={DEVELOPMENT_CATEGORIES.map((c) => ({ value: c, label: t(`category.${c}`) }))}
            value={form.category}
            onChange={(e) => set('category', e.target.value as DevelopmentCategory)}
            required
          />
          <FormSelect
            label={t('wizard.constructionStatus')}
            options={DEVELOPMENT_CONSTRUCTION_STATUSES.map((s) => ({ value: s, label: t(`construction.${s}`) }))}
            value={form.constructionStatus}
            onChange={(e) => set('constructionStatus', e.target.value as DevelopmentConstructionStatus)}
            required
          />
        </div>

        <Input
          label={t('wizard.website')}
          placeholder="https://"
          value={form.website ?? ''}
          onChange={(e) => set('website', e.target.value)}
          inputMode="url"
        />

        {submitError && (
          <div
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          >
            <p>{submitError}</p>
          </div>
        )}

        <div className="flex items-center justify-end gap-3 border-t border-border pt-4">
          <Button type="button" variant="ghost" onClick={() => goBack(paths.developmentsDashboard())}>
            {t('wizard.cancel')}
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? t('wizard.creating') : t('wizard.submit')}
          </Button>
        </div>
      </form>
    </main>
  );
};

export default CreateDevelopmentForm;
