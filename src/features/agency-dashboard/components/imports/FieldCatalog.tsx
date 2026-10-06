import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { FeedMappingConfig, FieldCatalogEntry } from '../../types/propertyImports';
import { inputClass } from './formatters';

interface FieldCatalogProps {
  entries: FieldCatalogEntry[];
  /** The mapping that read (or would read) the file; shows which field each path fills. */
  mapping?: FeedMappingConfig | null;
}

/** Strip predicates/wildcards so `desc/*` still marks `desc/en` as used. */
const matches = (mapped: string, path: string): boolean => {
  if (mapped === path) return true;
  const pattern = mapped.replace(/\[[^\]]*\]/g, '').split('/').map((seg) => (seg === '*' ? '[^/]+' : seg.replace(/[.*+?^${}()|\\]/g, '\\$&'))).join('/');
  return new RegExp(`^${pattern}$`, 'i').test(path);
};

/** Every element and attribute found in the file, with an example value and the field it fills. */
const FieldCatalog: React.FC<FieldCatalogProps> = ({ entries, mapping }) => {
  const { t } = useTranslation(['agencyDashboard']);
  const [query, setQuery] = useState('');
  const usedBy = useMemo(() => {
    const out = new Map<string, string[]>();
    for (const entry of entries) {
      const fields = Object.entries(mapping?.fields ?? {}).filter(([, p]) => p && matches(p, entry.path)).map(([f]) => f);
      if (fields.length) out.set(entry.path, fields);
    }
    return out;
  }, [entries, mapping]);
  const q = query.trim().toLowerCase();
  const shown = q ? entries.filter((e) => e.path.toLowerCase().includes(q) || e.sample.toLowerCase().includes(q)) : entries;

  return (
    <details className="rounded-lg border border-gray-200">
      <summary className="cursor-pointer select-none px-3 py-2 text-sm font-semibold text-gray-900">
        {t('agencyDashboard:imports.catalog.title', 'All fields in this file ({{count}})', { count: entries.length })}
      </summary>
      <div className="space-y-2 border-t border-gray-200 p-3">
        <p className="text-xs text-gray-500">
          {t('agencyDashboard:imports.catalog.help', 'Everything your file contains for a listing, with an example value. Fields marked "not used" are ignored — map them under Edit to import them.')}
        </p>
        <input className={inputClass} type="search" value={query} onChange={(e) => setQuery(e.target.value)}
          placeholder={t('agencyDashboard:imports.catalog.search', 'Search fields or values')}
          aria-label={t('agencyDashboard:imports.catalog.search', 'Search fields or values')} />
        <div className="max-h-96 overflow-auto">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-gray-50 text-gray-600">
              <tr>
                <th className="px-2 py-1.5 font-medium">{t('agencyDashboard:imports.catalog.path', 'Path')}</th>
                <th className="px-2 py-1.5 font-medium">{t('agencyDashboard:imports.catalog.example', 'Example')}</th>
                <th className="px-2 py-1.5 font-medium">{t('agencyDashboard:imports.catalog.usedFor', 'Imported as')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {shown.map((entry) => {
                const fields = usedBy.get(entry.path);
                return (
                  <tr key={entry.path}>
                    <td className="px-2 py-1.5 font-mono break-all text-gray-900">
                      {entry.path}{entry.repeated && <span className="ml-1 text-gray-400" title={t('agencyDashboard:imports.catalog.repeated', 'repeats within a listing')}>×n</span>}
                    </td>
                    <td className="px-2 py-1.5 break-words text-gray-700">{entry.sample || '—'}</td>
                    <td className="px-2 py-1.5">
                      {fields
                        ? <span className="text-green-700">{fields.map((f) => t(`agencyDashboard:imports.fields.${f}`, f)).join(', ')}</span>
                        : <span className="text-gray-400">{t('agencyDashboard:imports.catalog.unused', 'not used')}</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </details>
  );
};

export default FieldCatalog;
