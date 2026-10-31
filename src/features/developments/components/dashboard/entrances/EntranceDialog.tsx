import React from 'react';
import { useTranslation } from 'react-i18next';
import Modal from '@/src/shared/components/ui/Modal';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/shared/components/ui/Input';
import { FormSelect } from '../../shared/FormSelect';
import { ToggleSwitch } from '../../shared/ToggleSwitch';
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
  const switchId = React.useId();
  const title = entrance
    ? t('entrance.editTitle', { name: entrance.name, defaultValue: 'Edit {{name}}' })
    : t('entrance.addTitle', { building: buildingName, defaultValue: 'Add an entrance to {{building}}' });

  return (
    <Modal isOpen onClose={onClose} title={title} size="lg">
      <form
        noValidate
        className="space-y-5"
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
        {/* A grouped settings row, iOS style: the label on the left, the switch on the right. */}
        <div className="flex items-center justify-between gap-4 rounded-xl border border-gray-200 bg-gray-50 py-1.5 pl-4 pr-2">
          <label htmlFor={switchId} className="cursor-pointer py-2 text-sm font-medium text-gray-800">
            {t('entrance.accessible', 'Step-free access (wheelchair, pram)')}
          </label>
          <ToggleSwitch id={switchId} checked={form.accessible} onChange={(v) => set('accessible', v)} />
        </div>
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
            className={`block w-full resize-y rounded-lg border bg-transparent px-3 py-2.5 text-base transition-colors duration-200 placeholder:text-gray-400 focus:outline-none focus-visible:ring-2 sm:px-4 sm:py-2 sm:text-sm ${errors.note ? 'border-red-300 focus:border-red-500 focus-visible:ring-red-500/20' : 'border-gray-300 focus:border-primary focus-visible:ring-primary/20'}`}
          />
          {errors.note && <p id={`${noteId}-error`} role="alert" className="mt-1.5 text-sm text-red-600">{errors.note}</p>}
        </div>
        {formError && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{formError}</p>}
        <div className="flex flex-col-reverse gap-3 border-t border-gray-200 pt-5 sm:flex-row sm:justify-end">
          <Button type="button" variant="ghost" className="min-h-[44px]" onClick={onClose}>{t('wizard.cancel', 'Cancel')}</Button>
          <Button type="submit" className="min-h-[44px] px-5" disabled={isSaving}>{isSaving ? t('entrance.saving', 'Saving…') : t('entrance.save', 'Save entrance')}</Button>
        </div>
      </form>
    </Modal>
  );
};
