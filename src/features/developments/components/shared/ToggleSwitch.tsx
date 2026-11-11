import React from 'react';
import { cn } from '@/src/lib/utils';

interface ToggleSwitchProps {
  id?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** Accessible name when no visible <label htmlFor> points at it. */
  label?: string;
  disabled?: boolean;
  describedBy?: string;
}

/**
 * An iOS-style on/off switch (51 × 31 pt track, white thumb). A real
 * `role="switch"` button, so Space/Enter toggle it and screen readers announce
 * on/off; the 44 px hit area surrounds the smaller track.
 */
export const ToggleSwitch: React.FC<ToggleSwitchProps> = ({ id, checked, onChange, label, disabled, describedBy }) => (
  <button
    id={id}
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    aria-describedby={describedBy}
    disabled={disabled}
    onClick={() => onChange(!checked)}
    className="group inline-flex h-11 min-w-[51px] shrink-0 items-center justify-center rounded-full focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
  >
    <span
      aria-hidden="true"
      className={cn(
        'relative h-[31px] w-[51px] rounded-full transition-colors duration-200 motion-reduce:transition-none',
        'group-focus-visible:ring-4 group-focus-visible:ring-primary/25',
        checked ? 'bg-emerald-500' : 'bg-slate-300'
      )}
    >
      <span
        className={cn(
          'absolute left-[2px] top-[2px] h-[27px] w-[27px] rounded-full bg-white shadow-[0_3px_8px_rgba(0,0,0,0.15),0_1px_1px_rgba(0,0,0,0.16)]',
          'transition-transform duration-200 ease-out motion-reduce:transition-none',
          checked ? 'translate-x-5' : 'translate-x-0'
        )}
      />
    </span>
  </button>
);
