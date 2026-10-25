import React, { useId } from 'react';
import { useTranslation } from 'react-i18next';
import type { SelectOption } from '../../shared/FormSelect';

interface BuildingSelectProps {
  /** Building options (see useStructureOptions). */
  options: SelectOption[];
  value: string;
  onChange: (id: string) => void;
  className?: string;
}

const SELECT = 'min-h-[40px] w-full rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring';

/** Labelled building picker used by the quick-add forms. */
export const BuildingSelect: React.FC<BuildingSelectProps> = ({ options, value, onChange, className }) => {
  const { t } = useTranslation('developments');
  const id = useId();
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-gray-700">
        {t('detail.buildings')}
      </label>
      <select id={id} className={SELECT} value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">—</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
};

export const selectClassName = SELECT;
