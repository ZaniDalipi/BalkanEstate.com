import React, { useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '@/context/AppContext';
import { useBusinessListings } from '../hooks';
import BusinessCard from './BusinessCard';
import BusinessDetailPage from './BusinessDetailPage';
import CreateBusinessListingForm from './CreateBusinessListingForm';
import AnimatedTooltip, { type AnimatedTooltipItem } from '@/src/components/ui/AnimatedTooltip';
import { BUSINESS_CATEGORIES, type BusinessCategory, type BusinessListing, type ListingType } from '@/src/shared/types/businessListing.types';
import { SearchIcon, PlusIcon, BuildingStorefrontIcon, WrenchScrewdriverIcon, SparklesIcon, UserGroupIcon, UserIcon } from '@/constants';
import { Animated, StaggeredList } from '@/src/components/ui/Animations';
import Footer from '@/components/shared/Footer';

type SubView = 'list' | 'detail' | 'create';
type TabType = 'all' | 'businesses' | 'individuals';

const CATEGORY_ICONS: Record<string, string> = {
  construction: '\u{1F3D7}',
  renovation: '\u{1F528}',
  cleaning: '\u{2728}',
  moving: '\u{1F69A}',
  interior_design: '\u{1F3A8}',
  architecture: '\u{1F4D0}',
  plumbing: '\u{1F6BF}',
  electrical: '\u{26A1}',
  landscaping: '\u{1F333}',
  security: '\u{1F512}',
  real_estate_law: '\u{2696}',
  insurance: '\u{1F6E1}',
  home_inspection: '\u{1F50D}',
  pest_control: '\u{1F41B}',
  painting: '\u{1F58C}',
  roofing: '\u{1F3E0}',
  hvac: '\u{2744}',
  furniture: '\u{1FA91}',
  appliances: '\u{1F4FA}',
  other: '\u{1F4CB}',
};

const BusinessDirectoryPage: React.FC = () => {
  const { t } = useTranslation('businessDirectory');
  const { state } = useAppContext();

  const [subView, setSubView] = useState<SubView>('list');
  const [selectedListingId, setSelectedListingId] = useState<string | null>(null);

  // Filters
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<BusinessCategory | ''>('');
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [page, setPage] = useState(1);

  const listingTypeFilter: ListingType | undefined = useMemo(() => {
    if (activeTab === 'businesses') return 'business';
    if (activeTab === 'individuals') return 'individual';
    return undefined;
  }, [activeTab]);

  const filters = useMemo(() => ({
    search: search || undefined,
    category: selectedCategory || undefined,
    listingType: listingTypeFilter,
    page,
    limit: 20,
  }), [search, selectedCategory, listingTypeFilter, page]);

  const { listings, total, totalPages, isLoading } = useBusinessListings(filters);

  // Derive individuals for AnimatedTooltip row
  const individualListings = useMemo(() =>
    listings.filter(l => l.listingType === 'individual'),
  [listings]);

  const tooltipItems: AnimatedTooltipItem[] = useMemo(() => {
    // Shuffle individuals for variety
    const shuffled = [...individualListings].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 12).map((l, i) => ({
      id: i,
      name: l.name,
      designation: t(`categories.${l.category}`),
      image: l.logoUrl || '',
    }));
  }, [individualListings, t]);

  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  }, [searchInput]);

  const handleCategoryClick = useCallback((category: BusinessCategory | '') => {
    setSelectedCategory(category);
    setPage(1);
  }, []);

  const handleTabChange = useCallback((tab: TabType) => {
    setActiveTab(tab);
    setPage(1);
  }, []);

  const handleCardClick = useCallback((listing: BusinessListing) => {
    setSelectedListingId(listing.id);
    setSubView('detail');
  }, []);

  const handleTooltipClick = useCallback((item: AnimatedTooltipItem) => {
    const match = individualListings.find(l => l.name === item.name);
    if (match) {
      setSelectedListingId(match.id);
      setSubView('detail');
    }
  }, [individualListings]);

  const handleBackToList = useCallback(() => {
    setSubView('list');
    setSelectedListingId(null);
  }, []);

  const handleCreateClick = useCallback(() => {
    if (!state.currentUser) return;
    setSubView('create');
  }, [state.currentUser]);

  const handleCreateSuccess = useCallback(() => {
    setSubView('list');
    setPage(1);
    setSearch('');
    setSelectedCategory('');
  }, []);

  const popularCategories = useMemo(() =>
    BUSINESS_CATEGORIES.filter(c => ['construction', 'renovation', 'cleaning', 'moving', 'architecture', 'plumbing'].includes(c)),
  []);

  // Sub-view routing
  if (subView === 'detail' && selectedListingId) {
    return <BusinessDetailPage listingId={selectedListingId} onBack={handleBackToList} />;
  }

  if (subView === 'create') {
    return <CreateBusinessListingForm onBack={handleBackToList} onSuccess={handleCreateSuccess} />;
  }

  const tabs: { key: TabType; label: string; icon: React.ReactNode }[] = [
    { key: 'all', label: t('tabs.all'), icon: null },
    { key: 'businesses', label: t('tabs.businesses'), icon: <BuildingStorefrontIcon className="w-4 h-4" /> },
    { key: 'individuals', label: t('tabs.individuals'), icon: <UserIcon className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* === PREMIUM HERO SECTION === */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900" />
        <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-transparent to-violet-600/20 animate-pulse" style={{ animationDuration: '4s' }} />

        {/* Grid pattern overlay */}
        <div className="absolute inset-0 opacity-10">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="bd-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#bd-grid)" />
          </svg>
        </div>

        {/* Floating blur orbs */}
        <div className="absolute top-10 left-[10%] w-72 h-72 bg-blue-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-10 right-[10%] w-96 h-96 bg-violet-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/10 rounded-full blur-3xl" />

        {/* Floating decorative icons */}
        <div className="absolute top-20 left-[5%] opacity-20 hidden lg:block animate-float">
          <WrenchScrewdriverIcon className="w-16 h-16 text-white" />
        </div>
        <div className="absolute bottom-32 right-[8%] opacity-15 hidden lg:block animate-float" style={{ animationDelay: '1.5s' }}>
          <BuildingStorefrontIcon className="w-20 h-20 text-white" />
        </div>

        {/* Main hero content */}
        <div className="relative z-10 px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
          <div className="max-w-7xl mx-auto">
            {/* Glass badge */}
            <div className="flex justify-center mb-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md rounded-full border border-white/20">
                <SparklesIcon className="w-4 h-4 text-amber-400" />
                <span className="text-white/90 font-semibold text-sm uppercase tracking-wider">
                  {t('hero.badge')}
                </span>
                <SparklesIcon className="w-4 h-4 text-amber-400" />
              </div>
            </div>

            {/* Heading */}
            <div className="text-center mb-8 sm:mb-10">
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-white mb-4 sm:mb-6 leading-tight">
                {t('hero.title')}
                <span className="block mt-2 bg-gradient-to-r from-blue-400 via-violet-400 to-purple-400 bg-clip-text text-transparent">
                  {t('hero.titleHighlight')}
                </span>
              </h1>
              <p className="text-base sm:text-lg lg:text-xl text-white/70 max-w-3xl mx-auto leading-relaxed">
                {t('hero.subtitle')}
              </p>
            </div>

            {/* Glass search box */}
            <div className="max-w-2xl mx-auto">
              <div className="relative bg-white/10 backdrop-blur-xl rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-white/20 shadow-2xl">
                <form onSubmit={handleSearch}>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-3 sm:left-4 flex items-center pointer-events-none">
                      <SearchIcon className={`w-5 h-5 transition-colors ${searchInput ? 'text-primary' : 'text-white/50'}`} />
                    </div>
                    <input
                      type="text"
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      placeholder={t('search.placeholder')}
                      className="w-full pl-10 sm:pl-12 pr-24 sm:pr-28 py-3 sm:py-4 bg-white/10 border border-white/20 rounded-xl sm:rounded-2xl text-white placeholder-white/40 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 transition-all text-sm sm:text-base"
                    />
                    <button
                      type="submit"
                      className="absolute right-2 top-1/2 -translate-y-1/2 px-4 sm:px-6 py-2 sm:py-2.5 bg-gradient-to-r from-primary to-blue-600 hover:from-primary hover:to-blue-700 text-white font-bold rounded-lg sm:rounded-xl text-xs sm:text-sm transition-all hover:shadow-lg active:scale-95"
                    >
                      {t('search.button')}
                    </button>
                  </div>
                </form>

                {/* Popular categories */}
                {!searchInput && (
                  <div className="text-center mt-4">
                    <p className="text-white/50 text-xs mb-2">{t('hero.popularCategories')}</p>
                    <div className="flex flex-wrap justify-center gap-2">
                      {popularCategories.map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => { handleCategoryClick(cat); }}
                          className="px-3 py-1.5 text-xs bg-white/10 hover:bg-white/20 border border-white/10 hover:border-white/30 text-white/70 hover:text-white rounded-lg transition-all"
                        >
                          {CATEGORY_ICONS[cat]} {t(`categories.${cat}`)}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Wave divider */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
            <path d="M0 80V40C240 0 480 0 720 40C960 80 1200 80 1440 40V80H0Z" fill="#fafafa" />
          </svg>
        </div>
      </div>

      {/* === MAIN CONTENT === */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Tabs: All / Businesses / Individuals */}
        <Animated variant="fadeInUp">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div className="flex items-center gap-1 p-1 bg-white rounded-xl border border-neutral-200 shadow-sm">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => handleTabChange(tab.key)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    activeTab === tab.key
                      ? 'bg-gradient-to-r from-primary to-blue-600 text-white shadow-md shadow-primary/25'
                      : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={handleCreateClick}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary to-blue-600 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-primary/25 active:scale-[0.98] transition-all flex-shrink-0"
            >
              <PlusIcon className="w-4 h-4" />
              {t('cta.listBusiness')}
            </button>
          </div>
        </Animated>

        {/* Individuals AnimatedTooltip showcase */}
        {(activeTab === 'all' || activeTab === 'individuals') && tooltipItems.length > 0 && (
          <Animated variant="fadeInUp">
            <div className="mb-8 p-6 bg-gradient-to-r from-slate-900 via-blue-900/95 to-indigo-900 rounded-2xl border border-white/10 shadow-xl overflow-hidden relative">
              {/* Subtle decorative orb */}
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-violet-500/20 rounded-full blur-3xl" />

              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-1">
                  <UserGroupIcon className="w-5 h-5 text-violet-400" />
                  <h3 className="text-white font-bold text-lg">{t('individuals.title')}</h3>
                </div>
                <p className="text-white/50 text-sm mb-5">{t('individuals.subtitle')}</p>
                <div className="flex justify-center">
                  <AnimatedTooltip items={tooltipItems} onItemClick={handleTooltipClick} />
                </div>
              </div>
            </div>
          </Animated>
        )}

        {/* Category filters */}
        <Animated variant="fadeInUp">
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide mb-4">
            <button
              type="button"
              onClick={() => handleCategoryClick('')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 flex-shrink-0 ${
                selectedCategory === ''
                  ? 'bg-primary text-white shadow-lg shadow-primary/25'
                  : 'bg-white text-neutral-600 border border-neutral-200 hover:border-primary/30 hover:shadow-md'
              }`}
            >
              {t('filters.all')}
            </button>
            {BUSINESS_CATEGORIES.filter(c => c !== 'other').slice(0, 10).map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => handleCategoryClick(category)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 flex-shrink-0 whitespace-nowrap ${
                  selectedCategory === category
                    ? 'bg-primary text-white shadow-lg shadow-primary/25'
                    : 'bg-white text-neutral-600 border border-neutral-200 hover:border-primary/30 hover:shadow-md'
                }`}
              >
                <span className="mr-1">{CATEGORY_ICONS[category]}</span>
                {t(`categories.${category}`)}
              </button>
            ))}
          </div>
        </Animated>

        {/* Results info */}
        {!isLoading && (
          <Animated variant="fadeIn">
            <p className="text-sm text-neutral-500 mb-4">
              {t('results.showing', { count: total })}
            </p>
          </Animated>
        )}

        {/* Loading state */}
        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl sm:rounded-3xl shadow-lg overflow-hidden border border-gray-100/80 animate-pulse">
                <div className="h-20 sm:h-24 bg-neutral-200" />
                <div className="px-4 sm:px-5 -mt-8">
                  <div className="w-14 h-14 rounded-xl bg-neutral-200 border-4 border-white" />
                </div>
                <div className="p-4 pt-3 space-y-2">
                  <div className="h-5 bg-neutral-200 rounded w-3/4" />
                  <div className="h-3 bg-neutral-200 rounded w-1/2" />
                  <div className="h-3 bg-neutral-200 rounded w-full" />
                  <div className="h-3 bg-neutral-200 rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Listings grid */}
        {!isLoading && listings.length > 0 && (
          <StaggeredList
            variant="fadeInUp"
            staggerDelay={80}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
          >
            {listings.map((listing) => (
              <BusinessCard
                key={listing.id}
                listing={listing}
                onClick={handleCardClick}
              />
            ))}
          </StaggeredList>
        )}

        {/* Empty state */}
        {!isLoading && listings.length === 0 && (
          <Animated variant="scaleIn">
            <div className="text-center py-16 relative">
              <div className="absolute top-8 left-1/4 w-20 h-20 bg-primary/5 rounded-full blur-xl animate-pulse" />
              <div className="absolute bottom-8 right-1/4 w-16 h-16 bg-violet-500/5 rounded-full blur-xl animate-pulse" style={{ animationDelay: '1s' }} />

              <div className="relative">
                <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-primary/10 to-violet-500/10 rounded-3xl flex items-center justify-center">
                  <BuildingStorefrontIcon className="w-10 h-10 text-primary/50" />
                </div>
                <h3 className="text-xl font-bold text-neutral-800 mb-2">
                  {t('empty.title')}
                </h3>
                <p className="text-neutral-500 mb-6 max-w-md mx-auto">
                  {t('empty.description')}
                </p>
                <button
                  type="button"
                  onClick={handleCreateClick}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary to-blue-600 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-primary/25 active:scale-[0.98] transition-all"
                >
                  <PlusIcon className="w-4 h-4" />
                  {t('cta.beFirst')}
                </button>
              </div>
            </div>
          </Animated>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <Animated variant="fadeInUp">
            <div className="flex justify-center items-center gap-3 mt-10">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-5 py-2.5 rounded-xl bg-white/80 backdrop-blur-sm border border-neutral-200 text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-primary hover:text-white hover:border-primary transition-all duration-300"
              >
                {t('pagination.previous')}
              </button>
              <span className="text-sm text-neutral-500 font-medium">
                {t('pagination.pageOf', { page, totalPages })}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-5 py-2.5 rounded-xl bg-white/80 backdrop-blur-sm border border-neutral-200 text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-primary hover:text-white hover:border-primary transition-all duration-300"
              >
                {t('pagination.next')}
              </button>
            </div>
          </Animated>
        )}
      </div>

      <Footer />
    </div>
  );
};

export default BusinessDirectoryPage;
