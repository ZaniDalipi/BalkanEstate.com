import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNotification } from '@/src/shared/hooks/useNotification';
import { useApiErrorText } from '../../../hooks/useApiErrorText';
import { useUnitAdmin } from '../../../hooks/useUnitAdmin';
import { useListingAttachment } from '../../../hooks/useDevelopmentMutations';
import type { DashboardUnit, DevelopmentFloor, UnitPrefill, UpdateUnitPayload } from '../../../types';
import type { FilledFrom } from './FillFromListing';
import { PRICE_FIELDS, editPermissions } from './permissions';
import { applyPrefill, diffUnitForm, unitToForm, validateUnitForm, type UnitFormErrors, type UnitFormState } from './unitForm';

/** Server field names that are fields of this form; anything else is shown as a form-level message only. */
const isFormField = (field: string | undefined, form: UnitFormState): field is keyof UnitFormState => !!field && field in form;

/** The listing the form was filled from, and whether to link it on save. */
export interface PrefillSource extends FilledFrom {
  listingId: string;
  /** The form before filling, for "Undo". */
  before: UnitFormState;
}

/**
 * State and actions of the unit editor: the form, validation, filling from a
 * listing, and saving (only changed fields; then linking the listing when
 * asked). Server errors are mapped onto fields or a form-level message.
 */
export const useUnitEditor = (developmentId: string, unit: DashboardUnit, role: string | undefined, floors: DevelopmentFloor[]) => {
  const { t } = useTranslation('developments');
  const notify = useNotification();
  const apiText = useApiErrorText();
  const { updateUnit, isUpdating } = useUnitAdmin(developmentId);
  const { attach, isAttaching } = useListingAttachment(developmentId);
  const original = useMemo(() => unitToForm(unit), [unit]);
  const [form, setForm] = useState<UnitFormState>(original);
  const [errors, setErrors] = useState<UnitFormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [source, setSource] = useState<PrefillSource | null>(null);
  const perms = editPermissions(role);
  const changes = diffUnitForm(original, form);
  const wantsLink = !!source?.link && !unit.linkedListings?.some((l) => l.id === source.listingId);
  const dirty = Object.keys(changes).length > 0 || wantsLink;

  const set = <K extends keyof UnitFormState>(key: K, value: UnitFormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const fillFrom = (prefill: UnitPrefill, canLink: boolean) => {
    const result = applyPrefill(form, prefill, floors);
    setSource({ listingId: prefill.listing.id, title: prefill.listing.title, filled: result.filled.length, skipped: prefill.skipped, link: canLink, before: form });
    setForm(result.form);
    setErrors({});
  };
  const undoFill = () => {
    if (source) setForm(source.before);
    setSource(null);
  };
  const setLink = (link: boolean) => setSource((s) => (s ? { ...s, link } : s));

  const explainForbidden = (patch: UpdateUnitPayload): string => {
    const priceTouched = Object.keys(patch).filter((k) => (PRICE_FIELDS as readonly string[]).includes(k) && k !== 'currency');
    if (priceTouched.length > 0) {
      const msg = t('inventory.edit.forbiddenPrice', 'Your role is not allowed to change prices. Undo the price changes or ask an owner or manager.');
      setErrors(Object.fromEntries(priceTouched.map((k) => [k, msg])));
      return msg;
    }
    if ('availability' in patch) {
      const msg = t('inventory.edit.forbiddenAvailability', 'Your role is not allowed to change availability.');
      setErrors({ availability: msg });
      return msg;
    }
    return t('inventory.errors.forbidden', 'Your role is not allowed to make this change.');
  };

  /** Validate, save the changes, then link the listing if asked. Resolves true when everything succeeded. */
  const save = async (): Promise<boolean> => {
    setFormError(null);
    const codes = validateUnitForm(form, original);
    if (Object.keys(codes).length > 0) {
      setErrors(Object.fromEntries(Object.entries(codes).map(([k, c]) => [k, t(`inventory.edit.errors.${c}`, c === 'required' ? 'Required' : 'Invalid value')])));
      return false;
    }
    if (Object.keys(changes).length > 0) {
      try {
        await updateUnit({ unitId: unit.id, patch: changes });
      } catch (err) {
        const { text, field, code, status } = apiText.describe(err);
        // A 403 without a more precise code: say which of the changed fields the role may not touch.
        if (status === 403 && (!code || code === 'FORBIDDEN' || code === 'FORBIDDEN_FIELDS')) setFormError(explainForbidden(changes));
        else {
          if (isFormField(field, form)) setErrors({ [field]: text });
          setFormError(text);
        }
        return false;
      }
    }
    if (wantsLink && source) {
      try {
        await attach({ unitId: unit.id, listingId: source.listingId });
      } catch (err) {
        setFormError(
          t('inventory.edit.linkFailed', {
            reason: apiText.text(err),
            defaultValue: 'The unit was saved, but the listing could not be linked: {{reason}}',
          })
        );
        setSource((s) => (s ? { ...s, link: false } : s));
        return false;
      }
    }
    void notify.success(t('inventory.edit.savedTitle', 'Unit saved'), t('inventory.edit.saved', 'Unit {{number}} was updated.', { number: form.unitNumber.trim() }));
    return true;
  };

  return { form, set, errors, formError, setFormError, perms, dirty, save, isSaving: isUpdating || isAttaching, source, fillFrom, undoFill, setLink };
};
