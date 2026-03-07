import React, { useState, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { useAppContext } from '@/context/AppContext';
import { useLocalizedNavigation } from '@/src/hooks/useLocalizedNavigation';
import { Property } from '@/types';
import { useQuery } from '@tanstack/react-query';
import { getProperties } from '@/src/features/properties/api/propertyApi';
import HeroSection from './HeroSection';
import QuickAccessSection from './QuickAccessSection';
import CategoriesSection from './CategoriesSection';
import PopularCitiesSection from './PopularCitiesSection';
import HowItWorksSection from './HowItWorksSection';
import CTASection from './CTASection';
import AppShowcaseSection from './AppShowcaseSection';
import NewsSection from './NewsSection';
import TestimonialsSection from './TestimonialsSection';
import TopAgentsSection from './TopAgentsSection';
import TopAgenciesSection from './TopAgenciesSection';
import { StackedCards } from '@/src/components/ui/glass-cards';
import Footer from '@/components/shared/Footer';

const HomePage: React.FC = () => {
  const { t } = useTranslation(['home', 'common']);
  const { state, dispatch } = useAppContext();
  const { navigate } = useLocalizedNavigation();
  const [searchQuery, setSearchQuery] = useState('');
  const searchQueryRef = useRef(searchQuery);

  const { data: featuredProperties = [], isLoading: isLoadingProperties } = useQuery<Property[]>({
    queryKey: ['featuredProperties'],
    queryFn: async () => {
      const properties = await getProperties({ sortBy: 'newest' } as any, { limit: 6 });
      return properties.filter(p => p.status === 'active').slice(0, 6);
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 2,
  });

  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
    searchQueryRef.current = value;
  }, []);

  const handleSearch = useCallback(() => {
    const query = searchQueryRef.current.trim();
    const updatedFilters = {
      ...state.searchPageState.filters,
      query,
    };
    dispatch({
      type: 'UPDATE_SEARCH_PAGE_STATE',
      payload: {
        filters: updatedFilters,
        activeFilters: updatedFilters,
      },
    });
    dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'search' });
    navigate(query ? `/search?q=${encodeURIComponent(query)}` : '/search');
  }, [dispatch, state.searchPageState.filters, navigate]);

  const handleNavigate = useCallback((view: string, path: string) => {
    dispatch({ type: 'SET_ACTIVE_VIEW', payload: view as any });
    navigate(path);
  }, [dispatch, navigate]);

  const handlePropertyClick = useCallback((property: Property) => {
    dispatch({ type: 'SET_SELECTED_PROPERTY_OBJECT', payload: property });
    navigate(`/property/${property.id}`);
  }, [dispatch, navigate]);

  const handleCategoryClick = useCallback((propertyType: string, listingType?: string) => {
    const filters = { ...state.searchPageState.filters };
    if (propertyType !== 'any') {
      filters.propertyType = propertyType as any;
    }
    if (listingType) {
      filters.listingType = listingType as any;
    }
    dispatch({
      type: 'UPDATE_SEARCH_PAGE_STATE',
      payload: { filters, activeFilters: filters },
    });
    dispatch({ type: 'SET_ACTIVE_VIEW', payload: listingType === 'rent' ? 'rentals' : 'search' });
    navigate(listingType === 'rent' ? '/rent' : '/search');
  }, [dispatch, state.searchPageState, navigate]);

  const isAuthenticated = state.isAuthenticated;
  const currentUser = state.currentUser;

  return (
    <div className="flex flex-col min-h-screen bg-white">
      <Helmet>
        <title>{t('home:seo.title')}</title>
        <meta name="description" content={t('home:seo.description')} />
      </Helmet>

      <HeroSection
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        onSearch={handleSearch}
        onNavigate={handleNavigate}
      />

      <AppShowcaseSection onNavigate={handleNavigate} />

      {isAuthenticated && currentUser && (
        <QuickAccessSection
          user={currentUser}
          onNavigate={handleNavigate}
          savedSearchesCount={state.savedSearches.length}
          savedHomesCount={state.savedHomes.length}
          unreadMessagesCount={state.conversations.reduce(
            (acc, c) => acc + (c.buyerUnreadCount || 0) + (c.sellerUnreadCount || 0),
            0
          )}
        />
      )}

      {featuredProperties.length > 0 && (
        <StackedCards
          properties={featuredProperties}
          onPropertyClick={handlePropertyClick}
          onViewAll={() => handleNavigate('search', '/search')}
        />
      )}
      {isLoadingProperties && (
        <section className="py-12 sm:py-16 max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-2xl overflow-hidden border border-neutral-200 animate-pulse">
                <div className="aspect-[4/3] bg-slate-100" />
                <div className="p-4 space-y-3">
                  <div className="h-5 bg-slate-100 rounded w-3/4" />
                  <div className="h-4 bg-slate-100 rounded w-1/2" />
                  <div className="h-3 bg-slate-50 rounded w-full" />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <TopAgentsSection />

      <TopAgenciesSection />

      <CategoriesSection onCategoryClick={handleCategoryClick} />

      <PopularCitiesSection onNavigate={handleNavigate} />

      <NewsSection />

      <HowItWorksSection onLearnMore={() => handleNavigate('how-it-works', '/how-it-works')} />

      <TestimonialsSection />

      {!isAuthenticated && (
        <CTASection
          onListProperty={() => {
            dispatch({ type: 'TOGGLE_AUTH_MODAL', payload: { isOpen: true, view: 'signup' } });
          }}
          onJoinAsAgent={() => {
            dispatch({ type: 'TOGGLE_AUTH_MODAL', payload: { isOpen: true, view: 'signup' } });
          }}
        />
      )}

      <Footer />
    </div>
  );
};

export default HomePage;
