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
import { toWebUrl } from '../../utils/webAddress';
import { useAppContext } from '@/context/AppContext';
import { useFormDraft, useDraftAutosave } from '@/src/shared/hooks/useFormDraft';
import { useSubmitGuard } from '@/src/shared/hooks/useSubmitGuard';
import { formDraftKey } from '@/src/shared/utils/formDraftStorage';

export type BasicsForm = Omit<CreateDevelopmentPayload, keyof LocationValue>;

const EMPTY: BasicsForm = { name: '', category: 'apartment_building', constructionStatus: 'planned' };
const EMPTY_LOCATION: LocationValue = { country: '', city: '', municipality: '', address: '', lat: '', lng: '' };
const EMPTY_DRAFT = { form: EMPTY, location: EMPTY_LOCATION };
type CreateDevelopmentDraft = typeof EMPTY_DRAFT;
const toNumber = (v: string) => (v.trim() ? Number(v) : undefined);

/**
 * The create form's state and submit: checks the fields, creates the
 * residence, then opens it. With a spreadsheet chosen, it opens on the
 * Inventory tab, where the import starts with that file. What is typed is
 * kept on this device until the residence is created (not the spreadsheet).
 */
export function useCreateDevelopmentForm() {
  const { t } = useTranslation('developments');
  const apiText = useApiErrorText();
  const { create, isLoading } = useCreateDevelopment();
  const { run, isSubmitting } = useSubmitGuard();
  const userId = useAppContext().state.currentUser?.id;
  const draft = useFormDraft<CreateDevelopmentDraft>(userId ? formDraftKey('development-create', userId) : null);

  const [form, setForm] = useState<BasicsForm>(draft.restored?.form ?? EMPTY);
  const [location, setLocation] = useState<LocationValue>(draft.restored?.location ?? EMPTY_LOCATION);
  const isDirty = useDraftAutosave<CreateDevelopmentDraft>(draft, { form, location }, EMPTY_DRAFT);

  const discardDraft = () => {
    draft.discard();
    setForm(EMPTY);
    setLocation(EMPTY_LOCATION);
  };
  const [errors, setErrors] = useState<CreateDevelopmentErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [sheet, setSheet] = useState<File | null>(null);

  const set = <K extends keyof BasicsForm>(key: K, value: BasicsForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const fieldError = (key: keyof CreateDevelopmentErrors): string | undefined =>
    errors[key] ? t(errors[key] as string) : undefined;

  // One send at a time: a double click must not create the residence twice
  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void run(submit);
  };

  const submit = async () => {
    setSubmitError(null);

    const validation = validateCreateDevelopment({ ...form, country: location.country, city: location.city });
    setErrors(validation);
    if (Object.keys(validation).length > 0) return;

    try {
      const { development } = await create({
        ...form,
        // Typed without https://; saved with it.
        website: toWebUrl(form.website) || undefined,
        name: form.name.trim(),
        country: location.country.trim(),
        city: location.city.trim(),
        address: location.address.trim() || undefined,
        lat: toNumber(location.lat),
        lng: toNumber(location.lng),
      });
      draft.finish();
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

  return {
    form, set, location, setLocation, fieldError, submitError, sheet, setSheet, onSubmit,
    isLoading: isLoading || isSubmitting,
    draftSavedAt: draft.restoredAt, discardDraft,
    leaveGuard: { dirty: isDirty, bypassRef: draft.stoppedRef, onDiscard: draft.finish },
  };
}
