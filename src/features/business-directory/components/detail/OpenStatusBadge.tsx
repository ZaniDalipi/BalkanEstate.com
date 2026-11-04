import React from 'react';
import { useTranslation } from 'react-i18next';
import type { OpenStatus } from '../../utils/businessHours';

/** The status in words: "Open · Closes 17:00", "Closed · Opens tomorrow 09:00"… */
export function useOpenStatusText(status: OpenStatus): { tone: 'open' | 'closed' | 'neutral'; head: string; detail?: string } | null {
  const { t } = useTranslation('businessDirectory');
  switch (status.kind) {
    case 'open':
      return {
        tone: 'open',
        head: t('detail.status.open', 'Open'),
        detail: status.closesAt
          ? t('detail.status.closes', { time: status.closesAt, defaultValue: 'Closes {{time}}' })
          : t('detail.status.allDay', '24 hours'),
      };
    case 'closed': {
      const when = status.opensDay === 'today'
        ? t('detail.status.opensAt', { time: status.opensAt, defaultValue: 'Opens {{time}}' })
        : status.opensDay === 'tomorrow'
          ? t('detail.status.opensTomorrow', { time: status.opensAt, defaultValue: 'Opens tomorrow {{time}}' })
          : t('detail.status.opensOn', { day: t(`days.${status.opensDay}`), time: status.opensAt, defaultValue: 'Opens {{day}} {{time}}' });
      return { tone: 'closed', head: t('detail.status.closed', 'Closed'), detail: when };
    }
    case 'closedToday':
      return { tone: 'closed', head: t('detail.status.closedToday', 'Closed today') };
    case 'unreadable':
      return { tone: 'neutral', head: t('detail.today', 'Today'), detail: status.text };
    default:
      return null;
  }
}

const TONE = {
  open: { dot: 'bg-emerald-500', head: 'text-emerald-700' },
  closed: { dot: 'bg-rose-500', head: 'text-rose-600' },
  neutral: { dot: 'bg-neutral-400', head: 'text-neutral-700' },
} as const;

/** A compact live status pill; renders nothing when the business gave no hours. */
export const OpenStatusBadge: React.FC<{ status: OpenStatus; className?: string }> = ({ status, className = '' }) => {
  const text = useOpenStatusText(status);
  if (!text) return null;
  const tone = TONE[text.tone];
  return (
    <span className={`inline-flex items-center gap-1.5 text-sm ${className}`}>
      <span className={`h-2 w-2 shrink-0 rounded-full ${tone.dot}`} aria-hidden="true" />
      <span className={`font-semibold ${tone.head}`}>{text.head}</span>
      {text.detail && <span className="text-neutral-500">· {text.detail}</span>}
    </span>
  );
};
