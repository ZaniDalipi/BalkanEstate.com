import React from 'react';
import { useTranslation } from 'react-i18next';
import Modal from '@/src/shared/components/ui/Modal';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/shared/components/ui/Input';
import { FormSelect } from '../../shared/FormSelect';
import { useEntranceKindLabel } from '../../shared/entranceKind';
import { ENTRANCE_KINDS, type DevelopmentEntrance, type EntranceKind } from '../../../types';
import { ENTRANCE_LIMITS } from '../../../validation/entranceValidation';
import { useEntranceForm } from './useEntranceForm';

interface EntranceDialogProps {
  developmentId: string;
  buildingId: string;
  buildingName: string;
  entrance?: DevelopmentEntrance;
  siblings: DevelopmentEntrance[];
  onClose: () => void;
  onSaved?: (entrance: DevelopmentEntrance) => void;
}

/** Add or edit an entrance: its name, short code, kind, step-free access and a note for buyers. */
export const EntranceDialog: React.FC<EntranceDialogProps> = ({ developmentId, buildingId, buildingName, entrance, siblings, onClose, onSaved }) => {
  const { t } = useTranslation('developments');
  const kindLabel = useEntranceKindLabel();
  const { form, set, errors, formError, submit, isSaving } = useEntranceForm({
    developmentId,
    buildingId,
    entrance,
    siblings,
    onDone: (saved) => {
      onSaved?.(saved);
      onClose();
    },
  });
  const noteId = React.useId();
  const title = entrance
    ? t('entrance.editTitle', { name: entrance.name, defaultValue: 'Edit {{name}}' })
    : t('entrance.addTitle', { building: buildingName, defaultValue: 'Add an entrance to {{building}}' });

  return (
    <Modal isOpen onClose={onClose} title={title} size="lg">
      <form
        noValidate
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <Input label={t('entrance.name', 'Name')} placeholder={t('entrance.namePlaceholder', 'e.g. Entrance A')} value={form.name} maxLength={ENTRANCE_LIMITS.name} onChange={(e) => set('name', e.target.value)} error={errors.name} required autoFocus />
          </div>
          <Input label={t('entrance.code', 'Short code')} placeholder="A" value={form.code} maxLength={ENTRANCE_LIMITS.code} onChange={(e) => set('code', e.target.value)} error={errors.code} />
        </div>
        <FormSelect
          label={t('entrance.kindLabel', 'Kind')}
          value={form.kind}
          onChange={(e) => set('kind', e.target.value as EntranceKind)}
          options={ENTRANCE_KINDS.map((k) => ({ value: k, label: kindLabel(k) }))}
          error={errors.kind}
        />
        <label className="flex min-h-[44px] items-center gap-3 text-sm text-slate-800">
          <input type="checkbox" className="h-5 w-5 accent-[#0252CD]" checked={form.accessible} onChange={(e) => set('accessible', e.target.checked)} />
          {t('entrance.accessible', 'Step-free access (wheelchair, pram)')}
        </label>
        <div>
          <label htmlFor={noteId} className="mb-1.5 block text-sm font-medium text-gray-700">{t('entrance.note', 'Note for buyers')}</label>
          <textarea
            id={noteId}
            rows={2}
            value={form.note}
            maxLength={ENTRANCE_LIMITS.note}
            placeholder={t('entrance.notePlaceholder', 'e.g. From the main street · concierge 8:00–20:00')}
            onChange={(e) => set('note', e.target.value)}
            aria-invalid={errors.note ? 'true' : undefined}
            aria-describedby={errors.note ? `${noteId}-error` : undefined}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          {errors.note && <p id={`${noteId}-error`} role="alert" className="mt-1 text-sm text-red-600">{errors.note}</p>}
        </div>
        {formError && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{formError}</p>}
        <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
          <Button type="button" variant="ghost" onClick={onClose}>{t('wizard.cancel', 'Cancel')}</Button>
          <Button type="submit" disabled={isSaving}>{isSaving ? t('entrance.saving', 'Saving…') : t('entrance.save', 'Save entrance')}</Button>
        </div>
      </form>
    </Modal>
  );
};
