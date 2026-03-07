import React, { useState, useCallback, useRef, useEffect, lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { useAppContext } from '@/context/AppContext';
import { useLocalizedNavigation } from '@/src/hooks/useLocalizedNavigation';
import { Property } from '@/types';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getProperties } from '@/src/features/properties/api/propertyApi';
import { getAllAgents } from '@/src/features/agents/api/agentApi';
import { getAgencies } from '@/src/features/agencies/api/agencyApi';
import { getFeaturedCities } from '@/src/features/cities/api/cityApi';
import { API_CONFIG } from '@/src/shared/constants/app.constants';
import HeroSection from './HeroSection';
import AppShowcaseSection from './AppShowcaseSection';
import QuickAccessSection from './QuickAccessSection';
import { StackedCards } from '@/src/components/ui/glass-cards';
import TopAgentsSection from './TopAgentsSection';
import TopAgenciesSection from './TopAgenciesSection';
import Footer from '@/components/shared/Footer';

// Lazy-load below-fold sections to reduce initial bundle
const CategoriesSection = lazy(() => import('./CategoriesSection'));
const PopularCitiesSection = lazy(() => import('./PopularCitiesSection'));
const HowItWorksSection = lazy(() => import('./HowItWorksSection'));
const CTASection = lazy(() => import('./CTASection'));
const NewsSection = lazy(() => import('./NewsSection'));
const TestimonialsSection = lazy(() => import('./TestimonialsSection'));

const SectionFallback = () => (
  <div className="py-16 flex justify-center">
    <div className="w-8 h-8 border-2 border-slate-200 border-t-slate-500 rounded-full animate-spin" />
  </div>
);

const HomePage: React.FC = () => {
  const { t } = useTranslation(['home', 'common']);
  const { state, dispatch } = useAppContext();
  const { navigate } = useLocalizedNavigation();
  const [searchQuery, setSearchQuery] = useState('');
  const searchQueryRef = useRef(searchQuery);

  const queryClient = useQueryClient();

  const { data: featuredProperties = [] } = useQuery<Property[]>({
    queryKey: ['featuredProperties'],
    queryFn: async () => {
      // Fetch more to have a good pool for sorting
      const properties = await getProperties({ sortBy: 'newest' } as any, { limit: 50 });
      const active = properties.filter(p => p.status === 'active');

      // Score each property: premium first, then ones with good images
      const TIER_SCORE: Record<string, number> = {
        premium: 100,
        highlight: 80,
        featured: 60,
        standard: 0,
      };

      const scored = active.map(p => {
        let score = 0;
        // Promotion tier is the primary sort
        if (p.isPromoted && p.promotionTier) {
          score += TIER_SCORE[p.promotionTier] || 0;
        }
        if (p.hasUrgentBadge) score += 10;
        // Favor properties with multiple images (good visuals)
        const imgCount = p.images?.length || 0;
        if (imgCount >= 5) score += 30;
        else if (imgCount >= 3) score += 20;
        else if (imgCount >= 1) score += 10;
        return { property: p, score };
      });

      scored.sort((a, b) => b.score - a.score);
      return scored.slice(0, 6).map(s => s.property);
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 2,
  });

  // Prefetch all section data in parallel on mount so nothing waits for scroll
  useEffect(() => {
    const opts = { staleTime: 10 * 60 * 1000, gcTime: 30 * 60 * 1000 };
    queryClient.prefetchQuery({
      queryKey: ['topAgentsWeek'],
      queryFn: async () => {
        const { agents } = await getAllAgents();
        return agents.filter(a => a.name).sort((a, b) => (b.rating || 0) - (a.rating || 0)).slice(0, 3);
      },
      ...opts,
    });
    queryClient.prefetchQuery({
      queryKey: ['topAgenciesMonth'],
      queryFn: async () => {
        const data = await getAgencies({ limit: 3 });
        return (data.agencies || []).filter((a: any) => a.name).slice(0, 3);
      },
      ...opts,
    });
    queryClient.prefetchQuery({
      queryKey: ['featuredCities'],
      queryFn: () => getFeaturedCities(6),
      ...opts,
    });
    queryClient.prefetchQuery({
      queryKey: ['testimonials'],
      queryFn: async () => {
        const res = await fetch(`${API_CONFIG.BASE_URL}/testimonials?limit=10`);
        if (!res.ok) return [];
        const d = await res.json();
        return (d.testimonials || []).map((t: any) => ({
          id: t._id, name: t.name, avatarUrl: t.avatarUrl,
          profession: t.profession || 'User', country: t.country || '',
          rating: t.rating, quote: t.quote, source: t.source, createdAt: t.createdAt,
        }));
      },
      ...opts,
    });
    queryClient.prefetchQuery({
      queryKey: ['realEstateNews'],
      queryFn: async () => {
        const res = await fetch(`${API_CONFIG.BASE_URL}/news?limit=12`);
        if (!res.ok) return [];
        const d = await res.json();
        return d.articles || [];
      },
      ...opts,
    });
  }, [queryClient]);

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

      <StackedCards
        properties={featuredProperties}
        onPropertyClick={handlePropertyClick}
        onViewAll={() => handleNavigate('search', '/search')}
      />

      <TopAgentsSection />

      <TopAgenciesSection />

      <Suspense fallback={<SectionFallback />}>
        <CategoriesSection onCategoryClick={handleCategoryClick} />
      </Suspense>

      <Suspense fallback={<SectionFallback />}>
        <PopularCitiesSection onNavigate={handleNavigate} />
      </Suspense>

      <Suspense fallback={<SectionFallback />}>
        <NewsSection />
      </Suspense>

      <Suspense fallback={<SectionFallback />}>
        <HowItWorksSection onLearnMore={() => handleNavigate('how-it-works', '/how-it-works')} />
      </Suspense>

      <Suspense fallback={<SectionFallback />}>
        <TestimonialsSection />
      </Suspense>

      {!isAuthenticated && (
        <Suspense fallback={<SectionFallback />}>
          <CTASection
            onListProperty={() => {
              dispatch({ type: 'TOGGLE_AUTH_MODAL', payload: { isOpen: true, view: 'signup' } });
            }}
            onJoinAsAgent={() => {
              dispatch({ type: 'TOGGLE_AUTH_MODAL', payload: { isOpen: true, view: 'signup' } });
            }}
          />
        </Suspense>
      )}

      <Footer />
    </div>
  );
};

export default HomePage;
