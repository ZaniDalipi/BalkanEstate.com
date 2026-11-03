import React from 'react';
import { useTranslation } from 'react-i18next';
import { WEEK_DAYS, hasAnyHours, parseDayHours, weekDayOf, type BusinessHours, type OpenStatus } from '../../utils/businessHours';
import { DetailSection } from './DetailSection';
import { OpenStatusBadge } from './OpenStatusBadge';

/** The week's hours, today highlighted, with the live status in the heading. */
export const BusinessHoursSection: React.FC<{ hours: BusinessHours | undefined; status: OpenStatus; now: Date }> = ({ hours, status, now }) => {
  const { t } = useTranslation('businessDirectory');
  if (!hasAnyHours(hours)) return null;
  const today = weekDayOf(now);

  return (
    <DetailSection id="business-hours" icon="clock" title={t('detail.businessHours', 'Business Hours')}>
      <OpenStatusBadge status={status} className="mb-3" />
      <ul className="space-y-0.5">
        {WEEK_DAYS.map((day) => {
          const text = hours?.[day]?.trim();
          const closed = parseDayHours(text).kind === 'closed';
          const isToday = day === today;
          return (
            <li
              key={day}
              aria-current={isToday ? 'date' : undefined}
              className={`flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-[15px] ${isToday ? 'bg-primary/[0.07] font-semibold text-primary-dark' : 'text-neutral-700'}`}
            >
              <span className="flex items-center gap-2">
                {t(`days.${day}`)}
                {isToday && <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">{t('detail.today', 'Today')}</span>}
              </span>
              <span className={`text-right tabular-nums ${closed ? 'text-neutral-400' : ''}`}>{closed ? t('detail.closed', 'Closed') : text}</span>
            </li>
          );
        })}
      </ul>
    </DetailSection>
  );
};
