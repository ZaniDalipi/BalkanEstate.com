import React, { useId, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { SoftIcon } from '@/src/shared/illustrations';
import { useEscapeLayer } from '@/src/features/developments/components/public/explorer/useEscapeLayer';
import { useServiceAreaSearch } from './useServiceAreaSearch';

interface ServiceAreaSearchProps {
  areas: string[];
  onAdd: (area: string) => void;
  className?: string;
}

/**
 * Type-ahead for an agent's service areas. Finds every country, city and
 * village the site-wide search knows, plus Google / OpenStreetMap places.
 */
const ServiceAreaSearch: React.FC<ServiceAreaSearchProps> = ({ areas, onAdd, className = '' }) => {
  const { t } = useTranslation(['account']);
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const s = useServiceAreaSearch(areas, onAdd);
  const showList = s.open && (s.options.length > 0 || s.canAddTyped || s.isTaken);

  useEscapeLayer(rootRef, s.close, showList);

  return (
    <div
      ref={rootRef}
      className="relative"
      onBlur={(e) => { if (!rootRef.current?.contains(e.relatedTarget as Node)) s.close(); }}
    >
      <input
        type="text"
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={showList && s.options[s.active] ? `${listId}-${s.active}` : undefined}
        aria-label={t('agent.addServiceArea', 'Add service area...')}
        value={s.query}
        onChange={(e) => s.change(e.target.value)}
        onFocus={() => s.setOpen(true)}
        onKeyDown={s.onKeyDown}
        placeholder={t('agent.searchServiceArea', 'Search a country, city or village...')}
        autoComplete="off"
        className={`w-full min-h-[44px] ${className}`}
      />
      {s.isSearching && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2" aria-hidden="true">
          <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {showList && (
        <ul id={listId} role="listbox" className="absolute z-50 w-full mt-1 bg-white border border-neutral-200 rounded-xl shadow-lg max-h-64 overflow-y-auto">
          {s.options.map((option, i) => (
            <li key={option.id} id={`${listId}-${i}`} role="option" aria-selected={i === s.active}>
              <button
                type="button"
                onMouseEnter={() => s.setActive(i)}
                onClick={() => s.pick(option)}
                className={`w-full min-h-[44px] text-left px-4 py-2.5 flex items-start gap-2 ${i === s.active ? 'bg-neutral-100' : ''}`}
              >
                <SoftIcon name="pin" className="w-5 h-5 flex-shrink-0" />
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-neutral-900 truncate">{option.title}</span>
                  {option.subtitle && <span className="block text-xs text-neutral-500 truncate">{option.subtitle}</span>}
                </span>
              </button>
            </li>
          ))}
          {s.canAddTyped && (
            <li role="option" aria-selected="false">
              <button type="button" onClick={() => s.pick()} className="w-full min-h-[44px] text-left px-4 py-2.5 text-sm text-primary font-medium">
                {t('agent.addTypedServiceArea', { area: s.typed, defaultValue: 'Add "{{area}}"' })}
              </button>
            </li>
          )}
          {s.isTaken && s.options.length === 0 && (
            <li role="alert" className="px-4 py-2.5 text-sm text-neutral-500">
              {t('agent.serviceAreaAlreadyAdded', 'Already in your service areas')}
            </li>
          )}
        </ul>
      )}
    </div>
  );
};

export default ServiceAreaSearch;
