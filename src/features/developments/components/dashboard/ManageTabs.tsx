import React, { useCallback, useRef, useState } from 'react';
import { cn } from '@/src/lib/utils';
import { replaceQueryString } from '@/src/app/router/navigation';

export interface ManageTab<T extends string> {
  id: T;
  label: string;
}

/** Active tab mirrored into `?tab=` (first tab = no param). Unknown values fall back to the first tab. */
export function useTabParam<T extends string>(ids: readonly T[]): [T, (next: T) => void] {
  const [tab, setTab] = useState<T>(() => {
    const raw = typeof window === 'undefined' ? null : new URLSearchParams(window.location.search).get('tab');
    return ids.includes(raw as T) ? (raw as T) : ids[0];
  });
  const select = useCallback(
    (next: T) => {
      setTab(next);
      const params = new URLSearchParams(window.location.search);
      if (next === ids[0]) params.delete('tab');
      else params.set('tab', next);
      replaceQueryString(params);
    },
    [ids]
  );
  return [tab, select];
}

interface ManageTabsProps<T extends string> {
  tabs: ManageTab<T>[];
  active: T;
  onSelect: (id: T) => void;
  label: string;
  idPrefix: string;
}

export const tabId = (prefix: string, id: string) => `${prefix}-tab-${id}`;
export const panelId = (prefix: string, id: string) => `${prefix}-panel-${id}`;

/**
 * WAI-ARIA tablist (automatic activation): ←/→ move between tabs, Home/End
 * jump to the ends; only the active tab is in the tab order.
 */
export function ManageTabs<T extends string>({ tabs, active, onSelect, label, idPrefix }: ManageTabsProps<T>) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);

  const onKeyDown = (e: React.KeyboardEvent, index: number) => {
    const last = tabs.length - 1;
    const next =
      e.key === 'ArrowRight' ? (index === last ? 0 : index + 1)
      : e.key === 'ArrowLeft' ? (index === 0 ? last : index - 1)
      : e.key === 'Home' ? 0
      : e.key === 'End' ? last
      : null;
    if (next === null) return;
    e.preventDefault();
    onSelect(tabs[next].id);
    refs.current[next]?.focus();
  };

  return (
    <div role="tablist" aria-label={label} className="-mx-4 flex gap-1 overflow-x-auto border-b border-slate-200 px-4">
      {tabs.map((tab, i) => {
        const selected = tab.id === active;
        return (
          <button
            key={tab.id}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="tab"
            id={tabId(idPrefix, tab.id)}
            aria-selected={selected}
            aria-controls={panelId(idPrefix, tab.id)}
            tabIndex={selected ? 0 : -1}
            onClick={() => onSelect(tab.id)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={cn(
              '-mb-px min-h-[44px] whitespace-nowrap border-b-2 px-3 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary',
              selected ? 'border-primary text-primary' : 'border-transparent text-slate-600 hover:text-slate-900'
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
