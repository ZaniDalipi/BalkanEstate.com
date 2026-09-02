import React from 'react';
import { useTranslation } from 'react-i18next';
import { Clock } from 'lucide-react';

export interface DataFreshnessProps {
  /** ISO string or Date of the last fetch. Anything unparseable renders nothing. */
  fetchedAt?: string | Date | null;
  /** Optional source name, e.g. "OpenStreetMap" or "INSTAT". */
  sourceLabel?: string;
  className?: string;
  /** Injected clock, so the relative label is testable. */
  now?: Date;
}

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export function parseFetchedAt(value?: string | Date | null): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** A translatable description of an age, kept free of i18n so it can be tested. */
export interface AgeDescriptor {
  key: string;
  defaultValue: string;
  count?: number;
}

/**
 * Relative age of a data set.
 *
 * A future timestamp (clock skew between server and browser) reads as
 * "just now" rather than "in 3 hours": the reader cares that it is current,
 * and a negative age is never something they can act on.
 */
export function describeAge(fetchedAt: Date, now: Date): AgeDescriptor {
  const ageMs = now.getTime() - fetchedAt.getTime();

  if (ageMs < 2 * MINUTE) return { key: 'freshness.justNow', defaultValue: 'just now' };

  if (ageMs < HOUR) {
    return {
      key: 'freshness.minutesAgo',
      defaultValue: '{{count}} min ago',
      count: Math.floor(ageMs / MINUTE),
    };
  }

  if (ageMs < DAY) {
    return {
      key: 'freshness.hoursAgo',
      defaultValue: '{{count}}h ago',
      count: Math.floor(ageMs / HOUR),
    };
  }

  const days = Math.floor(ageMs / DAY);
  if (days === 1) return { key: 'freshness.yesterday', defaultValue: 'yesterday' };
  if (days < 30) {
    return { key: 'freshness.daysAgo', defaultValue: '{{count}} days ago', count: days };
  }

  const months = Math.floor(days / 30);
  if (months <= 1) return { key: 'freshness.monthAgo', defaultValue: 'last month' };
  return { key: 'freshness.monthsAgo', defaultValue: '{{count}} months ago', count: months };
}

/**
 * "Data fetched 3 days ago" — the timestamp the numbers on screen came from.
 *
 * Market figures are refreshed on a schedule, so a reader needs to know
 * whether they are looking at this week's data or last quarter's. The exact
 * timestamp goes in the tooltip; the visible text stays a glanceable age.
 */
const DataFreshness: React.FC<DataFreshnessProps> = ({
  fetchedAt, sourceLabel, className = '', now,
}) => {
  const { t } = useTranslation(['exploreCities']);
  const date = parseFetchedAt(fetchedAt);

  // No timestamp is not "old data" — say nothing rather than guess.
  if (!date) return null;

  const descriptor = describeAge(date, now ?? new Date());
  const age = t(
    descriptor.key,
    descriptor.defaultValue,
    descriptor.count === undefined ? undefined : { count: descriptor.count },
  );

  const exact = date.toLocaleString(undefined, {
    year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[11px] text-neutral-500 ${className}`}
      title={exact}
    >
      <Clock className="w-3 h-3 flex-shrink-0" aria-hidden="true" />
      <span>
        {sourceLabel
          ? t('freshness.labelWithSource', 'Data fetched {{age}} · {{source}}', { age, source: sourceLabel })
          : t('freshness.label', 'Data fetched {{age}}', { age })}
      </span>
      {/* The precise moment, for anyone who needs more than "3 days ago". */}
      <time dateTime={date.toISOString()} className="sr-only">{exact}</time>
    </span>
  );
};

export default DataFreshness;
