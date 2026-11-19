import { useMemo, useState } from 'react';
import { useLocationSearch } from '@/src/features/seller/hooks/useLocationSearch';
import { validateSearchQuery } from '@/shared/utils/validation';
import { serviceAreaOptions, type ServiceAreaOption } from './serviceAreaOptions';

/**
 * State for the service-area search box: the query, the merged options and
 * which row the keyboard is on. Searches every covered country — no city or
 * country is passed, so nothing is narrowed or relabelled.
 */
export const useServiceAreaSearch = (areas: string[], onAdd: (area: string) => void) => {
  const { query, setQuery, suggestions, isSearching, reset } = useLocationSearch({});
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const options = useMemo(
    () => serviceAreaOptions(query, suggestions, areas),
    [query, suggestions, areas]
  );

  // What was typed, cleaned — offered as-is when no place matches, so an
  // agent is never stuck on an area no source knows about.
  const typed = validateSearchQuery(query).sanitized.trim();
  const isTaken = areas.some((area) => area.toLowerCase() === typed.toLowerCase());
  const canAddTyped = typed.length >= 2 && !isSearching && options.length === 0 && !isTaken;

  const change = (value: string) => {
    setQuery(value);
    setActive(0);
    setOpen(true);
  };

  const close = () => setOpen(false);

  const pick = (option?: ServiceAreaOption) => {
    const value = option?.value ?? (canAddTyped ? typed : '');
    if (!value) return;
    onAdd(value);
    setQuery('');
    reset();
    setActive(0);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(i + 1, Math.max(options.length - 1, 0)));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      pick(options[active]);
    }
  };

  return { query, change, options, active, setActive, open, setOpen, close, isSearching, canAddTyped, typed, isTaken, pick, onKeyDown };
};
