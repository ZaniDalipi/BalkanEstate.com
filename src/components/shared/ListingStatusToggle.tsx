// ListingStatusToggle - "On the market / Sold / Both" segmented control
//
// Shared by the buy, rental and luxury villa searches. Sold and rented homes
// stay on the site as the price history of their street; this is how a visitor
// asks to see them. Each page names the options for its own market.

import React from 'react';
import type { SaleStatusFilter } from '@/src/shared/types';

interface ListingStatusToggleProps {
  value: SaleStatusFilter | undefined;
  onChange: (value: SaleStatusFilter) => void;
  /** Accessible name and visible label, e.g. "Show". */
  label: string;
  /** Labels for the three options, in order: on the market, closed, both. */
  optionLabels: Record<SaleStatusFilter, string>;
  /** Shown under the control while sold or rented homes are included. */
  hint?: string;
  /** Visible label above the control; hidden (still announced) when false. */
  showLabel?: boolean;
  className?: string;
}

const ORDER: readonly SaleStatusFilter[] = ['available', 'closed', 'all'];

const ListingStatusToggle: React.FC<ListingStatusToggleProps> = ({
  value,
  onChange,
  label,
  optionLabels,
  hint,
  showLabel = true,
  className = '',
}) => {
  const selected = value ?? 'available';
  return (
    <div className={className}>
      {showLabel && <p className="block text-xs font-medium text-neutral-700 mb-1">{label}</p>}
      <div role="radiogroup" aria-label={label} className="flex gap-1 p-1 bg-neutral-100 rounded-lg">
        {ORDER.map((option) => {
          const isSelected = selected === option;
          return (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => onChange(option)}
              className={`flex-1 py-1.5 px-2 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                isSelected ? 'bg-white shadow-sm text-neutral-900' : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              {optionLabels[option]}
            </button>
          );
        })}
      </div>
      {hint && selected !== 'available' && <p className="mt-1 text-[11px] text-neutral-500">{hint}</p>}
    </div>
  );
};

export default ListingStatusToggle;
