import React from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/src/lib/utils';

interface AvailabilitySwitchProps {
  on: boolean;
  onToggle: () => void;
  /** `row`: a full-width settings row, label left and switch right (phones, below the picture). */
  layout: 'row' | 'pill';
}

/** "Show availability": colours every apartment by its availability instead of only on hover. */
export const AvailabilitySwitch: React.FC<AvailabilitySwitchProps> = ({ on, onToggle, layout }) => {
  const { t } = useTranslation('developments');
  const row = layout === 'row';
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={onToggle}
      className={cn(
        'inline-flex min-h-[44px] items-center gap-2 rounded-full border px-3 text-xs font-semibold shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:min-h-[36px]',
        row && 'col-span-full w-full justify-between rounded-xl px-4 text-sm sm:w-auto sm:justify-start sm:rounded-full sm:px-3 sm:text-xs',
        on ? 'border-teal-700 bg-teal-700 text-white' : 'border-white/60 bg-white/90 text-slate-700 hover:bg-white'
      )}
    >
      <span className={cn(row && 'order-first sm:order-last')}>{t('explorer.showAvailability', 'Show availability')}</span>
      <span aria-hidden="true" className={cn('relative h-4 w-7 shrink-0 rounded-full transition-colors', row && 'h-5 w-9 sm:order-first sm:h-4 sm:w-7', on ? 'bg-white/40' : 'bg-slate-300')}>
        <span
          className={cn(
            'absolute top-0.5 h-3 w-3 rounded-full bg-white shadow transition-all',
            row && 'h-4 w-4 sm:h-3 sm:w-3',
            on ? (row ? 'left-[1.125rem] sm:left-3.5' : 'left-3.5') : 'left-0.5'
          )}
        />
      </span>
    </button>
  );
};
