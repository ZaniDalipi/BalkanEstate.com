import React, { useMemo } from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, leftIcon, rightIcon, className = '', id, required, ...props }, ref) => {
    const inputId = useMemo(() => id || `input-${Math.random().toString(36).substr(2, 9)}`, [id]);
    const errorId = useMemo(() => error ? `${inputId}-error` : undefined, [inputId, error]);
    const helperId = useMemo(() => helperText && !error ? `${inputId}-helper` : undefined, [inputId, helperText, error]);
    const describedBy = errorId || helperId || undefined;

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-gray-700 mb-1.5"
          >
            {label}
            {required && <span className="text-red-500 ml-0.5" aria-hidden="true">*</span>}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400" aria-hidden="true">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            required={required}
            aria-invalid={error ? 'true' : undefined}
            aria-describedby={describedBy}
            className={`
              block w-full rounded-lg border transition-colors duration-200
              focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-0
              disabled:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60
              min-h-[44px] sm:min-h-[40px]
              text-base sm:text-sm
              ${leftIcon ? 'pl-10' : 'pl-3 sm:pl-4'}
              ${rightIcon ? 'pr-10' : 'pr-3 sm:pr-4'}
              py-2.5 sm:py-2
              ${
                error
                  ? 'border-red-300 focus:border-red-500 focus-visible:ring-red-500/20'
                  : 'border-gray-300 focus:border-primary focus-visible:ring-primary/20'
              }
              ${className}
            `}
            {...props}
          />
          {rightIcon && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400" aria-hidden="true">
              {rightIcon}
            </div>
          )}
        </div>
        {error && (
          <p
            id={errorId}
            className="mt-1.5 text-sm text-red-600"
            role="alert"
          >
            {error}
          </p>
        )}
        {helperText && !error && (
          <p
            id={helperId}
            className="mt-1.5 text-sm text-gray-500"
          >
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
