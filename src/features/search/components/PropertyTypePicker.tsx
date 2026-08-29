import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  PROPERTY_TYPES,
  PROPERTY_TYPE_GROUPS,
  PROPERTY_TYPE_VALUES,
  type PropertyTypeValue,
} from '@/constants/propertyTypes';

interface PropertyTypePickerProps {
  /** Currently applied types. An empty array means "any type". */
  value: PropertyTypeValue[];
  /** Fired when the user applies a new selection. */
  onChange: (value: PropertyTypeValue[]) => void;
  label?: string;
  className?: string;
}

/**
 * Multi-select property-type filter.
 *
 * The draft selection is local until the user hits Apply, so tapping through
 * several types costs one search rather than one per checkbox. Closing the
 * popover any other way (Escape, outside click, blur) discards the draft.
 *
 * "Everything selected" and "nothing selected" both mean the same thing to the
 * query layer — no type filter — so the trigger label collapses them into
 * "All types" and Apply normalises a full selection back to an empty array.
 */
const PropertyTypePicker: React.FC<PropertyTypePickerProps> = ({
  value,
  onChange,
  label,
  className = '',
}) => {
  const { t } = useTranslation(['search', 'property']);
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState<PropertyTypeValue[]>(value);
  const containerRef = useRef<HTMLDivElement>(null);
  const panelId = useId();

  // Re-sync when the filter changes elsewhere (reset button, URL, saved search).
  useEffect(() => {
    if (!isOpen) setDraft(value);
  }, [value, isOpen]);

  const close = useCallback(() => {
    setIsOpen(false);
    setDraft(value);
  }, [value]);

  // Outside click / Escape both close without applying.
  useEffect(() => {
    if (!isOpen) return;
    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) close();
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen, close]);

  const allSelected = draft.length === PROPERTY_TYPE_VALUES.length;

  const toggleType = useCallback((type: PropertyTypeValue) => {
    setDraft(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type],
    );
  }, []);

  const toggleAll = useCallback(() => {
    setDraft(prev =>
      prev.length === PROPERTY_TYPE_VALUES.length ? [] : [...PROPERTY_TYPE_VALUES],
    );
  }, []);

  const apply = useCallback(() => {
    // A full selection filters nothing, so store it as "any".
    onChange(draft.length === PROPERTY_TYPE_VALUES.length ? [] : draft);
    setIsOpen(false);
  }, [draft, onChange]);

  const groupedTypes = useMemo(
    () =>
      PROPERTY_TYPE_GROUPS.map(group => ({
        group,
        types: PROPERTY_TYPES.filter(pt => pt.group === group),
      })).filter(g => g.types.length > 0),
    [],
  );

  const triggerLabel = useMemo(() => {
    if (value.length === 0) return t('search:propertyTypePicker.allTypes', 'All types');
    if (value.length === 1) {
      const match = PROPERTY_TYPES.find(pt => pt.value === value[0]);
      return match ? t(match.labelKey, value[0]) : value[0];
    }
    return t('search:propertyTypePicker.typesSelected', { count: value.length });
  }, [value, t]);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <label className="block text-xs font-medium text-neutral-700 mb-1">
        {label ?? t('search:propertyTypePicker.title', 'Property Type')}
      </label>

      <button
        type="button"
        onClick={() => (isOpen ? close() : setIsOpen(true))}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-controls={panelId}
        className={`w-full flex items-center justify-between gap-2 px-3 h-10 rounded-full border text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
          value.length > 0
            ? 'bg-primary/5 border-primary text-primary'
            : 'bg-white border-neutral-200 text-neutral-700 hover:border-neutral-300'
        }`}
      >
        <span className="truncate">{triggerLabel}</span>
        <svg
          className={`w-4 h-4 flex-shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div
          id={panelId}
          role="group"
          aria-label={t('search:propertyTypePicker.title', 'Property Type')}
          className="absolute z-40 mt-2 w-full min-w-[240px] bg-white rounded-2xl shadow-xl border border-neutral-200 overflow-hidden animate-fade-in"
        >
          <div className="flex items-center justify-between px-4 py-3 bg-neutral-50 border-b border-neutral-100">
            <span className="text-sm font-semibold text-neutral-700">
              {t('search:propertyTypePicker.title', 'Property Type')}
            </span>
            <button
              type="button"
              onClick={toggleAll}
              className="text-sm font-semibold text-primary hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded"
            >
              {allSelected
                ? t('search:propertyTypePicker.deselectAll', 'Deselect All')
                : t('search:propertyTypePicker.selectAll', 'Select All')}
            </button>
          </div>

          <div className="max-h-72 overflow-y-auto py-1">
            {groupedTypes.map(({ group, types }) => (
              <div key={group}>
                <p className="px-4 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wide text-neutral-400">
                  {t(`property:typeGroups.${group}`, group)}
                </p>
                {types.map(({ value: typeValue, labelKey }) => {
                  const checked = draft.includes(typeValue);
                  return (
                    <label
                      key={typeValue}
                      className="flex items-center gap-3 px-4 py-2 cursor-pointer hover:bg-neutral-50 transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleType(typeValue)}
                        className="w-4 h-4 rounded border-neutral-300 text-primary accent-primary focus:ring-primary/40 cursor-pointer"
                      />
                      <span className="text-sm text-neutral-700">{t(labelKey, typeValue)}</span>
                    </label>
                  );
                })}
              </div>
            ))}
          </div>

          <div className="p-3 border-t border-neutral-100">
            <button
              type="button"
              onClick={apply}
              className="w-full h-10 rounded-full bg-primary text-white text-sm font-semibold hover:bg-primary-dark transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              {t('search:propertyTypePicker.apply', 'Apply')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default React.memo(PropertyTypePicker);
