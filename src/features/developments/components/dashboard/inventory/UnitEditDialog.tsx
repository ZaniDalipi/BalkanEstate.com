import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from '@/src/shared/components/ui/Modal';
import { Button } from '@/src/components/ui/button';
import { useConfirmation } from '@/src/shared/hooks/useConfirmation';
import { useNotification } from '@/src/shared/hooks/useNotification';
import { useUnitAdmin } from '../../../hooks/useUnitAdmin';
import type { DashboardUnit, DevelopmentBuilding, DevelopmentFloor, UpdateUnitPayload } from '../../../types';
import { UnitEditSections } from './UnitEditBody';
import { UnitMediaSections } from './UnitMediaSections';
import { PRICE_FIELDS, editPermissions } from './permissions';
import { diffUnitForm, unitToForm, validateUnitForm, type UnitFormErrors, type UnitFormState } from './unitForm';

interface UnitEditDialogProps {
  developmentId: string;
  unit: DashboardUnit;
  role?: string;
  buildings: DevelopmentBuilding[];
  floors: DevelopmentFloor[];
  onClose: () => void;
}

type ApiError = { statusCode?: number; message?: string; details?: { field?: string } };

/**
 * Edit every unit field. Sends only the fields that changed (an emptied
 * optional field is sent as null). Fields the caller's role cannot change are
 * disabled; a 403 from the server is explained in place.
 */
export const UnitEditDialog: React.FC<UnitEditDialogProps> = ({ developmentId, unit, role, buildings, floors, onClose }) => {
  const { t } = useTranslation('developments');
  const { confirm } = useConfirmation();
  const notify = useNotification();
  const { updateUnit, isUpdating, deleteUnit, isDeleting } = useUnitAdmin(developmentId);
  const original = useMemo(() => unitToForm(unit), [unit]);
  const [form, setForm] = useState<UnitFormState>(original);
  const [errors, setErrors] = useState<UnitFormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const perms = editPermissions(role);
  const disabled = { unit: !perms.unit, price: !perms.price, availability: !perms.availability };
  const changes = diffUnitForm(original, form);
  const dirty = Object.keys(changes).length > 0;

  const set = <K extends keyof UnitFormState>(key: K, value: UnitFormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const explainForbidden = (patch: UpdateUnitPayload) => {
    const touched = Object.keys(patch);
    const priceTouched = touched.filter((k) => (PRICE_FIELDS as readonly string[]).includes(k));
    if (priceTouched.length > 0) {
      const msg = t('inventory.edit.forbiddenPrice', 'Your role is not allowed to change prices. Undo the price changes or ask an owner or manager.');
      setErrors(Object.fromEntries(priceTouched.map((k) => [k, msg])));
      return msg;
    }
    if (touched.includes('availability')) {
      setErrors({ availability: t('inventory.edit.forbiddenAvailability', 'Your role is not allowed to change availability.') });
      return t('inventory.edit.forbiddenAvailability', 'Your role is not allowed to change availability.');
    }
    return t('inventory.errors.forbidden', 'Your role is not allowed to make this change.');
  };

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const codes = validateUnitForm(form);
    if (Object.keys(codes).length > 0) {
      setErrors(Object.fromEntries(Object.entries(codes).map(([k, c]) => [k, t(`inventory.edit.errors.${c}`, c === 'required' ? 'Required' : 'Invalid value')])));
      return;
    }
    if (!dirty) return onClose();
    try {
      await updateUnit({ unitId: unit.id, patch: changes });
      void notify.success(t('inventory.edit.savedTitle', 'Unit saved'), t('inventory.edit.saved', 'Unit {{number}} was updated.', { number: form.unitNumber.trim() }));
      onClose();
    } catch (err) {
      const apiErr = err as ApiError;
      if (apiErr?.statusCode === 403) setFormError(explainForbidden(changes));
      else {
        const field = apiErr?.details?.field as keyof UnitFormState | undefined;
        if (field) setErrors({ [field]: apiErr.message });
        setFormError(apiErr?.message || t('errors.updateFailed', 'Could not save your changes.'));
      }
    }
  };

  const onDelete = async () => {
    const ok = await confirm({
      title: t('inventory.delete.title', 'Delete unit {{number}}?', { number: unit.unitNumber }),
      message: t('inventory.delete.message', 'The unit is removed from the inventory and the explorer. Linked listings are not deleted.'),
      confirmLabel: t('inventory.delete.confirm', 'Delete unit'),
      cancelLabel: t('wizard.cancel', 'Cancel'),
      type: 'danger',
    });
    if (!ok) return;
    try {
      await deleteUnit(unit.id);
      void notify.success(t('inventory.delete.doneTitle', 'Unit deleted'), t('inventory.delete.done', 'Unit {{number}} was deleted.', { number: unit.unitNumber }));
      onClose();
    } catch (err) {
      const apiErr = err as ApiError;
      setFormError(apiErr?.statusCode === 403 ? t('inventory.errors.forbidden', 'Your role is not allowed to make this change.') : apiErr?.message || t('errors.generic'));
    }
  };

  return (
    <Modal isOpen onClose={onClose} title={t('inventory.edit.title', 'Edit unit {{number}}', { number: unit.unitNumber })} size="3xl" fullScreenBreakpoint="md">
      <form onSubmit={onSave} noValidate className="space-y-4">
        {formError && (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {formError}
          </div>
        )}
        <UnitEditSections form={form} set={set} errors={errors} disabled={disabled} buildings={buildings} floors={floors} />
        <UnitMediaSections developmentId={developmentId} unit={unit} role={role} />
        <div className="sticky bottom-0 flex flex-wrap items-center gap-2 border-t border-slate-200 bg-white pt-3">
          {perms.unit && (
            <Button type="button" variant="ghost" onClick={onDelete} disabled={isDeleting} className="text-red-700 hover:bg-red-50 hover:text-red-800">
              {t('inventory.delete.confirm', 'Delete unit')}
            </Button>
          )}
          <div className="ml-auto flex gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              {t('wizard.cancel', 'Cancel')}
            </Button>
            <Button type="submit" disabled={isUpdating || !dirty}>
              {isUpdating ? t('inventory.edit.saving', 'Saving…') : t('inventory.edit.save', 'Save changes')}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
};
