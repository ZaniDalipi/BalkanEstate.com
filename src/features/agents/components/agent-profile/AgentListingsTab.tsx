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
  const [searchTerm, setSearchTerm] = useState('');

  const filteredListings = React.useMemo(() => {
    let listings: Property[] = [];

    if (listingsFilter === 'all') {
      listings = [...activeListings, ...soldProperties];
    } else if (listingsFilter === 'active') {
      listings = activeListings;
    } else {
      listings = soldProperties;
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
  }, [activeListings, soldProperties, listingsFilter, searchTerm]);

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
      {/* Filters */}
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
            {t('agents:profilePage.listings.all')} ({activeListings.length + soldProperties.length})
          </button>
          <button
            onClick={() => setListingsFilter('active')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              listingsFilter === 'active'
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {t('agents:profilePage.listings.active')} ({activeListings.length})
          </button>
          <button
            onClick={() => setListingsFilter('sold')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              listingsFilter === 'sold'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {t('agents:profilePage.listings.sold')} ({soldProperties.length})
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder={t('agents:profilePage.listings.search')}
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
              ? t('agents:profilePage.listings.noSearchResults')
              : t('agents:profilePage.listings.noListings')}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {filteredListings.map((property) => (
            <PropertyCard
              key={property.id}
              property={property}
              onClick={() => onPropertyClick(property)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default AgentListingsTab;
