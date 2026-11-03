import React, { useId } from 'react';
import { ChevronsUpDown } from 'lucide-react';
import { cn } from '@/src/lib/utils';

export interface SelectOption {
  value: string;
  label: string;
}

interface FormSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  options: SelectOption[];
  error?: string;
  placeholder?: string;
}

/**
 * A labeled, accessible <select> styled like a macOS/iOS pop-up button and
 * matched to the shared Input: same height, border, radius, text size and
 * soft focus halo, with a ⇕ indicator inset from the edge instead of the
 * browser's own arrow. The native menu still opens, so phones get their wheel
 * picker and keyboards work as usual. The error sits under it (role="alert").
 */
export const FormSelect: React.FC<FormSelectProps> = ({
  label,
  options,
  error,
  placeholder,
  required,
  className,
  id,
  ...props
}) => {
  const autoId = useId();
  const selectId = id || autoId;
  const errorId = error ? `${selectId}-error` : undefined;

  return (
    <div className="w-full">
      <label htmlFor={selectId} className="mb-1.5 block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="ml-0.5 text-red-500" aria-hidden="true">*</span>}
      </label>
      <div className="relative">
        <select
          id={selectId}
          required={required}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={errorId}
          className={cn(
            'block min-h-[44px] w-full cursor-pointer appearance-none rounded-lg border bg-transparent py-2.5 pl-3 pr-10 text-base text-gray-900 transition-colors duration-200 sm:min-h-[40px] sm:py-2 sm:pl-4 sm:text-sm',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-0',
            'disabled:cursor-not-allowed disabled:bg-gray-100 disabled:opacity-60',
            error
              ? 'border-red-300 focus:border-red-500 focus-visible:ring-red-500/20'
              : 'border-gray-300 hover:border-gray-400 focus:border-primary focus-visible:ring-primary/20',
            className
          )}
          {...props}
        >
          {placeholder !== undefined && <option value="">{placeholder}</option>}
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronsUpDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden="true" />
      </div>
      {error && (
        <p id={errorId} role="alert" className="mt-1.5 text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
};
