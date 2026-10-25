import React from 'react';
import { useTranslation } from 'react-i18next';
import { Search } from 'lucide-react';
import type { AdminResidenceFilter } from '../../api/residenceAdminApi';
import { useResidenceAdminText } from './useResidenceAdminText';

const FILTERS: AdminResidenceFilter[] = ['all', 'public', 'offline', 'trial', 'pass', 'agency', 'draft'];

interface ResidenceFiltersProps {
  search: string;
  onSearch: (v: string) => void;
  filter: AdminResidenceFilter;
  onFilter: (f: AdminResidenceFilter) => void;
}

/** Search across the full width; the plan filters scroll as chips on phones and wrap on wider screens. */
export const ResidenceFilters: React.FC<ResidenceFiltersProps> = ({ search, onSearch, filter, onFilter }) => {
  const { t } = useTranslation(['admin']);
  const { filterLabel } = useResidenceAdminText();
  return (
    <div className="space-y-3">
      <label className="relative block">
        <span className="sr-only">{t('admin:residences.search', 'Search residences')}</span>
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden="true" />
        <input
          type="search"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder={t('admin:residences.searchPlaceholder', 'Name or city')}
          className="min-h-[44px] w-full rounded-lg border border-gray-300 bg-white pl-9 pr-3 text-base focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm"
        />
      </label>
      <div role="group" aria-label={t('admin:residences.filterLabel', 'Plan')} className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            aria-pressed={filter === f}
            onClick={() => onFilter(f)}
            className={`min-h-[44px] shrink-0 rounded-full border px-4 text-sm font-medium transition-colors ${filter === f ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'}`}
          >
            {filterLabel(f)}
          </button>
        ))}
      </div>
    </div>
  );
};
