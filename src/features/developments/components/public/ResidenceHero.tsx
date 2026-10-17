import React from 'react';
import { useTranslation } from 'react-i18next';
import { MapPin, Globe, ArrowDown, CalendarClock } from 'lucide-react';
import { optimizeImageUrl, imageSrcSet } from '@/config/mediaConfig';
import { cn } from '@/src/lib/utils';
import type { Development } from '../../types';

interface ResidenceHeroProps {
  development: Development;
  /** Smooth-scroll target for the "View available units" CTA. */
  onViewUnits: () => void;
}

/**
 * Full-bleed residence hero — a cinematic cover with layered gradients, glass
 * chips for category / construction status / completion, the project name and
 * location, and primary actions. Designed as the attention-grabbing top of a
 * premium development page; falls back to a branded gradient with no cover.
 */
export const ResidenceHero: React.FC<ResidenceHeroProps> = ({ development, onViewUnits }) => {
  const { t, i18n } = useTranslation('developments');
  const { coverImage, name, city, country, address, category, constructionStatus, website, expectedCompletionDate } =
    development;

  const completion = expectedCompletionDate
    ? new Date(expectedCompletionDate).toLocaleDateString(i18n.language || 'en', { month: 'short', year: 'numeric' })
    : null;

  const Chip: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-medium text-white backdrop-blur-md">
      {children}
    </span>
  );

  return (
    <section
      className={cn(
        'relative overflow-hidden rounded-[28px] shadow-2xl ring-1 ring-black/5',
        !coverImage && 'bg-gradient-to-br from-primary/30 via-primary/10 to-muted'
      )}
    >
      {coverImage && (
        <img
          src={optimizeImageUrl(coverImage, { width: 1600 })}
          srcSet={imageSrcSet(coverImage)}
          sizes="(max-width: 1200px) 100vw, 1200px"
          alt={name}
          className="absolute inset-0 h-full w-full scale-105 object-cover"
        />
      )}
      {/* Layered scrims: a top vignette for the chips, a deep bottom for the title. */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/20" />
      <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/40 to-transparent" />

      <div className="relative flex min-h-[380px] flex-col justify-end gap-4 p-6 sm:min-h-[480px] sm:p-10">
        <div className="flex flex-wrap gap-2">
          <Chip>{t(`category.${category}`)}</Chip>
          <Chip>
            <span className="h-1.5 w-1.5 rounded-full bg-teal-400" aria-hidden="true" />
            {t(`construction.${constructionStatus}`)}
          </Chip>
          {completion && (
            <Chip>
              <CalendarClock className="h-3.5 w-3.5" aria-hidden="true" />
              {completion}
            </Chip>
          )}
        </div>

        <h1 className="max-w-3xl text-4xl font-extrabold leading-[1.05] tracking-tight text-white drop-shadow-sm sm:text-6xl">
          {name}
        </h1>

        <p className="flex items-center gap-1.5 text-sm text-white/90 sm:text-base">
          <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />
          {[address, city, country].filter(Boolean).join(', ')}
        </p>

        <div className="mt-1 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onViewUnits}
            className="group inline-flex items-center gap-2 rounded-2xl bg-white px-6 py-3 text-sm font-bold text-slate-900 shadow-lg transition-transform hover:-translate-y-0.5"
          >
            {t('hero.viewUnits')}
            <ArrowDown className="h-4 w-4 transition-transform group-hover:translate-y-0.5" aria-hidden="true" />
          </button>
          {website && (
            <a
              href={website}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-2xl border border-white/30 bg-white/10 px-5 py-3 text-sm font-semibold text-white backdrop-blur-md transition-colors hover:bg-white/20"
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
