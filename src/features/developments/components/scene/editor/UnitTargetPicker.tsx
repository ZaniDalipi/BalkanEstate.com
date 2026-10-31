import React, { useEffect, useMemo, useState } from 'react';
import { useDebouncedValue } from '../../../hooks/useDebouncedValue';
import { useDevelopmentUnits } from '../../../hooks/useDevelopment';
import type { DashboardUnit } from '../../../types';
import type { UnitPickerSource } from './useLinkOptions';
import { SearchableSelect, type SelectOption } from './SearchableSelect';

interface UnitTargetPickerProps {
  developmentId: string;
  label: string;
  source: UnitPickerSource;
  /** The preloaded first page of units in scope. */
  baseOptions: SelectOption[];
  value: string;
  /** Display name of the linked unit when it is not in the first page. */
  currentLabel?: string;
  onChange: (id: string) => void;
}

const SEARCH_LIMIT = 50;

/**
 * Unit target for a region, at any inventory size: the first page is filtered
 * locally while typing; after 300 ms the term is searched on the server
 * (listUnits `search`, scoped to the view's building/floor) and those results
 * replace the list. Picked results are remembered so their labels resolve.
 */
export const UnitTargetPicker: React.FC<UnitTargetPickerProps> = ({
  developmentId,
  label,
  source,
  baseOptions,
  value,
  currentLabel,
  onChange,
}) => {
  const [q, setQ] = useState('');
  const term = useDebouncedValue(q.trim(), 300);
  const { units, total, isLoading } = useDevelopmentUnits(term ? developmentId : undefined, {
    ...source.scope,
    search: term,
    limit: SEARCH_LIMIT,
  });
  const found = term ? (units as DashboardUnit[]) : [];
  const { remember, toOption } = source;

  useEffect(() => {
    if (found.length > 0) remember(found);
  }, [found, remember]);

  const serverResults = !!term && !isLoading;
  const options = useMemo(() => (serverResults ? found.map(toOption) : baseOptions), [serverResults, found, toOption, baseOptions]);
  const pending = q.trim() !== term || (!!term && isLoading);

  return (
    <SearchableSelect
      label={label}
      options={options}
      value={value}
      onChange={onChange}
      query={q}
      onQueryChange={setQ}
      currentLabel={currentLabel}
      total={serverResults ? total : q.trim() ? undefined : source.total}
      busy={pending}
    />
  );
};
