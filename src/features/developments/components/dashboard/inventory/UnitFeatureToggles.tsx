import React from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/src/lib/utils';
import { UNIT_FEATURES } from '../../../types';

/** The "big terrace / duplex …" feature chips buyers filter on. */
export const UnitFeatureToggles: React.FC<{ value: string[]; onChange: (next: string[]) => void }> = ({ value, onChange }) => {
  const { t } = useTranslation('developments');
  const toggle = (f: string) => onChange(value.includes(f) ? value.filter((x) => x !== f) : [...value, f]);
  return (
    <div>
      <span className="mb-1.5 block text-sm font-medium text-gray-700">{t('filters.apartmentType')}</span>
      <div className="flex flex-wrap gap-1.5">
        {UNIT_FEATURES.map((f) => {
          const on = value.includes(f);
          return (
            <button
              key={f}
              type="button"
              onClick={() => toggle(f)}
              aria-pressed={on}
              className={cn(
                'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                on ? 'border-primary bg-primary text-primary-foreground' : 'border-input text-gray-600 hover:border-primary/50'
              )}
            >
              {t(`feature.${f}`, f.replace(/_/g, ' '))}
            </button>
          );
        })}
      </div>
    </div>
  );
};
