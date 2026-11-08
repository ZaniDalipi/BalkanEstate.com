import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { optimizeImageUrl } from '@/config/mediaConfig';
import { cn } from '@/src/lib/utils';
import type { UnitPhoto } from '../unitGallery';

interface PhotoDockProps {
  photos: UnitPhoto[];
  labels: string[];
  index: number;
  onSelect: (i: number) => void;
}

/**
 * The labelled filmstrip under the showcase photo: a thumbnail and its room
 * for every photo; the highlight springs across to the photo on show,
 * gliding under the thumbnails it passes (they sit above it, z-10).
 */
export const PhotoDock: React.FC<PhotoDockProps> = ({ photos, labels, index, onSelect }) => {
  const { t } = useTranslation('developments');
  const reduced = useReducedMotion();
  return (
    <div
      role="group"
      aria-label={t('explorer.drawer.openGallery', 'Open photos')}
      className="absolute bottom-5 left-1/2 z-10 flex max-w-[calc(100%-2rem)] -translate-x-1/2 gap-1 overflow-x-auto rounded-2xl bg-white/95 p-1.5 shadow-md ring-1 ring-black/5"
    >
      {photos.map((p, i) => {
        const on = i === index;
        return (
          <button
            key={p.url}
            type="button"
            aria-pressed={on}
            aria-label={labels[i]}
            onClick={() => onSelect(i)}
            className="relative flex w-[76px] shrink-0 flex-col items-center gap-1 rounded-xl px-1 pb-1 pt-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            {on && (
              <motion.span
                layoutId="showcase-dock-active"
                className="absolute inset-0 z-0 rounded-xl bg-slate-900"
                transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 30 }}
              />
            )}
            <img
              src={optimizeImageUrl(p.url, { width: 160 })}
              alt=""
              className={cn('relative z-10 h-11 w-[68px] rounded-lg object-cover transition', on ? 'opacity-100' : 'opacity-75 hover:opacity-100')}
            />
            <span className={cn('relative z-10 w-full truncate text-center text-[11px] font-semibold leading-tight transition-colors', on ? 'text-white' : 'text-slate-600')} aria-hidden="true">
              {labels[i]}
            </span>
          </button>
        );
      })}
    </div>
  );
};
