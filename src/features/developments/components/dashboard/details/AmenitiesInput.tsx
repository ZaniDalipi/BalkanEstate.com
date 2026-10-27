import React, { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, X } from 'lucide-react';

export const MAX_AMENITIES = 40;
const AMENITY_MAX_LENGTH = 60;

interface AmenitiesInputProps {
  value: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
  /** Keep the label for screen readers only (when a section heading already says "Amenities"). */
  hideLabel?: boolean;
}

/** Amenities as removable chips; type one and press Enter (or Add). Mirrors the server limits. */
export const AmenitiesInput: React.FC<AmenitiesInputProps> = ({ value, onChange, disabled = false, hideLabel = false }) => {
  const { t } = useTranslation('developments');
  const [text, setText] = useState('');
  const inputId = useId();
  const full = value.length >= MAX_AMENITIES;

  const add = () => {
    const next = text.trim();
    if (!next || full) return;
    if (!value.some((a) => a.toLowerCase() === next.toLowerCase())) onChange([...value, next]);
    setText('');
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      add();
    } else if (e.key === 'Backspace' && !text && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  };

  return (
    <div>
      <label htmlFor={inputId} className={hideLabel ? 'sr-only' : 'mb-1.5 block text-sm font-medium text-gray-700'}>
        {t('details.amenities', 'Amenities')}
      </label>
      {value.length > 0 && (
        <ul className="mb-2 flex flex-wrap gap-2" aria-label={t('details.amenities', 'Amenities')}>
          {value.map((a) => (
            <li key={a} className="flex items-center gap-1 rounded-full bg-slate-100 py-1 pl-3 pr-1 text-sm text-slate-800">
              {a}
              <button
                type="button"
                onClick={() => onChange(value.filter((x) => x !== a))}
                disabled={disabled}
                aria-label={t('details.removeAmenity', {
                  name: a,
                  defaultValue: 'Remove {{name}}',
                })}
                className="flex h-6 w-6 items-center justify-center rounded-full text-slate-500 hover:bg-slate-200 hover:text-slate-900"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        <input
          id={inputId}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          maxLength={AMENITY_MAX_LENGTH}
          disabled={disabled || full}
          placeholder={t('details.amenityPlaceholder', 'e.g. Underground parking')}
          className="min-h-[44px] w-full rounded-lg border border-gray-300 px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:bg-slate-50"
        />
        <button
          type="button"
          onClick={add}
          disabled={disabled || full || !text.trim()}
          className="flex min-h-[44px] shrink-0 items-center gap-1 rounded-lg border border-slate-300 px-3 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-50"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          {t('details.addAmenity', 'Add')}
        </button>
      </div>
      <p className="mt-1.5 text-sm text-slate-600">
        {full
          ? t('details.amenitiesFull', {
              max: MAX_AMENITIES,
              defaultValue: 'You can list up to {{max}} amenities.',
            })
          : t('details.amenitiesHelper', 'Shown on the residence page. Press Enter after each one.')}
      </p>
    </div>
  );
};
