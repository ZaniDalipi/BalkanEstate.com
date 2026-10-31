import React from 'react';
import { useTranslation } from 'react-i18next';
import { Rotate3d } from 'lucide-react';
import { cn } from '@/src/lib/utils';

/**
 * "360°" pill for a home that has a virtual tour (its own, or its listing's).
 * The visible text is short; screen readers hear the full meaning.
 */
export const TourBadge: React.FC<{ className?: string; tone?: 'light' | 'dark' }> = ({ className, tone = 'light' }) => {
  const { t } = useTranslation('developments');
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold',
        tone === 'light' ? 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200' : 'bg-white/20 text-white',
        className
      )}
      title={t('explorer.tour.badgeTitle', 'Has a 360° virtual tour')}
    >
      <Rotate3d className="h-3.5 w-3.5" aria-hidden="true" />
      <span aria-hidden="true">360°</span>
      <span className="sr-only">{t('explorer.tour.badgeTitle', 'Has a 360° virtual tour')}</span>
    </span>
  );
};
