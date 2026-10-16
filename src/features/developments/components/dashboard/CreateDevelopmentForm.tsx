import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { navigate, goBack } from '@/src/app/router/navigation';
import { paths } from '@/src/app/router/paths';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/shared/components/ui/Input';
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
  return !!e && (e.statusCode === 403 && !!e.details?.subscriptionRequired);
};

const EMPTY: CreateDevelopmentPayload = {
  name: '',
  country: '',
  city: '',
  category: 'apartment_building',
  constructionStatus: 'planned',
};

/**
 * Step 1 of the development wizard: basic information. Creating is gated on an
 * active subscription plan server-side; a subscription error routes the user to
 * the pricing page. Further steps (buildings, floors, units, media) are done in
 * the development's dashboard after it exists.
 */
const CreateDevelopmentForm: React.FC = () => {
  const { t } = useTranslation('developments');
  const { create, isLoading } = useCreateDevelopment();

  const [form, setForm] = useState<CreateDevelopmentPayload>(EMPTY);
  const [errors, setErrors] = useState<CreateDevelopmentErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [needsPlan, setNeedsPlan] = useState(false);

  const set = <K extends keyof CreateDevelopmentPayload>(key: K, value: CreateDevelopmentPayload[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
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
      });
      navigate(paths.developmentManage(development._id));
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

      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <Input
          label={t('wizard.name')}
          placeholder={t('wizard.namePlaceholder')}
          value={form.name}
          onChange={(e) => set('name', e.target.value)}
          error={fieldError('name')}
          required
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label={t('wizard.country')}
            value={form.country}
            onChange={(e) => set('country', e.target.value)}
            error={fieldError('country')}
            required
          />
          <Input
            label={t('wizard.city')}
            value={form.city}
            onChange={(e) => set('city', e.target.value)}
            error={fieldError('city')}
            required
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block w-full">
            <span className="mb-1.5 block text-sm font-medium text-gray-700">{t('wizard.category')}</span>
            <select
              value={form.category}
              onChange={(e) => set('category', e.target.value as DevelopmentCategory)}
              className="min-h-[44px] w-full rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:min-h-[40px]"
            >
              {DEVELOPMENT_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {t(`category.${c}`)}
                </option>
              ))}
            </select>
          </label>

          <label className="block w-full">
            <span className="mb-1.5 block text-sm font-medium text-gray-700">{t('wizard.constructionStatus')}</span>
            <select
              value={form.constructionStatus}
              onChange={(e) => set('constructionStatus', e.target.value as DevelopmentConstructionStatus)}
              className="min-h-[44px] w-full rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:min-h-[40px]"
            >
              {DEVELOPMENT_CONSTRUCTION_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {t(`construction.${s}`)}
                </option>
              ))}
            </select>
          </label>
        </div>

        <Input
          label={t('wizard.website')}
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
                className="mt-2 font-medium underline underline-offset-2"
              >
                {t('wizard.title')}
              </button>
            )}
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-2">
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
