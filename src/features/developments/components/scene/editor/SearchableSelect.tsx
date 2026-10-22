import React, { useId, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Search, X } from 'lucide-react';
import { cn } from '@/src/lib/utils';

export interface SelectOption {
  id: string;
  label: string;
  /** Secondary line, e.g. "Building A · Floor 3". */
  hint?: string;
  /** Leading dot colour class, e.g. an availability dot. */
  dotClass?: string;
}

interface SearchableSelectProps {
  label: string;
  options: SelectOption[];
  value: string;
  onChange: (id: string) => void;
}

const MAX_SHOWN = 80;

/** A filterable single-choice list — usable with hundreds of units. */
export const SearchableSelect: React.FC<SearchableSelectProps> = ({ label, options, value, onChange }) => {
  const { t } = useTranslation('developments');
  const [q, setQ] = useState('');
  const listId = useId();
  const current = options.find((o) => o.id === value);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = needle
      ? options.filter((o) => o.label.toLowerCase().includes(needle) || o.hint?.toLowerCase().includes(needle))
      : options;
    return list.slice(0, MAX_SHOWN);
  }, [options, q]);

  return (
    <div className="space-y-2">
      {current ? (
        <div className="flex items-center justify-between gap-2 rounded-lg border border-primary/40 bg-primary/5 px-2 py-1 text-sm">
          <span className="min-w-0 truncate text-slate-800">{current.label}</span>
          <button
            type="button"
            onClick={() => onChange('')}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-slate-500 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-label={t('editor.link.clear', 'Remove link')}
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      ) : (
        <p className="text-xs font-medium text-red-600">{t('editor.issues.missing_link', 'Missing link')}</p>
      )}
      <div className="relative">
        <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t('editor.link.search', 'Search…')}
          aria-label={label}
          aria-controls={listId}
          className="min-h-[44px] w-full rounded-lg border border-slate-300 bg-white pl-8 pr-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:min-h-[36px]"
        />
      </div>
      <ul id={listId} role="listbox" aria-label={label} className="max-h-48 overflow-y-auto rounded-lg border border-slate-200">
        {filtered.length === 0 && <li className="px-3 py-2 text-xs text-slate-500">{t('editor.link.noResults', 'No matches.')}</li>}
        {filtered.map((o) => {
          const selected = o.id === value;
          return (
            <li key={o.id} role="option" aria-selected={selected}>
              <button
                type="button"
                onClick={() => onChange(o.id)}
                className={cn(
                  'flex min-h-[44px] w-full items-center gap-2 px-2 text-left text-sm hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:outline-none sm:min-h-[36px]',
                  selected && 'bg-primary/5'
                )}
              >
                {o.dotClass && <span className={cn('h-2.5 w-2.5 shrink-0 rounded-full', o.dotClass)} aria-hidden="true" />}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-slate-800">{o.label}</span>
                  {o.hint && <span className="block truncate text-xs text-slate-500">{o.hint}</span>}
                </span>
                {selected && <Check className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
};
