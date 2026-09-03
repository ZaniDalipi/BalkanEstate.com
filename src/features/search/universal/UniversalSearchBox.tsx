import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ClockIcon,
  GlobeAltIcon,
  HomeIcon,
  MapPinIcon,
  SearchIcon,
  SpinnerIcon,
  XMarkIcon,
} from '@/constants';
import type { Property } from '@/types';
import type { Coordinates } from '@/shared/geo';
import { splitHighlights } from '@/shared/search';
import { useUniversalSearch } from './useUniversalSearch';
import { forgetSearch, rememberSearch } from './recentSearches';
import type { Suggestion } from './types';

/**
 * The omnibox.
 *
 * One text field that answers with places, listings and the search itself,
 * behaving the way people have been trained by twenty years of Google to
 * expect: results while you type, the matched text in bold, ↑/↓ to walk the
 * list across group boundaries, Enter to take the highlighted row or — when
 * nothing is highlighted — to just run what was typed, and Escape to get out.
 *
 * Nothing here decides what a selection *means*. The parent gets the picked
 * suggestion and applies it: fly the map, open a listing, run a search. That
 * keeps one component usable from the search page, the hero and the mobile
 * filter sheet, which is the point — a Google-style box that behaves
 * differently on three screens is three boxes.
 */

interface UniversalSearchBoxProps {
  value: string;
  onValueChange: (value: string) => void;
  /** A suggestion was picked, by click or by Enter on a highlighted row. */
  onSelect: (suggestion: Suggestion) => void;
  /** Enter pressed with nothing highlighted — run the text as typed. */
  onSubmit?: (query: string) => void;
  properties?: readonly Property[];
  country?: string;
  near?: Coordinates | null;
  placeholder?: string;
  variant?: 'default' | 'bare' | 'hero';
  autoFocus?: boolean;
  className?: string;
  inputClassName?: string;
  /** Ask the geocoder for places beyond the app's own gazetteer. */
  useGeocoder?: boolean;
  'aria-label'?: string;
}

const ICONS: Record<Suggestion['type'], React.FC<{ className?: string }>> = {
  query: SearchIcon,
  place: MapPinIcon,
  property: HomeIcon,
  recent: ClockIcon,
};

/** Places the app holds itself get an icon that says what kind of place it is. */
const iconFor = (suggestion: Suggestion): React.FC<{ className?: string }> => {
  if (suggestion.type === 'place' && suggestion.place?.kind === 'country') return GlobeAltIcon;
  return ICONS[suggestion.type];
};

/** The typed part of a suggestion, in bold — the reason the row is listed. */
const Highlighted: React.FC<{ text: string; query: string }> = ({ text, query }) => {
  const parts = useMemo(() => splitHighlights(text, query), [text, query]);

  return (
    <>
      {parts.map((part, index) =>
        part.match ? (
          <strong key={index} className="font-semibold text-neutral-900">
            {part.text}
          </strong>
        ) : (
          <React.Fragment key={index}>{part.text}</React.Fragment>
        )
      )}
    </>
  );
};

const INPUT_STYLES: Record<NonNullable<UniversalSearchBoxProps['variant']>, string> = {
  default:
    'block w-full bg-white border border-neutral-300 rounded-xl text-neutral-900 text-sm px-3 py-2 pl-9 pr-9 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all placeholder:text-neutral-400',
  bare:
    'block w-full text-base bg-transparent border-none text-neutral-900 px-9 py-1 focus:outline-none focus:ring-0 placeholder:text-neutral-400',
  hero:
    'block w-full bg-white/90 backdrop-blur-sm border border-white/60 rounded-full text-neutral-900 text-base px-5 py-3 pl-11 pr-10 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/40 shadow-lg transition-all placeholder:text-neutral-500',
};

