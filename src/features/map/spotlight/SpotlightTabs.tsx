import React from 'react';
import { useTranslation } from 'react-i18next';

export type SpotlightTab = 'details' | 'route' | 'ask';
const TABS: readonly SpotlightTab[] = ['details', 'route', 'ask'];

/** Details · Route · Ask AI. */
const SpotlightTabs: React.FC<{ value: SpotlightTab; onChange: (tab: SpotlightTab) => void; idPrefix: string }> = ({ value, onChange, idPrefix }) => {
  const { t } = useTranslation(['search']);
  const label: Record<SpotlightTab, string> = {
    details: t('search:spotlight.tabs.details', 'Details'),
    route: t('search:spotlight.tabs.route', 'Route'),
    ask: t('search:spotlight.tabs.ask', 'Ask AI'),
  };
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const i = TABS.indexOf(value) + (e.key === 'ArrowRight' ? 1 : -1);
    onChange(TABS[(i + TABS.length) % TABS.length]);
  };
  return (
    <div role="tablist" onKeyDown={onKeyDown} className="grid grid-cols-3 gap-1 rounded-full bg-neutral-100 p-1">
      {TABS.map((tab) => (
        <button key={tab} type="button" role="tab" id={`${idPrefix}-tab-${tab}`} aria-controls={`${idPrefix}-panel`}
          aria-selected={value === tab} tabIndex={value === tab ? 0 : -1} onClick={() => onChange(tab)}
          className={`min-h-[40px] rounded-full text-sm font-semibold transition-colors ${value === tab ? 'bg-white text-primary shadow' : 'text-neutral-600'}`}>
          {label[tab]}
        </button>
      ))}
    </div>
  );
};

export default SpotlightTabs;
