import React from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/src/lib/utils';
import type { UnitAvailability } from '../../../types';
import { AVAILABILITY_META } from '../../../utils/availability';
import { useAvailabilityLabel } from '../../shared/Badges';
import { motif } from './AvailabilityPatterns';

interface ExplorerLegendProps {
  counts: Array<{ state: UnitAvailability; count: number }>;
  selected: readonly UnitAvailability[];
  onToggle: (state: UnitAvailability) => void;
  /** Whether every apartment is coloured by availability (vs. only on hover). */
  showAvailability: boolean;
  onToggleShowAvailability: () => void;
}

/**
 * Availability legend with counts per state. Each entry is a toggle: clicking
 * it filters to (or releases) that state. Swatches repeat the polygon pattern
 * motif so the legend decodes the map without colour.
 */
export const ExplorerLegend: React.FC<ExplorerLegendProps> = ({ counts, selected, onToggle, showAvailability, onToggleShowAvailability }) => {
  const { t } = useTranslation('developments');
  const label = useAvailabilityLabel();
  if (counts.length === 0) return null;
  return (
    <div
      className="flex flex-wrap gap-1.5"
      role="group"
      aria-label={t('explorer.legend', 'Availability legend')}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        role="switch"
        aria-checked={showAvailability}
        onClick={onToggleShowAvailability}
        className={cn(
          'inline-flex min-h-[44px] items-center gap-2 rounded-full border px-3 text-xs font-semibold shadow-sm transition-colors sm:min-h-[36px]',
          showAvailability ? 'border-teal-700 bg-teal-700 text-white' : 'border-white/60 bg-white/90 text-slate-700 hover:bg-white'
        )}
      >
        <span
          aria-hidden="true"
          className={cn('relative h-4 w-7 rounded-full transition-colors', showAvailability ? 'bg-white/40' : 'bg-slate-300')}
        >
          <span className={cn('absolute top-0.5 h-3 w-3 rounded-full bg-white shadow transition-all', showAvailability ? 'left-3.5' : 'left-0.5')} />
        </span>
        {t('explorer.showAvailability', 'Show availability')}
      </button>
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
              'inline-flex min-h-[44px] items-center gap-2 rounded-full border px-3 text-xs font-semibold shadow-sm transition-colors sm:min-h-[36px]',
              on ? 'border-primary bg-white text-slate-900 ring-2 ring-primary' : 'border-white/60 bg-white/90 text-slate-700 hover:bg-white'
            )}
          >
            <svg width="14" height="14" aria-hidden="true">
              <rect width="14" height="14" rx="3" fill={meta.color} />
              {/* Same motif as the polygon pattern, drawn once at swatch size. */}
              {motif(meta.pattern, 14, 1.6)}
            </svg>
            {label(state)}
            <span className="tabular-nums text-slate-500">{count}</span>
          </button>
        );
      })}
    </div>
  );
};
