import React, { useId } from 'react';
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
 * A labeled, accessible <select> matching the project's Input styling
 * (label + required marker + inline error). Keeps every dropdown in the
 * developments feature visually consistent with the rest of the app's forms.
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
      <select
        id={selectId}
        required={required}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={errorId}
        className={cn(
          'min-h-[44px] w-full rounded-lg border bg-background px-3 text-sm transition-colors sm:min-h-[40px]',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          'disabled:cursor-not-allowed disabled:bg-gray-100 disabled:opacity-60',
          error ? 'border-red-400' : 'border-input',
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
      {error && (
        <p id={errorId} className="mt-1 text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
};
