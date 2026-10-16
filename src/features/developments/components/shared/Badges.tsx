import React from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/src/lib/utils';
import type { UnitAvailability, DevelopmentStatus } from '../../types';

/**
 * Availability is conveyed with colour AND text, never colour alone
 * (accessibility requirement). A dot carries the colour; the label carries the
 * meaning, translated.
 */
const AVAILABILITY_DOT: Record<UnitAvailability, string> = {
  available: 'bg-green-500',
  reserved: 'bg-amber-500',
  sold: 'bg-zinc-500',
  rented: 'bg-blue-500',
  not_released: 'bg-slate-400',
  unavailable: 'bg-red-500',
};

export const AvailabilityBadge: React.FC<{ state: UnitAvailability; className?: string }> = ({
  state,
  className,
}) => {
  const { t } = useTranslation('developments');
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-0.5 text-xs font-medium',
        className
      )}
    >
      <span className={cn('h-2 w-2 rounded-full', AVAILABILITY_DOT[state])} aria-hidden="true" />
      {t(`availability.${state}`)}
    </span>
  );
};

const STATUS_CLASS: Record<DevelopmentStatus, string> = {
  draft: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
  published: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200',
  archived: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300',
};

export const StatusPill: React.FC<{ status: DevelopmentStatus; className?: string }> = ({
  status,
  className,
}) => {
  const { t } = useTranslation('developments');
  return (
    <span
      className={cn('inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium', STATUS_CLASS[status], className)}
    >
      {t(`status.${status}`)}
    </span>
  );
};
