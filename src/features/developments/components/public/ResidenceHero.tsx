import React from 'react';
import { useTranslation } from 'react-i18next';
import { MapPin, Globe, ChevronDown } from 'lucide-react';
import { optimizeImageUrl, imageSrcSet } from '@/config/mediaConfig';
import { cn } from '@/src/lib/utils';
import type { Development } from '../../types';

interface ResidenceHeroProps {
  development: Development;
  /** Smooth-scroll target for the "View available units" CTA. */
  onViewUnits: () => void;
}

/**
 * Full-bleed residence hero: the cover image with a dark gradient and the
 * project's name, location, category and a primary CTA overlaid — the look of
 * a premium development landing page. Falls back to a branded gradient when no
 * cover image has been uploaded yet.
 */
export const ResidenceHero: React.FC<ResidenceHeroProps> = ({ development, onViewUnits }) => {
  const { t } = useTranslation('developments');
  const { coverImage, name, city, country, address, category, constructionStatus, website } = development;

  return (
    <section
      className={cn(
        'relative overflow-hidden rounded-3xl',
        !coverImage && 'bg-gradient-to-br from-primary/25 via-primary/10 to-muted'
      )}
    >
      {coverImage && (
        <img
          src={optimizeImageUrl(coverImage, { width: 1600 })}
          srcSet={imageSrcSet(coverImage)}
          sizes="(max-width: 1200px) 100vw, 1200px"
          alt={name}
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}
      {/* Readability scrim */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10" />

      <div className="relative flex min-h-[320px] flex-col justify-end gap-3 p-6 sm:min-h-[420px] sm:p-10">
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm">
            {t(`category.${category}`)}
          </span>
          <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm">
            {t(`construction.${constructionStatus}`)}
          </span>
        </div>

        <h1 className="max-w-3xl text-3xl font-bold leading-tight text-white sm:text-5xl">{name}</h1>

        <p className="flex items-center gap-1.5 text-sm text-white/90">
          <MapPin className="h-4 w-4" aria-hidden="true" />
          {[address, city, country].filter(Boolean).join(', ')}
        </p>

        <div className="mt-2 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onViewUnits}
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg transition-colors hover:bg-primary/90"
          >
            {t('hero.viewUnits')}
            <ChevronDown className="h-4 w-4" aria-hidden="true" />
          </button>
          {website && (
            <a
              href={website}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl bg-white/15 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/25"
            >
              <Globe className="h-4 w-4" aria-hidden="true" />
              {t('wizard.website')}
            </a>
          )}
        </div>
      </div>
    </section>
  );
};
