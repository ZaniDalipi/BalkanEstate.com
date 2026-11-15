import React from 'react';
import { useTranslation } from 'react-i18next';
import { formatOpenHouseWindow, openHouseWhen } from '../utils/openHouseFormat';
import type { OpenHouse } from '../types';

interface OpenHouseSlotProps {
  openHouse: OpenHouse;
  busy: boolean;
  onRsvp: () => void;
  onCancelRsvp: () => void;
  onAddToCalendar: () => void;
  /** Shown instead of RSVP when the open house is full. */
  fallback: { label: string; onClick: () => void };
}

const BTN = 'min-h-[44px] rounded-lg px-3 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1';

/** One open house window with what the visitor can do about it. */
const OpenHouseSlot: React.FC<OpenHouseSlotProps> = ({ openHouse, busy, onRsvp, onCancelRsvp, onAddToCalendar, fallback }) => {
  const { t, i18n } = useTranslation('property');
  const { day, time } = formatOpenHouseWindow(openHouse.startsAt, openHouse.endsAt, i18n.language);
  const when = openHouseWhen(openHouse.startsAt, openHouse.endsAt, new Date());

  return (
    <li className="rounded-lg border border-emerald-100 bg-emerald-50/60 p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-2">
        <p className="font-semibold text-neutral-900">
          {day} · {time}
        </p>
        {when && (
          <span className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
            {t(`openHouse.when.${when}`, { defaultValue: when === 'now' ? 'Happening now' : when === 'today' ? 'Today' : 'Tomorrow' })}
          </span>
        )}
      </div>
      {openHouse.note && <p className="mt-1 text-sm text-neutral-600">{openHouse.note}</p>}
      {openHouse.spotsLeft != null && !openHouse.isFull && (
        <p className="mt-1 text-xs text-neutral-500">
          {t('openHouse.spotsLeft', { count: openHouse.spotsLeft, defaultValue: 'Places left: {{count}}' })}
        </p>
      )}

      <div className="mt-2 flex flex-wrap gap-2">
        {openHouse.isGoing ? (
          <>
            <span className="inline-flex min-h-[44px] items-center gap-1 text-sm font-semibold text-emerald-700" role="status">
              ✓ {t('openHouse.going', { defaultValue: "You're going" })}
            </span>
            <button type="button" disabled={busy} onClick={onCancelRsvp} className={`${BTN} text-neutral-600 hover:bg-white focus-visible:ring-neutral-400`}>
              {t('openHouse.cancelRsvp', { defaultValue: "Can't make it" })}
            </button>
          </>
        ) : openHouse.isFull ? (
          <>
            <span className="inline-flex min-h-[44px] items-center text-sm font-medium text-neutral-500">
              {t('openHouse.full', { defaultValue: 'Full' })}
            </span>
            <button type="button" onClick={fallback.onClick} className={`${BTN} border border-emerald-600 text-emerald-700 hover:bg-white focus-visible:ring-emerald-500`}>
              {fallback.label}
            </button>
          </>
        ) : (
          <button type="button" disabled={busy} onClick={onRsvp} className={`${BTN} bg-emerald-600 text-white hover:bg-emerald-700 focus-visible:ring-emerald-500 disabled:opacity-60`}>
            {t('openHouse.rsvp', { defaultValue: "I'm coming" })}
          </button>
        )}
        <button
          type="button"
          onClick={onAddToCalendar}
          className={`${BTN} text-emerald-700 hover:bg-white focus-visible:ring-emerald-500`}
          aria-label={t('openHouse.addToCalendarFor', { day, time, defaultValue: 'Add the open house on {{day}}, {{time}} to your calendar' })}
        >
          {t('openHouse.addToCalendar', { defaultValue: 'Add to calendar' })}
        </button>
      </div>
    </li>
  );
};

export default OpenHouseSlot;
