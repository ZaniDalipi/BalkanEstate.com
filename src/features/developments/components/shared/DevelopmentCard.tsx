import React from 'react';
import { useTranslation } from 'react-i18next';
import { MapPin, Building2 } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import type { Development } from '../../types';
import { StatusPill } from './Badges';

interface DevelopmentCardProps {
  development: Development;
  onOpen: () => void;
  /** Dashboard cards show the draft/published status; public cards don't. */
  showStatus?: boolean;
  className?: string;
}

/**
 * Compact development summary used by both the public discovery grid and the
 * dashboard list. Presentational — all navigation is handed up via `onOpen`.
 */
export const DevelopmentCard: React.FC<DevelopmentCardProps> = ({
  development,
  onOpen,
  showStatus = false,
  className,
}) => {
  const { t } = useTranslation('developments');
  const { name, city, country, category, stats, status } = development;

  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        'group flex w-full flex-col items-start gap-2 rounded-2xl border border-border bg-card p-4 text-left transition-colors hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        className
      )}
    >
      <div className="flex w-full items-start justify-between gap-2">
        <h3 className="line-clamp-1 text-base font-semibold text-foreground">{name}</h3>
        {showStatus && <StatusPill status={status} />}
      </div>

      <p className="flex items-center gap-1 text-sm text-muted-foreground">
        <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
        <span className="line-clamp-1">
          {city}
          {country ? `, ${country}` : ''}
        </span>
      </p>

      <p className="text-xs text-muted-foreground">{t(`category.${category}`)}</p>

      <div className="mt-1 flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Building2 className="h-3.5 w-3.5" aria-hidden="true" />
          {t('detail.buildings')}: {stats?.buildings ?? 0}
        </span>
        <span>
          {t('public.available', { count: stats?.available ?? 0 })}
        </span>
      </div>
    </button>
  );
};
