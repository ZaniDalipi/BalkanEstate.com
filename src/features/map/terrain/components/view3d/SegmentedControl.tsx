/** A row of choices where one is on ("Slope | Satellite", "1× 2× 3×"), as a frosted pill over the 3D view. */
import React from 'react';
import { GLASS } from '../terrainStyles';

export interface SegmentedControlProps<T extends string | number> {
  /** What the choices are about; read out, not shown. */
  label: string;
  options: ReadonlyArray<{ value: T; text: string }>;
  value: T;
  onChange: (value: T) => void;
}

function SegmentedControl<T extends string | number>({ label, options, value, onChange }: SegmentedControlProps<T>) {
  return (
    <div role="group" aria-label={label} className={`flex items-center gap-0.5 rounded-full p-1 ${GLASS}`}>
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          onClick={() => onChange(o.value)}
          aria-pressed={value === o.value}
          className={`min-h-9 min-w-11 whitespace-nowrap rounded-full px-3.5 text-[13px] font-semibold tabular-nums transition ${
            value === o.value ? 'bg-gray-900 text-white shadow-sm' : 'text-gray-700 hover:bg-black/[0.06]'
          }`}
        >
          {o.text}
        </button>
      ))}
    </div>
  );
}

export default SegmentedControl;
