import React, { useId } from 'react';

type FormFieldProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'id'> & {
  label: string;
  error?: string;
};

/** A labelled input with its error right underneath (role="alert"). */
const FormField: React.FC<FormFieldProps> = ({ label, error, className = '', ...input }) => {
  const id = useId();
  const errorId = `${id}-error`;
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-neutral-700">{label}</label>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={`min-h-[44px] w-full rounded-lg border px-3 text-base text-neutral-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 ${error ? 'border-red-400' : 'border-neutral-300'}`}
        {...input}
      />
      {error && <p id={errorId} role="alert" className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
};

export default FormField;
