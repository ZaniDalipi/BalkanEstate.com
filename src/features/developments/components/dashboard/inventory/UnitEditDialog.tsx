import React from 'react';
import { useTranslation } from 'react-i18next';
import Modal from '@/src/shared/components/ui/Modal';
import { Button } from '@/src/components/ui/button';
import { useConfirmation } from '@/src/shared/hooks/useConfirmation';
import { useNotification } from '@/src/shared/hooks/useNotification';
import { useUnitAdmin } from '../../../hooks/useUnitAdmin';
import type { DashboardUnit, DevelopmentBuilding, DevelopmentFloor } from '../../../types';
import { FillFromListing } from './FillFromListing';
import { UnitEditSections } from './UnitEditBody';
import { UnitMediaSections } from './UnitMediaSections';
import { roleCan } from './permissions';
import { useUnitEditor } from './useUnitEditor';

interface UnitEditDialogProps {
  developmentId: string;
  unit: DashboardUnit;
  role?: string;
  buildings: DevelopmentBuilding[];
  floors: DevelopmentFloor[];
  onClose: () => void;
}

/**
 * Edit every unit field, or fill them from one of your listings. Sends only
 * the fields that changed. Fields the caller's role cannot change are
 * disabled; server errors are explained in place (see useUnitEditor).
 */
export const UnitEditDialog: React.FC<UnitEditDialogProps> = ({ developmentId, unit, role, buildings, floors, onClose }) => {
  const { t } = useTranslation('developments');
  const { confirm } = useConfirmation();
  const notify = useNotification();
  const { deleteUnit, isDeleting } = useUnitAdmin(developmentId);
  const editor = useUnitEditor(developmentId, unit, role, floors);
  const { perms } = editor;
  const disabled = { unit: !perms.unit, price: !perms.price, availability: !perms.availability };

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editor.dirty) return onClose();
    if (await editor.save()) onClose();
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
      const apiErr = err as { statusCode?: number; message?: string };
      editor.setFormError(apiErr?.statusCode === 403 ? t('inventory.errors.forbidden', 'Your role is not allowed to make this change.') : apiErr?.message || t('errors.generic'));
    }
  };

  return (
    <Modal isOpen onClose={onClose} title={t('inventory.edit.title', 'Edit unit {{number}}', { number: unit.unitNumber })} size="3xl" fullScreenBreakpoint="md">
      <form onSubmit={onSave} noValidate className="space-y-4">
        {editor.formError && (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {editor.formError}
          </div>
        )}
        {perms.unit && (
          <FillFromListing
            developmentId={developmentId}
            source={editor.source}
            canLink={roleCan(role, 'listing.attach')}
            disabled={editor.isSaving}
            onFill={editor.fillFrom}
            onUndo={editor.undoFill}
            onLinkChange={editor.setLink}
          />
        )}
        <UnitEditSections developmentId={developmentId} form={editor.form} set={editor.set} errors={editor.errors} disabled={disabled} buildings={buildings} floors={floors} />
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
            <Button type="submit" disabled={editor.isSaving || !editor.dirty}>
              {editor.isSaving ? t('inventory.edit.saving', 'Saving…') : t('inventory.edit.save', 'Save changes')}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
};
