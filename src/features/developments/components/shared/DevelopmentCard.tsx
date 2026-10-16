import React from 'react';
import { useTranslation } from 'react-i18next';
import { MapPin, Building2, Home } from 'lucide-react';
import { optimizeImageUrl, imageSrcSet } from '@/config/mediaConfig';
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
 * Image-forward development card used by the public grid and the dashboard list.
 * A cover image (or a branded gradient placeholder) sits above the details, with
 * the status and available-unit count overlaid — presentational only; navigation
 * is handed up via `onOpen`.
 */
export const DevelopmentCard: React.FC<DevelopmentCardProps> = ({
  development,
  onOpen,
  showStatus = false,
  className,
}) => {
  const { t } = useTranslation('developments');
  const { name, city, country, category, stats, status, coverImage } = development;
  const available = stats?.available ?? 0;

  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        'group flex w-full flex-col overflow-hidden rounded-2xl border border-border bg-card text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        className
      )}
    >
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-gradient-to-br from-primary/15 via-primary/5 to-muted">
        {coverImage ? (
          <img
            src={optimizeImageUrl(coverImage, { width: 640 })}
            srcSet={imageSrcSet(coverImage)}
            sizes="(max-width: 640px) 100vw, 400px"
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-primary/30">
            <Building2 className="h-12 w-12" aria-hidden="true" />
          </div>
        )}

        {showStatus && (
          <div className="absolute left-3 top-3">
            <StatusPill status={status} />
          </div>
        )}
        {available > 0 && (
          <div className="absolute bottom-3 left-3 rounded-full bg-black/55 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm">
            {t('public.available', { count: available })}
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <h3 className="line-clamp-1 text-base font-semibold text-foreground">{name}</h3>
        <p className="flex items-center gap-1 text-sm text-muted-foreground">
          <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span className="line-clamp-1">
            {city}
            {country ? `, ${country}` : ''}
          </span>
        </p>
        <div className="mt-1 flex items-center gap-4 text-xs text-muted-foreground">
          <span className="rounded-full bg-muted px-2 py-0.5">{t(`category.${category}`)}</span>
          <span className="flex items-center gap-1">
            <Home className="h-3.5 w-3.5" aria-hidden="true" />
            {t('detail.buildings')}: {stats?.buildings ?? 0}
          </span>
        </div>
      </div>
    </button>
  );
};
