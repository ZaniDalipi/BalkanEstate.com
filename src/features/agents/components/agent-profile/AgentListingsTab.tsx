// Agent Listings Tab Component
// Displays active listings and sold properties for an agent

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Property } from '@/types';
import PropertyCard from '@/src/features/property-details/components/PropertyCard';
import PropertyCardSkeleton from '@/src/features/property-details/components/PropertyCardSkeleton';
import { MagnifyingGlassIcon, XMarkIcon } from '@/constants';

interface AgentListingsTabProps {
  activeListings: Property[];
  soldProperties: Property[];
  isLoading: boolean;
  onPropertyClick: (property: Property) => void;
}

const AgentListingsTab: React.FC<AgentListingsTabProps> = ({
  activeListings,
  soldProperties,
  isLoading,
  onPropertyClick,
}) => {
  const { t } = useTranslation(['agents']);
  const [listingsFilter, setListingsFilter] = useState<'all' | 'active' | 'sold'>('all');
  const [listingTypeFilter, setListingTypeFilter] = useState<'all' | 'sale' | 'rent'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const allListings = React.useMemo(() => [...activeListings, ...soldProperties], [activeListings, soldProperties]);

  const listingTypeCounts = React.useMemo(() => ({
    all: allListings.length,
    sale: allListings.filter(p => (p.listingType || 'sale') === 'sale').length,
    rent: allListings.filter(p => p.listingType === 'rent').length,
  }), [allListings]);

  const showListingTypeFilter = listingTypeCounts.sale > 0 && listingTypeCounts.rent > 0;

  const filteredListings = React.useMemo(() => {
    let listings: Property[] = [];

    if (listingsFilter === 'all') {
      listings = [...activeListings, ...soldProperties];
    } else if (listingsFilter === 'active') {
      listings = activeListings;
    } else {
      listings = soldProperties;
    }

    // Apply listing type filter
    if (listingTypeFilter !== 'all') {
      listings = listings.filter(p => (p.listingType || 'sale') === listingTypeFilter);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      listings = listings.filter(
        (p) =>
          p.title?.toLowerCase().includes(term) ||
          p.address?.toLowerCase().includes(term) ||
          p.city?.toLowerCase().includes(term)
      );
    }

    return listings;
  }, [activeListings, soldProperties, listingsFilter, listingTypeFilter, searchTerm]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {[...Array(6)].map((_, i) => (
          <PropertyCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Listing Type Filter (Sale / Rent) */}
      {showListingTypeFilter && (
        <div className="flex gap-2">
          <button
            onClick={() => setListingTypeFilter('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              listingTypeFilter === 'all' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {t('agents:profilePage.listingsTab.allTypes')} ({listingTypeCounts.all})
          </button>
          <button
            onClick={() => setListingTypeFilter('sale')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              listingTypeFilter === 'sale' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
            }`}
          >
            {t('agents:profilePage.listingsTab.forSale')} ({listingTypeCounts.sale})
          </button>
          <button
            onClick={() => setListingTypeFilter('rent')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              listingTypeFilter === 'rent' ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
            }`}
          >
            {t('agents:profilePage.listingsTab.forRent')} ({listingTypeCounts.rent})
          </button>
        </div>
      )}

      {/* Status Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        {/* Tab Filters */}
        <div className="flex gap-2">
          <button
            onClick={() => setListingsFilter('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              listingsFilter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {t('agents:profilePage.listingsTab.all')} ({activeListings.length + soldProperties.length})
          </button>
          <button
            onClick={() => setListingsFilter('active')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              listingsFilter === 'active'
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {t('agents:profilePage.listingsTab.activeListings')} ({activeListings.length})
          </button>
          <button
            onClick={() => setListingsFilter('sold')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              listingsFilter === 'sold'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {t('agents:profilePage.listingsTab.soldProperties')} ({soldProperties.length})
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder={t('agents:profilePage.listingsTab.searchAllProperties')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-9 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              aria-label="Clear search"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Listings Grid */}
      {filteredListings.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">
            {searchTerm
              ? t('agents:profilePage.listingsTab.noSearchResults')
              : t('agents:profilePage.listingsTab.noListings')}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {filteredListings.map((property) => (
            <PropertyCard
              key={property.id}
              property={property}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default AgentListingsTab;
