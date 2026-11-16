import React from 'react';
import { useTranslation } from 'react-i18next';
import ChipScroller from '@/src/components/ui/ChipScroller';
import { ListingTypePicture, SoftIcon } from '@/src/shared/illustrations';
import type { PropertyStatus } from '@/types';

export type StatusFilter = PropertyStatus | 'all';
export type ListingTypeFilter = 'all' | 'sale' | 'rent';
export type RoleFilter = 'all' | 'private_seller' | 'agent';

interface MyListingsFiltersProps {
  search: string;
  onSearch: (value: string) => void;
  status: StatusFilter;
  onStatus: (value: StatusFilter) => void;
  /** Sale / rent, offered only when the seller has both. */
  listingType: ListingTypeFilter;
  onListingType: (value: ListingTypeFilter) => void;
  listingTypeCounts: { all: number; sale: number; rent: number } | null;
  /** Private / agent, offered only when the seller has both. */
  role: RoleFilter;
  onRole: (value: RoleFilter) => void;
  roleCounts: { all: number; private_seller: number; agent: number } | null;
}

interface ChipProps {
  active: boolean;
  onPress: () => void;
  children: React.ReactNode;
}

/** One filter choice: a 44px pill that says whether it is the chosen one. */
const Chip: React.FC<ChipProps> = ({ active, onPress, children }) => (
  <button
    type="button"
    aria-pressed={active}
    onClick={onPress}
    className={`flex min-h-[44px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
      active
        ? 'border-primary bg-primary text-white shadow-sm'
        : 'border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-100'
    }`}
  >
    {children}
  </button>
);

const Group: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div role="group" aria-label={label}>
    <ChipScroller className="gap-2 py-0.5">{children}</ChipScroller>
  </div>
);

/**
 * Search and filters of "My listings": one search box and up to three rows of
 * pills in one style. Each row scrolls sideways on a narrow screen instead of
 * being cut off.
 */
export const MyListingsFilters: React.FC<MyListingsFiltersProps> = ({
  search, onSearch, status, onStatus, listingType, onListingType, listingTypeCounts, role, onRole, roleCounts,
}) => {
  const { t } = useTranslation(['seller', 'account', 'common']);

  const statuses: Array<{ value: StatusFilter; label: string }> = [
    { value: 'all', label: t('seller:myListings.filters.all', 'All') },
    { value: 'active', label: t('seller:myListings.filters.active', 'Active') },
    { value: 'pending', label: t('seller:myListings.filters.pending', 'Pending') },
    { value: 'sold', label: t('seller:myListings.filters.sold', 'Sold') },
    { value: 'rented' as PropertyStatus, label: t('seller:myListings.filters.rented', 'Rented') },
    { value: 'draft', label: t('seller:myListings.filters.draft', 'Draft') },
  ];

  return (
    <div className="space-y-3 rounded-2xl border border-neutral-200 bg-white p-3 sm:p-4">
      <div className="relative">
        <SoftIcon name="search" className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2" />
        <input
          type="search"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder={t('seller:myListings.searchListings', 'Search by ID, title, address...')}
          aria-label={t('seller:myListings.searchListings', 'Search listings')}
          className="min-h-[44px] w-full rounded-xl border border-neutral-200 bg-neutral-50 pl-10 pr-12 text-sm transition-colors focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary [&::-webkit-search-cancel-button]:hidden"
        />
        {search && (
          <button
            type="button"
            onClick={() => onSearch('')}
            aria-label={t('common:clear', 'Clear')}
            className="absolute right-0 top-0 flex h-[44px] w-[44px] items-center justify-center rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <SoftIcon name="xmark" className="h-4 w-4" />
          </button>
        )}
      </div>

      <Group label={t('seller:myListings.filterByStatus', 'Filter by status')}>
        {statuses.map((option) => (
          <Chip key={option.value} active={status === option.value} onPress={() => onStatus(option.value)}>
            {option.label}
          </Chip>
        ))}
      </Group>

      {listingTypeCounts && (
        <Group label={t('seller:myListings.filterByType', 'Filter by sale or rent')}>
          <Chip active={listingType === 'all'} onPress={() => onListingType('all')}>
            {t('seller:myListings.allCount', 'All ({{count}})', { count: listingTypeCounts.all })}
          </Chip>
          <Chip active={listingType === 'sale'} onPress={() => onListingType('sale')}>
            <ListingTypePicture type="sale" className="h-5 w-5" />
            {t('seller:myListings.forSaleCount', 'For Sale ({{count}})', { count: listingTypeCounts.sale })}
          </Chip>
          <Chip active={listingType === 'rent'} onPress={() => onListingType('rent')}>
            <ListingTypePicture type="rent" className="h-5 w-5" />
            {t('seller:myListings.forRentCount', 'For Rent ({{count}})', { count: listingTypeCounts.rent })}
          </Chip>
        </Group>
      )}

      {roleCounts && (
        <Group label={t('account:ui.myListings.filterByPostingRole', 'Filter by posting role:')}>
          <Chip active={role === 'all'} onPress={() => onRole('all')}>
            {t('seller:myListings.postingRole.all', 'All Listings')} ({roleCounts.all})
          </Chip>
          <Chip active={role === 'private_seller'} onPress={() => onRole('private_seller')}>
            <SoftIcon name="home" className="h-5 w-5" />
            {t('account:roles.privateSeller', 'Private Seller')} ({roleCounts.private_seller})
          </Chip>
          <Chip active={role === 'agent'} onPress={() => onRole('agent')}>
            <SoftIcon name="building" className="h-5 w-5" />
            {t('account:roles.agent', 'Agent')} ({roleCounts.agent})
          </Chip>
        </Group>
      )}
    </div>
  );
};
