import React from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowDown, ArrowLeft } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import type { Development } from '../../../types';
import { residencePhotos } from '../../../utils/residencePhotos';
import { BuilderLogo } from '../builder/BuilderLogo';
import { ResidencePhotosButton } from '../gallery/ResidencePhotosButton';
import { ShareResidenceButton } from '../share/ShareResidenceButton';

export interface NavSection {
  id: string;
  label: string;
}

interface ResidenceNavProps {
  development: Development;
  sections: NavSection[];
  onSection: (id: string) => void;
  onBack: () => void;
  /** 'picture': white, over the full-screen rendering; 'paper': dark, on the white page. */
  tone: 'picture' | 'paper';
  /** The section that is its own page and on screen (the company page): marked as current. */
  current?: string;
  /** What the back button says (default: all residences). */
  backLabel?: string;
}

/**
 * The residence's own bar, so its page reads like the builder's website: back
 * to all residences, its logo and name, its sections, and "View apartments".
 */
export const ResidenceNav: React.FC<ResidenceNavProps> = ({ development, sections, onSection, onBack, tone, current, backLabel }) => {
  const { t } = useTranslation('developments');
  const onPicture = tone === 'picture';
  const place = [development.city, development.country].filter(Boolean).join(', ');
  const back = backLabel ?? t('immersive.back', 'All residences');
  const ghost = onPicture
    ? 'text-white/85 hover:bg-white/10 hover:text-white focus-visible:ring-white'
    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus-visible:ring-primary';

  return (
    <nav aria-label={t('immersive.nav', 'Residence')} className={cn('flex h-[4.5rem] items-center gap-3 px-4 xl:px-8', !onPicture && 'border-b border-slate-200 bg-white')}>
      <button
        type="button"
        onClick={onBack}
        aria-label={back}
        className={cn('inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-1.5 rounded-full px-3 text-sm font-medium focus-visible:outline-none focus-visible:ring-2', ghost)}
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        <span className="hidden max-w-[12rem] truncate xl:inline" aria-hidden="true">{back}</span>
      </button>

      <div className="flex min-w-0 items-center gap-3">
        <BuilderLogo name={development.builder?.name || development.name} url={development.builder?.logo?.url} size={40} className={onPicture ? 'ring-white/40' : undefined} />
        <div className="min-w-0 leading-tight">
          <p className={cn('truncate text-base font-semibold', onPicture ? 'text-white' : 'text-slate-900')}>{development.name}</p>
          {place && <p className={cn('truncate text-xs', onPicture ? 'text-white/70' : 'text-slate-500')}>{place}</p>}
        </div>
      </div>

      {/* From 1280px: below that they would wrap; the page's own section bar lists them. */}
      <ul className="mx-auto hidden items-center gap-1 xl:flex">
        {sections.map((s) => (
          <li key={s.id}>
            <button
              type="button"
              onClick={() => onSection(s.id)}
              aria-current={s.id === current ? 'page' : undefined}
              className={cn(
                'min-h-[44px] whitespace-nowrap rounded-full px-3.5 text-sm font-medium focus-visible:outline-none focus-visible:ring-2',
                s.id === current ? (onPicture ? 'bg-white/15 text-white' : 'bg-slate-900 text-white hover:bg-slate-800 focus-visible:ring-primary') : ghost
              )}
            >
              {s.label}
            </button>
          </li>
        ))}
      </ul>

      <div className="ml-auto flex shrink-0 items-center gap-2 xl:ml-0">
        <ResidencePhotosButton photos={residencePhotos(development)} variant={onPicture ? 'glass' : 'outline'} className={onPicture ? 'rounded-full' : undefined} />
        <ShareResidenceButton slug={development.slug} name={development.name} place={place} variant={onPicture ? 'glass' : 'outline'} />
        <button
          type="button"
          onClick={() => onSection('units')}
          className="inline-flex min-h-[44px] items-center gap-2 whitespace-nowrap rounded-full bg-amber-400 pl-4 pr-1.5 text-sm font-semibold text-slate-900 shadow-lg shadow-amber-900/20 transition-colors hover:bg-amber-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          {t('immersive.cta', 'View apartments')}
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-white" aria-hidden="true">
            <ArrowDown className="h-4 w-4" />
          </span>
        </button>
      </div>
    </nav>
  );
};
