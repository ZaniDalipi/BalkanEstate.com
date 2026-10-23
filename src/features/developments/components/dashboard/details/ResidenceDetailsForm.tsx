import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/src/components/ui/button';
import { useNotification } from '@/src/shared/hooks/useNotification';
import { useUpdateDevelopment } from '../../../hooks/useDevelopmentMutations';
import type { Development } from '../../../types';
import { validateDevelopmentDetails, type DetailsErrors } from '../../../validation/developmentValidation';
import { AmenitiesInput } from './AmenitiesInput';
import { AboutSection, ContactSection, Fieldset } from './DetailsSections';
import { LocationFields } from './LocationFields';
import { changedFields, toDraft, type DetailsDraft } from './detailsDraft';

interface ResidenceDetailsFormProps {
  development: Development;
  canEdit: boolean;
}

/**
 * Edit everything about a residence after it was created: name, type, stage,
 * description, location (including exact map coordinates), amenities and the
 * sales contact. Only changed fields are sent; the server re-validates and
 * re-checks permissions. After a save the form compares against what the
 * server returned and says so inline (no modal in the way).
 */
export const ResidenceDetailsForm: React.FC<ResidenceDetailsFormProps> = ({ development, canEdit }) => {
  const { t } = useTranslation('developments');
  const notify = useNotification();
  const { update, isLoading } = useUpdateDevelopment(development.id);
  const [baseline, setBaseline] = useState<Development>(development);
  const [draft, setDraft] = useState<DetailsDraft>(() => toDraft(development));
  const [errors, setErrors] = useState<DetailsErrors>({});
  const [saved, setSaved] = useState(false);

  const changes = useMemo(() => changedFields(draft, baseline), [draft, baseline]);
  const dirty = Object.keys(changes).length > 0;
  const disabled = !canEdit || isLoading;
  const set = (patch: Partial<DetailsDraft>) => {
    setSaved(false);
    setDraft((prev) => ({ ...prev, ...patch }));
  };
  const messages = Object.fromEntries(Object.entries(errors).map(([k, v]) => [k, t(v as string)])) as DetailsErrors;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validateDevelopmentDetails(draft);
    setErrors(validation);
    if (Object.keys(validation).length > 0 || !dirty) return;
    try {
      const { development: next } = await update(changes);
      setBaseline(next);
      setDraft(toDraft(next));
      setSaved(true);
    } catch (err) {
      void notify.error(
        t('errors.updateFailed', 'Could not save your changes.'),
        (err as { message?: string })?.message || t('errors.generic', 'Something went wrong.'),
      );
    }
  };

  return (
    <section aria-labelledby="details-heading" className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
      <h2 id="details-heading" className="text-base font-semibold text-slate-900">
        {t('details.heading', 'Residence details')}
      </h2>
      <p className="mb-5 mt-1 text-sm text-slate-600">
        {canEdit
          ? t('details.intro', 'What buyers see about this residence.')
          : t('details.readOnly', 'Only owners and admins can change these details.')}
      </p>
      <form onSubmit={onSubmit} noValidate className="space-y-6">
        <AboutSection draft={draft} set={set} errors={messages} disabled={disabled} />
        <Fieldset legend={t('details.location', 'Location')}>
          <LocationFields value={draft} onChange={set} errors={messages} disabled={disabled} detailed />
        </Fieldset>
        <Fieldset legend={t('details.amenities', 'Amenities')}>
          <AmenitiesInput value={draft.amenities} onChange={(amenities) => set({ amenities })} disabled={disabled} hideLabel />
        </Fieldset>
        <ContactSection draft={draft} set={set} errors={messages} disabled={disabled} />
        {canEdit && (
          <div className="sticky bottom-0 -mx-4 flex items-center justify-end gap-3 border-t border-slate-200 bg-white px-4 py-3 sm:-mx-5 sm:px-5">
            <span role="status" className="mr-auto text-sm text-slate-600">
              {dirty ? t('details.unsaved', 'You have unsaved changes.') : saved ? t('details.saved', 'The residence details were updated.') : null}
            </span>
            <Button
              type="button"
              variant="ghost"
              disabled={!dirty || isLoading}
              onClick={() => {
                setDraft(toDraft(baseline));
                setErrors({});
              }}
            >
              {t('details.discard', 'Discard')}
            </Button>
            <Button type="submit" disabled={!dirty || isLoading}>
              {isLoading ? t('details.saving', 'Saving…') : t('details.save', 'Save details')}
            </Button>
          </div>
        )}
      </form>
    </section>
  );
};
