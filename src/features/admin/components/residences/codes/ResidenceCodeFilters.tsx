import React from 'react';
import { useTranslation } from 'react-i18next';
import { Search } from 'lucide-react';
import type { ResidenceCodeFilter } from '../../../api/residenceCodeAdminApi';
import { useResidenceCodeText } from './useResidenceCodeText';

const FILTERS: ResidenceCodeFilter[] = ['all', 'active', 'used', 'expired', 'disabled'];

interface ResidenceCodeFiltersProps {
  status: ResidenceCodeFilter;
  onStatus: (s: ResidenceCodeFilter) => void;
  search: string;
  onSearch: (v: string) => void;
}

/** Find a code by its letters, and filter by where codes stand (chips scroll on phones). */
export const ResidenceCodeFilters: React.FC<ResidenceCodeFiltersProps> = ({ status, onStatus, search, onSearch }) => {
  const { t } = useTranslation(['admin']);
  const { filterLabel } = useResidenceCodeText();
  return (
    <div className="space-y-3">
      <label className="relative block">
        <span className="sr-only">{t('admin:residenceCodes.search', 'Find a code')}</span>
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden="true" />
        <input
          type="search"
          value={search}
          // Codes are letters, digits and dashes: anything else could never match.
          onChange={(e) => onSearch(e.target.value.replace(/[^A-Za-z0-9-]/g, '').slice(0, 40))}
          placeholder={t('admin:residenceCodes.searchPlaceholder', 'e.g. RES-7K3P')}
          className="min-h-[44px] w-full rounded-lg border border-gray-300 bg-white pl-9 pr-3 font-mono text-base uppercase focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm"
        />
      </label>
      <div role="group" aria-label={t('admin:residenceCodes.filterLabel', 'Status')} className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            aria-pressed={status === f}
            onClick={() => onStatus(f)}
            className={`min-h-[44px] shrink-0 rounded-full border px-4 text-sm font-medium transition-colors ${status === f ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'}`}
          >
            {filterLabel(f)}
          </button>
        ))}
      </div>
    </div>
  );
};
