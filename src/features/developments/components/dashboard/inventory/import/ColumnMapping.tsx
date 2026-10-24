import React from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/src/lib/utils';
import { IGNORE, IMPORT_FIELDS, type ColumnTarget } from '../../../../utils/csvImport';
import { fieldLabel } from './fieldLabels';

interface ColumnMappingProps {
  headers: string[];
  sample: string[][];
  columns: ColumnTarget[];
  onChange: (index: number, target: ColumnTarget) => void;
}

/** Each sheet column, what we recognised it as (changeable), and an example value. */
export const ColumnMapping: React.FC<ColumnMappingProps> = ({ headers, sample, columns, onChange }) => {
  const { t } = useTranslation('developments');
  return (
    <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2" aria-label={t('import.columns', 'Columns')}>
      {headers.map((h, i) => {
        const example = sample.map((r) => r[i]).find((v) => v);
        const recognised = columns[i] !== IGNORE;
        return (
          <li key={`${h}-${i}`} className={cn('rounded-xl border px-3 py-2', recognised ? 'border-emerald-200 bg-emerald-50/40' : 'border-slate-200 bg-white')}>
            <div className="flex items-center justify-between gap-2">
              <span className="min-w-0 truncate text-sm font-medium text-slate-900" title={h}>{h || t('import.unnamed', '(no name)')}</span>
              <select
                aria-label={t('import.columnFor', { name: h, defaultValue: 'Import “{{name}}” as' })}
                value={columns[i]}
                onChange={(e) => onChange(i, e.target.value as ColumnTarget)}
                className="max-w-[55%] rounded-md border border-slate-300 bg-white px-2 py-1 text-sm"
              >
                {[...IMPORT_FIELDS, IGNORE].map((f) => (
                  <option key={f} value={f}>{fieldLabel(t, f)}</option>
                ))}
              </select>
            </div>
            {example && <p className="mt-0.5 truncate text-xs text-slate-500">{t('import.example', { value: example, defaultValue: 'e.g. {{value}}' })}</p>}
          </li>
        );
      })}
    </ul>
  );
};
