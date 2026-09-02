import React from 'react';
import { useTranslation } from 'react-i18next';
import { Globe2, Bookmark } from 'lucide-react';

export type ExploreCitiesTab = 'all' | 'saved';

export interface ExploreCitiesTabsProps {
  active: ExploreCitiesTab;
  savedCount: number;
  onChange: (tab: ExploreCitiesTab) => void;
}

const TAB_ORDER: readonly ExploreCitiesTab[] = ['all', 'saved'];

/**
 * Tab bar for /explore-cities: every city, or just the reader's saved places.
 *
 * A real tablist rather than two styled buttons — arrow keys move between tabs
 * and the selected state is announced, which is what a screen reader needs to
 * report "2 of 2" instead of an unlabelled button pair.
 */
const ExploreCitiesTabs: React.FC<ExploreCitiesTabsProps> = ({ active, savedCount, onChange }) => {
  const { t } = useTranslation(['exploreCities']);

  const labels: Record<ExploreCitiesTab, { text: string; icon: React.ReactNode }> = {
    all: { text: t('tabs.allCities', 'All cities'), icon: <Globe2 className="w-4 h-4" /> },
    saved: { text: t('tabs.savedPlaces', 'Saved places'), icon: <Bookmark className="w-4 h-4" /> },
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
    event.preventDefault();
    const index = TAB_ORDER.indexOf(active);
    const delta = event.key === 'ArrowRight' ? 1 : -1;
    onChange(TAB_ORDER[(index + delta + TAB_ORDER.length) % TAB_ORDER.length]);
  };

  return (
    <div
      role="tablist"
      aria-label={t('tabs.ariaLabel', 'Explore cities views')}
      onKeyDown={handleKeyDown}
      className="inline-flex items-center gap-1 p-1 bg-white/70 backdrop-blur-sm border border-neutral-200 rounded-2xl shadow-sm mb-6"
    >
      {TAB_ORDER.map(tab => {
        const selected = tab === active;
        return (
          <button
            key={tab}
            role="tab"
            id={`explore-cities-tab-${tab}`}
            aria-selected={selected}
            aria-controls={`explore-cities-panel-${tab}`}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(tab)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30 ${
              selected
                ? 'bg-primary text-white shadow'
                : 'text-neutral-600 hover:bg-neutral-100'
            }`}
          >
            {labels[tab].icon}
            {labels[tab].text}
            {tab === 'saved' && savedCount > 0 && (
              <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${
                selected ? 'bg-white/25 text-white' : 'bg-neutral-200 text-neutral-700'
              }`}>
                {savedCount}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default ExploreCitiesTabs;
