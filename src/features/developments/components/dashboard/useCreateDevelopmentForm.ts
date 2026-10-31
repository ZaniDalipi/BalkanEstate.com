import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { navigate } from '@/src/app/router/navigation';
import { paths } from '@/src/app/router/paths';
import type { LocationValue } from './details/useLocationFields';
import { useCreateDevelopment } from '../../hooks';
import type { CreateDevelopmentPayload } from '../../types';
import { validateCreateDevelopment, type CreateDevelopmentErrors } from '../../validation/developmentValidation';
import { useApiErrorText } from '../../hooks/useApiErrorText';
import { holdImportFile } from './inventory/import/pendingImport';

export type BasicsForm = Omit<CreateDevelopmentPayload, keyof LocationValue>;

const EMPTY: BasicsForm = { name: '', category: 'apartment_building', constructionStatus: 'planned' };
const EMPTY_LOCATION: LocationValue = { country: '', city: '', municipality: '', address: '', lat: '', lng: '' };
const toNumber = (v: string) => (v.trim() ? Number(v) : undefined);

/**
 * The create form's state and submit: checks the fields, creates the
 * residence, then opens it. With a spreadsheet chosen, it opens on the
 * Inventory tab, where the import starts with that file.
 */
export function useCreateDevelopmentForm() {
  const { t } = useTranslation('developments');
  const apiText = useApiErrorText();
  const { create, isLoading } = useCreateDevelopment();

  const [form, setForm] = useState<BasicsForm>(EMPTY);
  const [location, setLocation] = useState<LocationValue>(EMPTY_LOCATION);
  const [errors, setErrors] = useState<CreateDevelopmentErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [sheet, setSheet] = useState<File | null>(null);

  const set = <K extends keyof BasicsForm>(key: K, value: BasicsForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const fieldError = (key: keyof CreateDevelopmentErrors): string | undefined =>
    errors[key] ? t(errors[key] as string) : undefined;

  const onSubmit = async (e: FormEvent) => {
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
      if (sheet) {
        holdImportFile(development.id, sheet);
        navigate(`${paths.developmentManage(development.id)}?tab=inventory`);
      } else navigate(paths.developmentManage(development.id));
    } catch (err) {
      // Creating is free (the Residence Pass applies when publishing), so any
      // refusal here is about the form itself.
      const { text, status } = apiText.describe(err);
      setSubmitError(status === 400 || status === undefined ? text : t('errors.createFailed'));
    }
  };

  return { form, set, location, setLocation, fieldError, submitError, sheet, setSheet, onSubmit, isLoading };
}