const UniversalSearchBox: React.FC<UniversalSearchBoxProps> = ({
  value,
  onValueChange,
  onSelect,
  onSubmit,
  properties,
  country,
  near,
  placeholder,
  variant = 'default',
  autoFocus = false,
  className = '',
  inputClassName = '',
  useGeocoder = true,
  'aria-label': ariaLabel,
}) => {
  const { t } = useTranslation(['search']);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxId = useId();

  const { groups, suggestions, isSearching, refreshRecents } = useUniversalSearch({
    query: value,
    properties,
    country,
    near,
    enabled: isOpen,
    useGeocoder,
  });

  // A changed result set invalidates the highlight: keeping index 2 while the
  // list under it changes is how a user ends up opening the wrong listing.
  useEffect(() => {
    setActiveIndex(-1);
  }, [value]);

  useEffect(() => {
    if (activeIndex >= suggestions.length) setActiveIndex(-1);
  }, [suggestions.length, activeIndex]);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setActiveIndex(-1);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
    };
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setActiveIndex(-1);
  }, []);

  const choose = useCallback(
    (suggestion: Suggestion) => {
      // What goes in the box is the canonical spelling of what was picked, so
      // the text the user is left looking at is the text the app searched.
      const nextValue =
        suggestion.type === 'place'
          ? suggestion.searchValue
          : suggestion.type === 'recent'
            ? suggestion.text
            : suggestion.type === 'query'
              ? suggestion.text
              : value;

      if (suggestion.type !== 'property') {
        onValueChange(nextValue);
        rememberSearch(nextValue);
        refreshRecents();
      }

      close();
      onSelect(suggestion);
    },
    [value, onValueChange, onSelect, close, refreshRecents]
  );

  const submit = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed) return;

    rememberSearch(trimmed);
    refreshRecents();
    close();
    onSubmit?.(trimmed);
  }, [value, onSubmit, close, refreshRecents]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      if (suggestions.length === 0) return;
      event.preventDefault();
      setIsOpen(true);

      // Wraps at both ends, and steps off the top back to the raw input so the
      // user can always get back to editing what they typed.
      const step = event.key === 'ArrowDown' ? 1 : -1;
      setActiveIndex((current) => {
        const next = current + step;
        if (next < -1) return suggestions.length - 1;
        if (next >= suggestions.length) return -1;
        return next;
      });
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      const active = activeIndex >= 0 ? suggestions[activeIndex] : undefined;
      if (active) choose(active);
      else submit();
      return;
    }

    if (event.key === 'Escape') {
      close();
      inputRef.current?.blur();
    }
  };

  const clear = () => {
    onValueChange('');
    setActiveIndex(-1);
    inputRef.current?.focus();
  };

  const dropdownVisible = isOpen && suggestions.length > 0;
  const iconSize = variant === 'bare' ? 'h-5 w-5' : 'h-4 w-4';
  const iconInset = variant === 'hero' ? 'pl-4' : variant === 'bare' ? 'pl-2' : 'pl-3';

  let flatIndex = -1;

  return (
    <div className={`relative ${className}`} ref={wrapperRef}>
      <div className={`pointer-events-none absolute inset-y-0 left-0 flex items-center ${iconInset}`}>
        <SearchIcon className={`${iconSize} text-neutral-400`} />
      </div>

      <input
        ref={inputRef}
        type="text"
        name="query"
        role="combobox"
        aria-expanded={dropdownVisible}
        aria-controls={listboxId}
        aria-autocomplete="list"
        aria-activedescendant={activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined}
        aria-label={ariaLabel ?? t('search:searchLocation')}
        autoComplete="off"
        autoFocus={autoFocus}
        placeholder={placeholder ?? t('search:searchPlaceholder')}
        value={value}
        onChange={(event) => {
          onValueChange(event.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        onKeyDown={handleKeyDown}
        className={`${INPUT_STYLES[variant]} ${inputClassName}`}
      />

      <div className="absolute inset-y-0 right-0 flex items-center pr-2">
        {isSearching ? (
          <SpinnerIcon className={`${iconSize} text-primary`} />
        ) : value ? (
          <button
            type="button"
            onClick={clear}
            className="text-neutral-400 hover:text-neutral-800 transition-colors"
            aria-label={t('search:filters.clearAll')}
          >
            <XMarkIcon className={iconSize} />
          </button>
        ) : null}
      </div>

      {dropdownVisible && (
        <ul
          id={listboxId}
          role="listbox"
          aria-label={t('search:searchLocation')}
          // Near-opaque: this list sits over a map and over page content,
          // and anything that shows through it makes the rows hard to read.
          className="absolute z-30 w-full mt-1 bg-white/[0.98] backdrop-blur-xl border border-neutral-200/80 rounded-2xl shadow-2xl shadow-black/10 max-h-[26rem] overflow-y-auto py-1"
        >
          {groups.map((group) => (
            <React.Fragment key={group.labelKey || 'primary'}>
              {group.labelKey && (
                <li
                  role="presentation"
                  className="px-4 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-neutral-400"
                >
                  {t(group.labelKey)}
                </li>
              )}

              {group.suggestions.map((suggestion) => {
                flatIndex += 1;
                const index = flatIndex;
                const Icon = iconFor(suggestion);
                const isActive = index === activeIndex;

                return (
                  <li
                    key={suggestion.id}
                    id={`${listboxId}-option-${index}`}
                    role="option"
                    aria-selected={isActive}
                    // `mousedown` rather than `click`: the input's blur would
                    // otherwise close the list before the click landed.
                    onMouseDown={(event) => {
                      event.preventDefault();
                      choose(suggestion);
                    }}
                    onMouseEnter={() => setActiveIndex(index)}
                    className={`group flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors ${
                      isActive ? 'bg-neutral-100' : 'hover:bg-neutral-50'
                    }`}
                  >
                    <Icon className="w-4 h-4 text-neutral-400 flex-shrink-0" />

                    <div className="min-w-0 flex-1">
                      <div className="text-sm text-neutral-700 truncate">
                        {suggestion.type === 'query' ? (
                          suggestion.title
                        ) : (
                          <Highlighted text={suggestion.title} query={value} />
                        )}
                      </div>
                      {suggestion.subtitle && (
                        <div className="text-xs text-neutral-500 truncate">{suggestion.subtitle}</div>
                      )}
                    </div>

                    {suggestion.type === 'recent' && (
                      <button
                        type="button"
                        aria-label={t('search:suggestions.remove')}
                        onMouseDown={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          forgetSearch(suggestion.text);
                          refreshRecents();
                        }}
                        className="opacity-0 group-hover:opacity-100 text-neutral-400 hover:text-neutral-700 transition-opacity"
                      >
                        <XMarkIcon className="w-4 h-4" />
                      </button>
                    )}
                  </li>
                );
              })}
            </React.Fragment>
          ))}
        </ul>
      )}
    </div>
  );
};

export default UniversalSearchBox;
