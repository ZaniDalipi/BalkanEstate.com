import React, { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatOpenHouseWindow } from '../utils/openHouseFormat';
import { MAX_OPEN_HOUSES_PER_LISTING } from '../utils/openHouseDraft';
import type { OpenHouseDraft } from '../types';
import OpenHouseWindowForm from './OpenHouseWindowForm';

interface OpenHouseDraftFieldsProps {
  value: OpenHouseDraft[];
  onChange: (next: OpenHouseDraft[]) => void;
  /** Server-side complaint about the chosen dates, shown next to the field. */
  error?: string;
}

/**
 * The optional "Host an open house" part of the listing form. Closed by
 * default; nothing is sent unless the seller adds a date.
 */
const OpenHouseDraftFields: React.FC<OpenHouseDraftFieldsProps> = ({ value, onChange, error }) => {
  const { t, i18n } = useTranslation('property');
  const [open, setOpen] = useState(value.length > 0);
  const panelId = useId();
  const atLimit = value.length >= MAX_OPEN_HOUSES_PER_LISTING;

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
        className="flex min-h-[44px] w-full items-center justify-between gap-3 text-left"
      >
        <span>
          <span className="block font-semibold text-neutral-900">
            {t('openHouse.hostTitle', { defaultValue: 'Host an open house' })}{' '}
            <span className="font-normal text-neutral-500">{t('openHouse.optional', { defaultValue: '(optional)' })}</span>
          </span>
          <span className="block text-sm text-neutral-600">
            {t('openHouse.hostHint', { defaultValue: 'Pick a date when anyone can drop by. You can also add or cancel one later from My Listings.' })}
          </span>
        </span>
        <span aria-hidden="true" className={`text-neutral-500 transition-transform ${open ? 'rotate-180' : ''}`}>▾</span>
      </button>

      {open && (
        <div id={panelId} className="mt-3 space-y-3">
          {value.length > 0 && (
            <ul className="space-y-2">
              {value.map((d, i) => {
                const { day, time } = formatOpenHouseWindow(d.startsAt, d.endsAt, i18n.language);
                return (
                  <li key={d.startsAt} className="flex items-center justify-between gap-2 rounded-lg bg-emerald-50 px-3 py-1">
                    <span className="text-sm font-medium text-neutral-900">{day} · {time}{d.capacity ? ` · ${t('openHouse.maxVisitors', { count: d.capacity, defaultValue: 'max. {{count}}' })}` : ''}</span>
                    <button
                      type="button"
                      onClick={() => onChange(value.filter((_, j) => j !== i))}
                      className="min-h-[44px] rounded-lg px-3 text-sm font-semibold text-red-600 hover:bg-red-50"
                      aria-label={t('openHouse.removeDate', { day, time, defaultValue: 'Remove the open house on {{day}}, {{time}}' })}
                    >
                      {t('openHouse.remove', { defaultValue: 'Remove' })}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
          {atLimit ? (
            <p className="text-sm text-neutral-600">{t('openHouse.limitReached', { count: MAX_OPEN_HOUSES_PER_LISTING, defaultValue: 'You can plan up to {{count}} open houses at a time.' })}</p>
          ) : (
            <OpenHouseWindowForm
              existing={value}
              onAdd={(draft) => onChange([...value, draft].sort((a, b) => a.startsAt.localeCompare(b.startsAt)))}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default OpenHouseDraftFields;
