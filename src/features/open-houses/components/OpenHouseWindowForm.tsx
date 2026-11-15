import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  draftFromForm,
  EMPTY_OPEN_HOUSE_FORM,
  overlapsAny,
  type DraftError,
  type OpenHouseFormValues,
} from '../utils/openHouseDraft';
import type { OpenHouseDraft } from '../types';
import FormField from './FormField';
import DmyDateField from './DmyDateField';

interface OpenHouseWindowFormProps {
  /** Windows already chosen for this listing — a new one may not overlap them. */
  existing: { startsAt: string; endsAt: string }[];
  submitting?: boolean;
  onAdd: (draft: OpenHouseDraft) => void;
  onCancel?: () => void;
}

/** Date, start, end, and optionally a note and a visitor cap. */
const OpenHouseWindowForm: React.FC<OpenHouseWindowFormProps> = ({ existing, submitting = false, onAdd, onCancel }) => {
  const { t } = useTranslation('property');
  const [values, setValues] = useState<OpenHouseFormValues>(EMPTY_OPEN_HOUSE_FORM);
  const [error, setError] = useState<DraftError | null>(null);

  const set = (field: keyof OpenHouseFormValues) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setValues((v) => ({ ...v, [field]: e.target.value }));
    setError(null);
  };
  const errorFor = (field: DraftError['field']) => (error?.field === field ? t(error.key, { defaultValue: error.defaultValue }) : undefined);

  // Not a <form>: this sits inside the listing form, and forms can't nest.
  const add = () => {
    const result = draftFromForm(values, new Date());
    if (result.ok === false) {
      setError(result.error);
      return;
    }
    if (overlapsAny(result.value, existing)) {
      setError({ field: 'start', key: 'property:openHouse.errors.overlap', defaultValue: 'This time overlaps another open house' });
      return;
    }
    onAdd(result.value);
    setValues(EMPTY_OPEN_HOUSE_FORM);
  };

  return (
    <div className="space-y-3 rounded-lg border border-neutral-200 bg-neutral-50 p-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <DmyDateField label={t('openHouse.date', { defaultValue: 'Date' })} value={values.date} onChange={(date) => { setValues((v) => ({ ...v, date })); setError(null); }} error={errorFor('date')} />
        <FormField label={t('openHouse.from', { defaultValue: 'From' })} type="time" step={900} value={values.start} onChange={set('start')} error={errorFor('start')} />
        <FormField label={t('openHouse.to', { defaultValue: 'To' })} type="time" step={900} value={values.end} onChange={set('end')} error={errorFor('end')} />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <FormField
          className="sm:col-span-2"
          label={t('openHouse.noteOptional', { defaultValue: 'Note for visitors (optional)' })}
          placeholder={t('openHouse.notePlaceholder', { defaultValue: 'e.g. Ring the bell at entrance B' })}
          maxLength={500}
          value={values.note}
          onChange={set('note')}
        />
        <FormField
          label={t('openHouse.capacityOptional', { defaultValue: 'Max. visitors (optional)' })}
          type="number"
          inputMode="numeric"
          min={1}
          max={500}
          value={values.capacity}
          onChange={set('capacity')}
          error={errorFor('capacity')}
        />
      </div>
      <div className="flex flex-wrap justify-end gap-2">
        {onCancel && (
          <button type="button" onClick={onCancel} className="min-h-[44px] rounded-lg px-4 text-sm font-semibold text-neutral-700 hover:bg-neutral-100">
            {t('openHouse.cancelForm', { defaultValue: 'Cancel' })}
          </button>
        )}
        <button type="button" onClick={add} disabled={submitting} className="min-h-[44px] rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">
          {t('openHouse.addDate', { defaultValue: 'Add this date' })}
        </button>
      </div>
    </div>
  );
};

export default OpenHouseWindowForm;
