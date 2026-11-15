import React from 'react';
import { useTranslation } from 'react-i18next';
import { formatOpenHouseWindow, openHouseWhen } from '../utils/openHouseFormat';

interface OpenHouseBadgeProps {
  nextOpenHouse?: { startsAt: string; endsAt: string };
  className?: string;
}

/** "Open house · Sat 21 Nov" on a result card — only when the owner planned one. */
const OpenHouseBadge: React.FC<OpenHouseBadgeProps> = ({ nextOpenHouse, className = '' }) => {
  const { t, i18n } = useTranslation('property');
  if (!nextOpenHouse) return null;

  const when = openHouseWhen(nextOpenHouse.startsAt, nextOpenHouse.endsAt, new Date());
  const { day } = formatOpenHouseWindow(nextOpenHouse.startsAt, nextOpenHouse.endsAt, i18n.language);
  const label = when === 'now'
    ? t('openHouse.badgeNow', { defaultValue: 'Open house now' })
    : when === 'today'
      ? t('openHouse.badgeToday', { defaultValue: 'Open house today' })
      : when === 'tomorrow'
        ? t('openHouse.badgeTomorrow', { defaultValue: 'Open house tomorrow' })
        : t('openHouse.badgeOn', { day, defaultValue: 'Open house · {{day}}' });

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full bg-emerald-600/90 px-2 py-[3px] text-[10px] font-semibold text-white backdrop-blur-sm ${className}`}
      data-testid="open-house-badge"
    >
      <svg aria-hidden="true" className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3z" />
      </svg>
      {label}
    </span>
  );
};

export default OpenHouseBadge;
