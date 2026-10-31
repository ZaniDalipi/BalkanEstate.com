import React from 'react';

/** A labelled multi-line input matching `Input`. */
export const TextArea: React.FC<{
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled: boolean;
}> = ({ label, value, onChange, disabled }) => {
  const id = React.useId();
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-gray-700">
        {label}
      </label>
      <textarea
        id={id}
        rows={5}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={10000}
        disabled={disabled}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:bg-slate-50"
      />
    </div>
  );
};
