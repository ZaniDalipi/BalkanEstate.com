import React from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/src/lib/utils';
import type { UnitAvailability } from '../../../types';
import { AVAILABILITY_META } from '../../../utils/availability';
import { useAvailabilityLabel } from '../../shared/Badges';
import { motif } from './AvailabilityPatterns';
import { AvailabilitySwitch } from './AvailabilitySwitch';

interface ExplorerLegendProps {
  counts: Array<{ state: UnitAvailability; count: number }>;
  selected: readonly UnitAvailability[];
  onToggle: (state: UnitAvailability) => void;
  /** Whether every apartment is coloured by availability (vs. only on hover). */
  showAvailability: boolean;
  onToggleShowAvailability: () => void;
  /**
   * `grid` (phones, in the band below the picture): the switch as a full-width row and the states in an
   * even grid (two columns, one when large text leaves no room for two). `inline` (over the picture): compact pills. From tablet up both are pills.
   */
  layout?: 'grid' | 'inline';
}

/**
 * Availability legend with counts per state. Each entry is a toggle: clicking
 * it filters to (or releases) that state. Swatches repeat the polygon pattern
 * motif so the legend decodes the map without colour.
 */
export const ExplorerLegend: React.FC<ExplorerLegendProps> = ({ counts, selected, onToggle, showAvailability, onToggleShowAvailability, layout = 'inline' }) => {
  const { t } = useTranslation('developments');
  const label = useAvailabilityLabel();
  if (counts.length === 0) return null;
  const grid = layout === 'grid';
  return (
    <div
      className={grid ? 'grid grid-cols-[repeat(auto-fit,minmax(8.5rem,1fr))] gap-2 sm:flex sm:flex-wrap sm:gap-1.5' : 'flex flex-wrap gap-1.5'}
      role="group"
      aria-label={t('explorer.legend', 'Availability legend')}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <AvailabilitySwitch on={showAvailability} onToggle={onToggleShowAvailability} layout={grid ? 'row' : 'pill'} />
      {counts.map(({ state, count }) => {
        const on = selected.includes(state);
        const meta = AVAILABILITY_META[state];
        return (
          <button
            key={state}
            type="button"
            aria-pressed={on}
            onClick={() => onToggle(state)}
            className={cn(
              'inline-flex min-h-[44px] items-center gap-2 rounded-full border px-3 text-xs font-semibold shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:min-h-[36px]',
              grid && 'min-w-0 gap-1.5 rounded-xl px-2.5 py-1 text-left text-sm sm:gap-2 sm:rounded-full sm:px-3 sm:py-0 sm:text-xs',
              on ? 'border-primary bg-white text-slate-900 ring-2 ring-primary' : 'border-white/60 bg-white/90 text-slate-700 hover:bg-white'
            )}
          >
            <svg width="14" height="14" className="shrink-0" aria-hidden="true">
              <rect width="14" height="14" rx="3" fill={meta.color} />
              {/* Same motif as the polygon pattern, drawn once at swatch size. */}
              {motif(meta.pattern, 14, 1.6)}
            </svg>
            {/* Cells are sized in rem, so with large text the grid drops to one column instead of cutting names. */}
            <span className={cn(grid && 'leading-tight')}>{label(state)}</span>
            <span className={cn('tabular-nums text-slate-500', grid && 'ml-auto sm:ml-0')}>{count}</span>
          </button>
        );
      })}
    </div>
  );
};
