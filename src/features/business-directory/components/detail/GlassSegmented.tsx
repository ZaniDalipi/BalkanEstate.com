import React from 'react';

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  Icon?: React.FC<{ className?: string }>;
}

interface GlassSegmentedProps<T extends string> {
  options: Array<SegmentOption<T>>;
  value: T;
  onChange: (value: T) => void;
  label: string;
  /** "sm" sits on the map; "md" is a full-width control. */
  size?: 'sm' | 'md';
  className?: string;
}

/** An iOS-style segmented control on glass; arrow keys move between options. */
export function GlassSegmented<T extends string>({ options, value, onChange, label, size = 'md', className = '' }: GlassSegmentedProps<T>) {
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const i = options.findIndex((o) => o.value === value);
    const next = options[(i + (e.key === 'ArrowRight' ? 1 : options.length - 1)) % options.length];
    onChange(next.value);
  };
  const pad = size === 'sm' ? 'min-h-[36px] px-3 text-[13px]' : 'min-h-[44px] px-3 text-sm';

  return (
    <div
      role="radiogroup"
      aria-label={label}
      onKeyDown={onKeyDown}
      className={`inline-flex gap-0.5 rounded-full bg-white/75 p-1 shadow-[0_6px_20px_-8px_rgba(15,23,42,0.35)] ring-1 ring-black/[0.06] backdrop-blur-xl ${className}`}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(o.value)}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-full font-semibold transition ${pad} ${
              active ? 'bg-white text-neutral-900 shadow-sm ring-1 ring-black/[0.04]' : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            {o.Icon && <o.Icon className="h-4 w-4" />}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
