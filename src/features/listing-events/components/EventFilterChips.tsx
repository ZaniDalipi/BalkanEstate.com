import React from 'react';
import { useTranslation } from 'react-i18next';
import type { EventFilterValues } from '../utils/eventSearchParams';
import EventIcon from './EventIcon';

type Key = keyof EventFilterValues;

interface EventFilterChipsProps {
  filters: EventFilterValues;
  onFilterChange: <K extends Key>(name: K, value: EventFilterValues[K]) => void;
}

interface Chip {
  id: string;
  kind: 'openHouse' | 'auction';
  label: string;
  active: boolean;
  toggle: () => void;
}

/**
 * Optional quick filters: open house (this weekend / any), auction (any /
 * this week). All off by default; each pair works like a radio you can clear.
 */
const EventFilterChips: React.FC<EventFilterChipsProps> = ({ filters, onFilterChange }) => {
  const { t } = useTranslation('search');
  const setOpenHouse = (mode: 'weekend' | 'any' | null) => {
    onFilterChange('openHouseWeekend', mode === 'weekend' ? true : null);
    onFilterChange('hasOpenHouse', mode === 'any' ? true : null);
  };
  const setAuction = (mode: 'week' | 'any' | null) => {
    onFilterChange('auctionWithinDays', mode === 'week' ? 7 : null);
    onFilterChange('hasAuction', mode === 'any' ? true : null);
  };
  const weekend = filters.openHouseWeekend === true;
  const anyOh = !weekend && filters.hasOpenHouse === true;
  const week = filters.auctionWithinDays === 7;
  const anyAuction = !week && filters.hasAuction === true;

  const chips: Chip[] = [
    { id: 'oh-weekend', kind: 'openHouse', label: t('filters.openHouseWeekend', { defaultValue: 'Open house this weekend' }), active: weekend, toggle: () => setOpenHouse(weekend ? null : 'weekend') },
    { id: 'oh-any', kind: 'openHouse', label: t('filters.openHouseAny', { defaultValue: 'Any open house' }), active: anyOh, toggle: () => setOpenHouse(anyOh ? null : 'any') },
    { id: 'auction-any', kind: 'auction', label: t('filters.auctionAny', { defaultValue: 'Auctions' }), active: anyAuction, toggle: () => setAuction(anyAuction ? null : 'any') },
    { id: 'auction-week', kind: 'auction', label: t('filters.auctionWeek', { defaultValue: 'Auction this week' }), active: week, toggle: () => setAuction(week ? null : 'week') },
  ];

  return (
    <div role="group" aria-label={t('filters.eventsGroup', { defaultValue: 'Open houses and auctions' })} className="grid grid-cols-2 gap-2">
      {chips.map((c) => (
        <button
          key={c.id}
          type="button"
          aria-pressed={c.active}
          onClick={c.toggle}
          className={`flex min-h-[44px] items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-xs font-medium transition-colors ${
            c.active
              ? c.kind === 'openHouse' ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-amber-300 bg-amber-50 text-amber-800'
              : 'border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50'
          }`}
        >
          <EventIcon kind={c.kind} />
          {c.label}
        </button>
      ))}
    </div>
  );
};

export default EventFilterChips;
