import React from 'react';
import { useTranslation } from 'react-i18next';
import { PROPERTY_TYPES } from '@/shared/types/property.types';
import { type EditableField, type FormValue, NUMBER_FIELDS } from '../../utils/draftFields';

interface DraftFieldInputProps {
  field: EditableField;
  value: FormValue;
  /** What the feed sent, shown when the owner has changed it. */
  feedValue?: string;
  onChange: (field: EditableField, value: FormValue) => void;
}

const inputClass =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary';

/** A single labelled input in the draft editor, typed by field. */
const DraftFieldInput: React.FC<DraftFieldInputProps> = ({ field, value, feedValue, onChange }) => {
  const { t } = useTranslation(['listingFeeds', 'property']);
  const id = `draft-field-${field}`;
  const label = t(`listingFeeds:review.fields.${field}`);

  if (field === 'isNegotiable') {
    return (
      <label className="flex items-center gap-2 text-sm text-gray-700 sm:col-span-2">
        <input
          type="checkbox"
          checked={value === true}
          onChange={(e) => onChange(field, e.target.checked)}
          className="w-4 h-4 rounded border-gray-300 text-primary"
        />
        {label}
      </label>
    );
  }

  let control: React.ReactNode;
  if (field === 'description') {
    control = <textarea id={id} rows={5} value={String(value)} onChange={(e) => onChange(field, e.target.value)} className={inputClass} />;
  } else if (field === 'listingType' || field === 'propertyType') {
    const options = field === 'listingType' ? ['sale', 'rent'] : PROPERTY_TYPES;
    control = (
      <select id={id} value={String(value)} onChange={(e) => onChange(field, e.target.value)} className={inputClass}>
        {options.map((o) => (
          <option key={o} value={o}>
            {field === 'listingType' ? t(`listingFeeds:review.fields.${o}`) : t(`property:types.${o}`, { defaultValue: o })}
          </option>
        ))}
      </select>
    );
  } else {
    const numeric = NUMBER_FIELDS.includes(field);
    control = (
      <input
        id={id}
        type={numeric ? 'number' : 'text'}
        inputMode={numeric ? 'decimal' : undefined}
        min={numeric ? 0 : undefined}
        value={String(value)}
        onChange={(e) => onChange(field, e.target.value)}
        className={inputClass}
      />
    );
  }

  return (
    <div className={field === 'description' || field === 'title' ? 'sm:col-span-2' : undefined}>
      <label htmlFor={id} className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      {control}
      {feedValue !== undefined && (
        <p className="text-[11px] text-gray-400 mt-0.5 truncate">{t('listingFeeds:review.feedValue', { value: feedValue })}</p>
      )}
    </div>
  );
};

export default DraftFieldInput;
