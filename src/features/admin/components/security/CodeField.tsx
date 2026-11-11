import React, { useId } from 'react';
import { normalizeCode } from './codes';

interface CodeFieldProps {
  label: string;
  hint?: string;
  value: string;
  onChange: (code: string) => void;
  error?: string | null;
  autoFocus?: boolean;
}

/** A 6-digit code field: digits only, phone keypad, browser one-time-code autofill. */
export const CodeField: React.FC<CodeFieldProps> = ({ label, hint, value, onChange, error, autoFocus }) => {
  const id = useId();
  const describedBy = [hint ? `${id}-hint` : '', error ? `${id}-error` : ''].filter(Boolean).join(' ') || undefined;
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-800">{label}</label>
      {hint && <p id={`${id}-hint`} className="mt-0.5 text-xs text-gray-500">{hint}</p>}
      <input
        id={id}
        value={value}
        onChange={(e) => onChange(normalizeCode(e.target.value))}
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={7}
        autoFocus={autoFocus}
        aria-invalid={!!error}
        aria-describedby={describedBy}
        placeholder="123456"
        className="mt-1 min-h-[44px] w-40 rounded-lg border border-gray-300 px-3 text-center font-mono text-lg tracking-[0.3em]"
      />
      {error && <p id={`${id}-error`} role="alert" className="mt-1 text-sm text-red-700">{error}</p>}
    </div>
  );
};
