import React from 'react';
import { useTranslation } from 'react-i18next';
import { formatDistance, formatDuration, type TravelRoute } from '../../utils/travel';

interface RouteSummaryProps {
  straightKm: number;
  route: TravelRoute | undefined;
  isLoading: boolean;
  failed: boolean;
}

/** "18 min · 12.4 km" for the chosen mode, with the straight-line distance beside it — or alone when no route. */
export const RouteSummary: React.FC<RouteSummaryProps> = ({ straightKm, route, isLoading, failed }) => {
  const { t, i18n } = useTranslation('businessDirectory');
  const locale = i18n.language || 'en';
  const straight = t('detail.route.straight', { distance: formatDistance(straightKm, locale), defaultValue: '{{distance}} in a straight line' });

  return (
    <div className="flex min-h-[64px] items-center gap-4 rounded-2xl bg-primary/[0.06] px-4 py-3" aria-live="polite" aria-busy={isLoading}>
      {isLoading ? (
        <div className="flex w-full items-center gap-3">
          <div className="h-8 w-20 animate-pulse rounded-lg bg-primary/15" />
          <div className="h-4 flex-1 animate-pulse rounded bg-primary/10" />
        </div>
      ) : route && !failed ? (
        <>
          <p className="shrink-0 whitespace-nowrap text-2xl font-bold leading-none tracking-tight text-primary-dark tabular-nums sm:text-[28px]">{formatDuration(route.durationSeconds, locale)}</p>
          <div className="min-w-0 text-sm leading-snug">
            <p className="font-semibold text-neutral-900 tabular-nums">{formatDistance(route.distanceMeters / 1000, locale)}</p>
            <p className="truncate text-neutral-500">{straight}</p>
          </div>
        </>
      ) : (
        <div className="text-sm leading-snug">
          <p className="text-lg font-bold text-primary-dark tabular-nums">{straight}</p>
          <p className="text-neutral-600">{t('detail.route.noRoute', 'We couldn’t work out a route right now — the maps app below can.')}</p>
        </div>
      )}
    </div>
  );
};
