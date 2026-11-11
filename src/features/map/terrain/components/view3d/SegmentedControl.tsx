/** A small labelled row of toggle buttons over the 3D view ("Height ×1 ×2 ×3", "View: blocks / surface"). */
import React from 'react';

export interface SegmentedControlProps<T extends string | number> {
  label: string;
  options: ReadonlyArray<{ value: T; text: string }>;
  value: T;
  onChange: (value: T) => void;
}

function SegmentedControl<T extends string | number>({ label, options, value, onChange }: SegmentedControlProps<T>) {
  return (
    <div role="group" aria-label={label} className="flex items-center gap-1 p-1 rounded-full bg-white/95 shadow-lg">
      <span className="pl-2 pr-1 text-xs font-semibold text-gray-600">{label}</span>
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          onClick={() => onChange(o.value)}
          aria-pressed={value === o.value}
          className={`min-w-11 min-h-11 px-3 rounded-full text-xs font-bold tabular-nums whitespace-nowrap transition-colors ${
            value === o.value ? 'bg-emerald-600 text-white' : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          {o.text}
        </button>
      ))}
    </div>
  );
}

export default SegmentedControl;
