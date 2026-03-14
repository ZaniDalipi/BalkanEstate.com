import React, { useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '@/context/AppContext';
import { useBusinessListings } from '../hooks';
import BusinessCard from './BusinessCard';
import BusinessDetailPage from './BusinessDetailPage';
import CreateBusinessListingForm from './CreateBusinessListingForm';
import { BUSINESS_CATEGORIES, type BusinessCategory, type BusinessListing } from '@/src/shared/types/businessListing.types';
import { SearchIcon, PlusIcon, BuildingStorefrontIcon } from '@/constants';
import Footer from '@/components/shared/Footer';

type SubView = 'list' | 'detail' | 'create';

const BusinessDirectoryPage: React.FC = () => {
  const { t } = useTranslation('businessDirectory');
  const { state } = useAppContext();

  const [subView, setSubView] = useState<SubView>('list');
  const [selectedListingId, setSelectedListingId] = useState<string | null>(null);

  // Filters
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<BusinessCategory | ''>('');
  const [page, setPage] = useState(1);

  const filters = useMemo(() => ({
    search: search || undefined,
    category: selectedCategory || undefined,
    page,
    limit: 20,
  }), [search, selectedCategory, page]);

  const { listings, total, totalPages, isLoading } = useBusinessListings(filters);

  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  }, [searchInput]);

  const handleCategoryClick = useCallback((category: BusinessCategory | '') => {
    setSelectedCategory(category);
    setPage(1);
  }, []);

  const handleCardClick = useCallback((listing: BusinessListing) => {
    setSelectedListingId(listing.id);
    setSubView('detail');
  }, []);

  const handleBackToList = useCallback(() => {
    setSubView('list');
    setSelectedListingId(null);
  }, []);

  const handleCreateClick = useCallback(() => {
    if (!state.currentUser) {
      // Dispatch login modal
      return;
    }
    setSubView('create');
  }, [state.currentUser]);

  const handleCreateSuccess = useCallback(() => {
    setSubView('list');
    setPage(1);
    setSearch('');
    setSelectedCategory('');
  }, []);

  // Sub-view routing
  if (subView === 'detail' && selectedListingId) {
    return <BusinessDetailPage listingId={selectedListingId} onBack={handleBackToList} />;
  }

  if (subView === 'create') {
    return <CreateBusinessListingForm onBack={handleBackToList} onSuccess={handleCreateSuccess} />;
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Hero section */}
      <div className="bg-gradient-to-br from-primary/90 via-primary to-indigo-700 text-white">
        <div className="max-w-7xl mx-auto px-4 py-12 sm:py-16">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm rounded-full px-4 py-1.5 mb-4 text-sm font-medium">
              <BuildingStorefrontIcon className="w-4 h-4" />
              {t('hero.badge')}
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold mb-3">
              {t('hero.title')}
            </h1>
            <p className="text-white/80 max-w-2xl mx-auto mb-8">
              {t('hero.subtitle')}
            </p>

            {/* Search bar */}
            <form onSubmit={handleSearch} className="max-w-xl mx-auto flex gap-2">
              <div className="flex-1 relative">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder={t('search.placeholder')}
                  className="w-full pl-10 pr-4 py-3 rounded-xl text-neutral-900 bg-white border-0 focus:ring-2 focus:ring-white/50 placeholder:text-neutral-400"
                />
              </div>
              <button
                type="submit"
                className="px-6 py-3 bg-white text-primary font-semibold rounded-xl hover:bg-white/90 transition-colors"
              >
                {t('search.button')}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Category filters + CTA */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => handleCategoryClick('')}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                selectedCategory === ''
                  ? 'bg-primary text-white'
                  : 'bg-white text-neutral-600 border border-neutral-200 hover:border-primary/30'
              }`}
            >
              {t('filters.all')}
            </button>
            {BUSINESS_CATEGORIES.filter(c => c !== 'other').slice(0, 8).map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => handleCategoryClick(category)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  selectedCategory === category
                    ? 'bg-primary text-white'
                    : 'bg-white text-neutral-600 border border-neutral-200 hover:border-primary/30'
                }`}
              >
                {t(`categories.${category}`)}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleCreateClick}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl font-semibold hover:bg-primary/90 transition-colors flex-shrink-0"
          >
            <PlusIcon className="w-4 h-4" />
            {t('cta.listBusiness')}
          </button>
        </div>

        {/* Results info */}
        {!isLoading && (
          <p className="text-sm text-neutral-500 mb-4">
            {t('results.showing', { count: total })}
          </p>
        )}

        {/* Loading state */}
        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-neutral-200 p-4 animate-pulse">
                <div className="flex gap-3">
                  <div className="w-14 h-14 rounded-xl bg-neutral-200" />
                  <div className="flex-1">
                    <div className="h-4 bg-neutral-200 rounded w-3/4 mb-2" />
                    <div className="h-3 bg-neutral-200 rounded w-1/2" />
                  </div>
                </div>
                <div className="mt-3 h-3 bg-neutral-200 rounded w-full" />
                <div className="mt-2 h-3 bg-neutral-200 rounded w-2/3" />
              </div>
            ))}
          </div>
        )}

        {/* Listings grid */}
        {!isLoading && listings.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {listings.map((listing) => (
              <BusinessCard
                key={listing.id}
                listing={listing}
                onClick={handleCardClick}
              />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && listings.length === 0 && (
          <div className="text-center py-16">
            <BuildingStorefrontIcon className="w-16 h-16 text-neutral-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-neutral-700 mb-2">
              {t('empty.title')}
            </h3>
            <p className="text-neutral-500 mb-6">
              {t('empty.description')}
            </p>
            <button
              type="button"
              onClick={handleCreateClick}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl font-semibold hover:bg-primary/90 transition-colors"
            >
              <PlusIcon className="w-4 h-4" />
              {t('cta.beFirst')}
            </button>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-2 mt-8">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-4 py-2 rounded-lg border border-neutral-200 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-neutral-50"
            >
              {t('pagination.previous')}
            </button>
            <span className="text-sm text-neutral-500">
              {t('pagination.pageOf', { page, totalPages })}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-4 py-2 rounded-lg border border-neutral-200 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-neutral-50"
            >
              {t('pagination.next')}
            </button>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
};

export default BusinessDirectoryPage;
