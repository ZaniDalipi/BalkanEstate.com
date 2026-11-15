import React from 'react';
import { useTranslation } from 'react-i18next';

interface OpenHouseFilterToggleProps {
  active: boolean;
  onToggle: () => void;
}

/** Optional search filter: only homes with an upcoming open house. Off by default. */
const OpenHouseFilterToggle: React.FC<OpenHouseFilterToggleProps> = ({ active, onToggle }) => {
  const { t } = useTranslation('search');
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onToggle}
      className={`flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
        active ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50'
      }`}
    >
      <svg aria-hidden="true" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3z" />
      </svg>
      {t('filters.openHouse', { defaultValue: 'Open house coming up' })}
    </button>
  );
};

export default OpenHouseFilterToggle;
