import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { navigate, goBack } from '@/src/app/router/navigation';
import { paths } from '@/src/app/router/paths';
import { BALKAN_LOCATIONS, type CityData } from '@/utils/balkanLocations';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/shared/components/ui/Input';
import { FormSelect } from '../shared/FormSelect';
import { useCreateDevelopment } from '../../hooks';
import {
  DEVELOPMENT_CATEGORIES,
  DEVELOPMENT_CONSTRUCTION_STATUSES,
  type CreateDevelopmentPayload,
  type DevelopmentCategory,
  type DevelopmentConstructionStatus,
} from '../../types';
import { validateCreateDevelopment, type CreateDevelopmentErrors } from '../../validation/developmentValidation';

type ApiError = { statusCode?: number; details?: { subscriptionRequired?: boolean } };

const isSubscriptionError = (err: unknown): boolean => {
  const e = err as ApiError | null;
  return !!e && e.statusCode === 403 && !!e.details?.subscriptionRequired;
};

const EMPTY: CreateDevelopmentPayload = {
  name: '',
  country: '',
  city: '',
  address: '',
  category: 'apartment_building',
  constructionStatus: 'planned',
};

/**
 * Step 1 of the development wizard: basic information.
 *
 * Location uses the app's standard Balkan country/city catalog: a country
 * dropdown drives a dependent city dropdown, and picking a city auto-fills the
 * coordinates and a default address — the same pattern as the listing and
 * business-listing forms, so it is consistent and professional. Creating is
 * gated on an active subscription plan server-side; a subscription error routes
 * the user to pricing.
 */
const CreateDevelopmentForm: React.FC = () => {
  const { t } = useTranslation('developments');
  const { create, isLoading } = useCreateDevelopment();

  const [form, setForm] = useState<CreateDevelopmentPayload>(EMPTY);
  const [cities, setCities] = useState<CityData[]>([]);
  const [errors, setErrors] = useState<CreateDevelopmentErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [needsPlan, setNeedsPlan] = useState(false);

  const set = <K extends keyof CreateDevelopmentPayload>(key: K, value: CreateDevelopmentPayload[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const countryOptions = useMemo(
    () => BALKAN_LOCATIONS.map((c) => ({ value: c.name, label: c.name })),
    []
  );
  const cityOptions = useMemo(() => cities.map((c) => ({ value: c.name, label: c.name })), [cities]);

  const onCountryChange = (country: string) => {
    const match = BALKAN_LOCATIONS.find((c) => c.name === country);
    setCities(match?.cities ?? []);
    // Reset dependent fields when the country changes.
    setForm((prev) => ({ ...prev, country, city: '', lat: undefined, lng: undefined, address: '' }));
  };

  const onCityChange = (cityName: string) => {
    const city = cities.find((c) => c.name === cityName);
    setForm((prev) => ({
      ...prev,
      city: cityName,
      lat: city?.lat,
      lng: city?.lng,
      address: city ? `${cityName}, ${prev.country}` : prev.address,
    }));
  };

  const fieldError = (key: keyof CreateDevelopmentErrors): string | undefined =>
    errors[key] ? t(errors[key] as string) : undefined;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setNeedsPlan(false);

    const validation = validateCreateDevelopment(form);
    setErrors(validation);
    if (Object.keys(validation).length > 0) return;

    try {
      const { development } = await create({
        ...form,
        name: form.name.trim(),
        country: form.country.trim(),
        city: form.city.trim(),
        address: form.address?.trim() || undefined,
      });
      navigate(paths.developmentManage(development.id));
    } catch (err) {
      if (isSubscriptionError(err)) {
        setNeedsPlan(true);
        setSubmitError(t('errors.subscriptionRequired'));
      } else {
        setSubmitError(t('errors.createFailed'));
      }
    }
  };

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">{t('wizard.title')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('wizard.basics')}</p>
      </header>

      <form onSubmit={onSubmit} className="rounded-2xl border border-border bg-card p-5 space-y-5" noValidate>
        <Input
          label={t('wizard.name')}
          placeholder={t('wizard.namePlaceholder')}
          value={form.name}
          onChange={(e) => set('name', e.target.value)}
          error={fieldError('name')}
          required
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormSelect
            label={t('wizard.country')}
            placeholder={t('wizard.selectCountry')}
            options={countryOptions}
            value={form.country}
            onChange={(e) => onCountryChange(e.target.value)}
            error={fieldError('country')}
            required
          />
          <FormSelect
            label={t('wizard.city')}
            placeholder={form.country ? t('wizard.selectCity') : t('wizard.selectCountryFirst')}
            options={cityOptions}
            value={form.city}
            onChange={(e) => onCityChange(e.target.value)}
            error={fieldError('city')}
            disabled={!form.country}
            required
          />
        </div>

        <Input
          label={t('wizard.address')}
          value={form.address ?? ''}
          onChange={(e) => set('address', e.target.value)}
          helperText={t('wizard.addressHelper')}
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
            className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200"
          >
            <p>{submitError}</p>
            {needsPlan && (
              <button
                type="button"
                onClick={() => navigate(paths.pricing())}
                className="mt-2 font-semibold underline underline-offset-2"
              >
                {t('errors.viewPlans')}
              </button>
            )}
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
