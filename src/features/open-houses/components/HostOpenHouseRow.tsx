import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatOpenHouseWindow } from '../utils/openHouseFormat';
import type { HostOpenHouse } from '../types';

interface HostOpenHouseRowProps {
  openHouse: HostOpenHouse;
  cancelling: boolean;
  onCancel: () => void;
}

/** One of the seller's open houses: when, who's coming, and cancel (asked twice). */
const HostOpenHouseRow: React.FC<HostOpenHouseRowProps> = ({ openHouse, cancelling, onCancel }) => {
  const { t, i18n } = useTranslation('property');
  const [confirming, setConfirming] = useState(false);
  const { day, time } = formatOpenHouseWindow(openHouse.startsAt, openHouse.endsAt, i18n.language);
  const count = openHouse.rsvps.length;

  return (
    <li className="rounded-lg border border-neutral-200 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-semibold text-neutral-900">{day} · {time}</p>
          <p className="text-sm text-neutral-600">
            {t('openHouse.comingCount', { count, defaultValue: 'Coming: {{count}}' })}
            {openHouse.capacity ? ` / ${openHouse.capacity}` : ''}
          </p>
        </div>
        {confirming ? (
          <div className="flex gap-2">
            <button type="button" onClick={() => setConfirming(false)} className="min-h-[44px] rounded-lg px-3 text-sm font-semibold text-neutral-700 hover:bg-neutral-100">
              {t('openHouse.keep', { defaultValue: 'Keep it' })}
            </button>
            <button type="button" disabled={cancelling} onClick={onCancel} className="min-h-[44px] rounded-lg bg-red-600 px-3 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60">
              {count > 0
                ? t('openHouse.confirmCancelNotify', { count, defaultValue: 'Cancel and tell the visitors ({{count}})' })
                : t('openHouse.confirmCancel', { defaultValue: 'Cancel open house' })}
            </button>
          </div>
        ) : (
          <button type="button" onClick={() => setConfirming(true)} className="min-h-[44px] rounded-lg px-3 text-sm font-semibold text-red-600 hover:bg-red-50">
            {t('openHouse.cancelOpenHouse', { defaultValue: 'Cancel' })}
          </button>
        )}
      </div>
      {count > 0 && (
        <ul className="mt-2 divide-y divide-neutral-100 text-sm" aria-label={t('openHouse.visitorList', { defaultValue: "Who's coming" })}>
          {openHouse.rsvps.map((r) => (
            <li key={`${r.email}-${r.createdAt}`} className="flex flex-wrap gap-x-3 py-1.5">
              <span className="font-medium text-neutral-900">{r.name}</span>
              <a href={`mailto:${r.email}`} className="text-emerald-700 underline">{r.email}</a>
              {r.phone && <a href={`tel:${r.phone}`} className="text-emerald-700 underline">{r.phone}</a>}
            </li>
          ))}
        </ul>
      )}
    </li>
  );
};

export default HostOpenHouseRow;
