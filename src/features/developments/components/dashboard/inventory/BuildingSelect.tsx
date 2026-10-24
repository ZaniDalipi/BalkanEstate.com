import React, { useId } from 'react';
import { useTranslation } from 'react-i18next';
import type { DevelopmentBuilding } from '../../../types';

interface BuildingSelectProps {
  buildings: DevelopmentBuilding[];
  value: string;
  onChange: (id: string) => void;
  className?: string;
}

const SELECT = 'min-h-[40px] w-full rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring';

/** Labelled building picker used by the quick-add forms. */
export const BuildingSelect: React.FC<BuildingSelectProps> = ({ buildings, value, onChange, className }) => {
  const { t } = useTranslation('developments');
  const id = useId();
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-gray-700">
        {t('detail.buildings')}
      </label>
      <select id={id} className={SELECT} value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">—</option>
        {buildings.map((b) => (
          <option key={b.id} value={b.id}>
            {b.name}
          </option>
        ))}
      </select>
    </div>
  );
};

export const selectClassName = SELECT;
