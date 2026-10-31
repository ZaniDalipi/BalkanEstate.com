import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/src/lib/utils';
import { AVAILABILITY_META } from '../../utils/availability';
import type { UnitAvailability, DevelopmentStatus } from '../../types';

const AVAILABILITY_DEFAULTS: Record<UnitAvailability, string> = {
  available: 'Available',
  reserved: 'Reserved',
  sold: 'Sold',
  rented: 'Rented',
  not_released: 'Coming soon',
  unavailable: 'Unavailable',
};

/**
 * The buyer-facing label of an availability state. `not_released` reads
 * "Coming soon" to buyers (the dashboard keeps "Not released").
 */
export function useAvailabilityLabel(): (state: UnitAvailability) => string {
  const { t } = useTranslation('developments');
  return useCallback(
    (state: UnitAvailability) =>
      state === 'not_released'
        ? t('explorer.comingSoon', 'Coming soon')
        : t(`availability.${state}`, AVAILABILITY_DEFAULTS[state]),
    [t]
  );
}

/**
 * Availability is conveyed with colour AND text, never colour alone
 * (accessibility requirement). A dot carries the colour (from
 * utils/availability, the single source of truth); the label carries the
 * meaning, translated.
 */
export const AvailabilityBadge: React.FC<{
  state: UnitAvailability;
  className?: string;
  /** 'staff' (dashboard) keeps the internal "Not released" wording. */
  audience?: 'buyer' | 'staff';
}> = ({ state, className, audience = 'buyer' }) => {
  const { t } = useTranslation('developments');
  const buyerLabel = useAvailabilityLabel();
  const text = audience === 'staff' ? t(`availability.${state}`, state) : buyerLabel(state);
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-xs font-medium text-slate-700',
        className
      )}
    >
      <span className={cn('h-2 w-2 rounded-full', AVAILABILITY_META[state].dotClass)} aria-hidden="true" />
      {text}
    </span>
  );
};

const STATUS_CLASS: Record<DevelopmentStatus, string> = {
  draft: 'bg-slate-100 text-slate-700',
  published: 'bg-green-100 text-green-800',
  archived: 'bg-zinc-100 text-zinc-600',
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
      {t(`status.${status}`, status)}
    </span>
  );
};
