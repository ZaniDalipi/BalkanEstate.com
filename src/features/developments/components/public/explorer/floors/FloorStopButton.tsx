import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Building2, LayoutGrid } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import type { FloorStop } from './floorStack';

interface FloorStopButtonProps {
  /** A floor, or the whole building (null). */
  stop: FloorStop | null;
  on: boolean;
  layout: 'column' | 'row';
  onSelect: () => void;
  onPreview?: (floorId: string | null) => void;
}

const SPRING = { type: 'spring', stiffness: 420, damping: 32 } as const;
/** Column: the details show once the panel opens (hover, keyboard); closed, only the floor numbers do. */
const DETAIL = 'transition-opacity duration-200 motion-reduce:transition-none group-hover/floors:opacity-100 group-focus-within/floors:opacity-100 opacity-0';

/**
 * One stop of the building's elevator. In the column beside the full-screen
 * picture it is a numbered button (its name and free homes appear as the
 * panel opens); in the row on phones, a chip with its name.
 */
export const FloorStopButton: React.FC<FloorStopButtonProps> = ({ stop, on, layout, onSelect, onPreview }) => {
  const { t } = useTranslation('developments');
  const reduced = useReducedMotion();
  const column = layout === 'column';
  const name = stop ? stop.label : t('explorer.floors.whole', 'Whole building');
  const free = stop && stop.units > 0 ? t('explorer.availableCount', { count: stop.available, defaultValue: '{{count}} available' }) : '';
  const tone = on ? 'text-white' : 'text-slate-800 hover:bg-slate-100';

  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={[name, free].filter(Boolean).join(', ')}
      onClick={onSelect}
      onPointerEnter={stop && onPreview ? (e) => e.pointerType === 'mouse' && onPreview(stop.id) : undefined}
      onFocus={stop && onPreview ? () => onPreview(stop.id) : undefined}
      onBlur={stop && onPreview ? () => onPreview(null) : undefined}
      className={cn(
        'relative flex shrink-0 items-center gap-2 rounded-xl text-left text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
        column ? 'min-h-[44px] w-full pl-1 pr-2 landscape:min-h-[32px]' : 'min-h-[44px] px-3.5',
        tone
      )}
    >
      {on && <motion.span layoutId={`floor-picker-${layout}`} className="absolute inset-0 rounded-xl bg-slate-900" transition={reduced ? { duration: 0 } : SPRING} aria-hidden="true" />}
      {column ? (
        <span className="relative flex h-9 w-9 shrink-0 items-center justify-center text-[15px] font-bold tabular-nums landscape:h-7 landscape:w-7 landscape:text-[13px]" aria-hidden="true">
          {stop ? stop.level : <Building2 className="h-4 w-4" />}
          {stop && stop.available > 0 && <span className="absolute right-0.5 top-0.5 h-1.5 w-1.5 rounded-full bg-emerald-500" />}
        </span>
      ) : (
        !stop && <Building2 className="relative h-4 w-4 shrink-0" aria-hidden="true" />
      )}
      <span className={cn('relative min-w-0 flex-1', column && DETAIL)} aria-hidden="true">
        <span className="block truncate">{name}</span>
        {free && <span className={cn('block truncate text-[11px] font-medium landscape:hidden', on ? 'text-white/75' : 'text-emerald-700')}>{free}</span>}
      </span>
      {stop?.hasPicture && (
        <LayoutGrid className={cn('relative h-3.5 w-3.5 shrink-0', on ? 'text-white/80' : 'text-slate-400', column && DETAIL)} aria-label={t('explorer.floors.hasPlan', 'Has a floor plan')} role="img" />
      )}
    </button>
  );
};
