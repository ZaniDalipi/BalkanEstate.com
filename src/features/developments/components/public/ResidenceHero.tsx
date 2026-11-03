import React from 'react';
import { useTranslation } from 'react-i18next';
import { MapPin, Globe, ArrowDown, CalendarClock } from 'lucide-react';
import { optimizeImageUrl, imageSrcSet } from '@/config/mediaConfig';
import { cn } from '@/src/lib/utils';
import { residenceTimeline } from '../../utils/timeline';
import type { Development } from '../../types';
import { residencePhotos } from '../../utils/residencePhotos';
import { ResidencePhotosButton } from './gallery/ResidencePhotosButton';

interface ResidenceHeroProps {
  development: Development;
  /** Smooth-scroll target for the "View available units" CTA. */
  onViewUnits: () => void;
}

/**
 * Full-bleed residence hero — the cover photo shown whole and bright (a
 * gradient only behind the text), a Photos button for the gallery, glass
 * chips for category / construction status / completion, the project name and
 * location, and primary actions. Designed as the attention-grabbing top of a
 * premium development page; falls back to a branded gradient with no cover.
 */
export const ResidenceHero: React.FC<ResidenceHeroProps> = ({ development, onViewUnits }) => {
  const { t, i18n } = useTranslation('developments');
  const { coverImage, name, city, country, address, category, constructionStatus, website } = development;

  const timeline = residenceTimeline(development, i18n.language, 'short');
  const completion =
    timeline?.kind === 'built' ? t('detail.builtIn', { year: timeline.year, defaultValue: 'Built {{year}}' }) : timeline?.date ?? null;

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
          className="absolute inset-0 h-full w-full object-cover object-center"
        />
      )}
      {/* Darkened only behind the text at the bottom, so the building itself stays bright. */}
      <div className="absolute inset-x-0 bottom-0 h-3/4 bg-gradient-to-t from-black/80 via-black/35 to-transparent" />
      <ResidencePhotosButton photos={residencePhotos(development)} variant="glass" className="absolute right-4 top-4 z-10 sm:right-6 sm:top-6" />

      <div className="relative flex min-h-[460px] flex-col justify-end gap-4 px-6 pb-20 pt-16 sm:aspect-[16/10] sm:max-h-[80vh] sm:px-10 sm:pb-24 lg:aspect-[2/1]">
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
