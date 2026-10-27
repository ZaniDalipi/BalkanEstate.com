import React from 'react';
import { cn } from '@/src/lib/utils';

export interface ChipOption<V extends string | number> {
  value: V;
  label: string;
  /** Optional leading swatch (e.g. availability colour) — never the only cue. */
  swatchClass?: string;
}

interface ChipGroupProps<V extends string | number> {
  label: string;
  options: ChipOption<V>[];
  selected: readonly V[];
  onToggle: (value: V) => void;
}

/** A labelled group of toggle chips (aria-pressed), 44px touch targets. */
export function ChipGroup<V extends string | number>({ label, options, selected, onToggle }: ChipGroupProps<V>) {
  if (options.length === 0) return null;
  return (
    <fieldset className="min-w-0">
      <legend className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</legend>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => {
          const on = selected.includes(o.value);
          return (
            <button
              key={String(o.value)}
              type="button"
              onClick={() => onToggle(o.value)}
              aria-pressed={on}
              className={cn(
                'inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-1.5 rounded-lg border px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:min-h-[36px]',
                on
                  ? 'border-primary bg-primary text-white'
                  : 'border-slate-200 bg-white text-slate-800 hover:border-primary/50'
              )}
            >
              {o.swatchClass && <span className={cn('h-2.5 w-2.5 rounded-full', o.swatchClass)} aria-hidden="true" />}
              {o.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
