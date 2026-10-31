import React from 'react';
import { useTranslation } from 'react-i18next';
import { Rotate3d } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import type { DevelopmentBuilding } from '../../../types';

interface BuildingChipsProps {
  buildings: DevelopmentBuilding[];
  activeId?: string;
  onSelect: (building: DevelopmentBuilding) => void;
}

/** Building selector: one chip per building with "N available" from its public stats. */
export const BuildingChips: React.FC<BuildingChipsProps> = ({ buildings, activeId, onSelect }) => {
  const { t } = useTranslation('developments');
  if (buildings.length < 2) return null;
  return (
    <div
      className="flex max-w-full gap-2 overflow-x-auto pb-1"
      role="group"
      aria-label={t('detail.buildings', 'Buildings')}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      {[...buildings].sort((a, b) => a.order - b.order).map((b) => {
        const on = b.id === activeId;
        return (
          <button
            key={b.id}
            type="button"
            aria-pressed={on}
            onClick={() => onSelect(b)}
            className={cn(
              'flex min-h-[44px] shrink-0 flex-col items-start justify-center rounded-xl border px-3 py-1 text-left shadow-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
              on ? 'border-primary bg-primary text-white' : 'border-white/60 bg-white/95 text-slate-900 hover:bg-white'
            )}
          >
            <span className="max-w-[12rem] truncate text-sm font-semibold leading-tight">{b.name}</span>
            {b.stats && (
              <span className={cn('flex items-center gap-1 text-[11px] leading-tight', on ? 'text-white/85' : 'text-slate-500')}>
                {t('explorer.availableCount', { count: b.stats.available, defaultValue: '{{count}} available' })}
                {(b.stats.withTour ?? 0) > 0 && (
                  <span className={cn('inline-flex items-center gap-0.5 font-semibold', on ? 'text-white' : 'text-indigo-700')}>
                    · <Rotate3d className="h-3 w-3" aria-hidden="true" />
                    {t('explorer.tour.chip', { n: b.stats.withTour, defaultValue: '360° ×{{n}}' })}
                    <span className="sr-only">{t('explorer.tour.chipLong', { n: b.stats.withTour, defaultValue: 'Homes with a 360° tour: {{n}}' })}</span>
                  </span>
                )}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
