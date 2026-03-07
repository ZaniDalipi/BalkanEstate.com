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

const FALLBACK_PROPERTIES: Property[] = [
  {
    id: 'demo-1',
    title: 'Luxury Sea-View Villa',
    sellerId: '', listingType: 'sale' as any, status: 'active' as any,
    price: 385000, address: 'Coastal Road 12', city: 'Dubrovnik', country: 'Croatia',
    beds: 4, baths: 3, livingRooms: 2, sqft: 220, yearBuilt: 2021, parking: 2,
    description: 'Stunning modern villa with panoramic Adriatic views, infinity pool, and private garden.',
    specialFeatures: [], materials: [], amenities: [],
    imageUrl: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800&auto=format&fit=crop&q=80',
    lat: 42.65, lng: 18.09, seller: {} as any, propertyType: 'villa',
  },
  {
    id: 'demo-2',
    title: 'Modern City Apartment',
    sellerId: '', listingType: 'sale' as any, status: 'active' as any,
    price: 145000, address: 'Knez Mihailova 28', city: 'Belgrade', country: 'Serbia',
    beds: 2, baths: 1, livingRooms: 1, sqft: 85, yearBuilt: 2023, parking: 1,
    description: 'Brand new apartment in the heart of Belgrade with smart home features and underground parking.',
    specialFeatures: [], materials: [], amenities: [],
    imageUrl: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&auto=format&fit=crop&q=80',
    lat: 44.82, lng: 20.46, seller: {} as any, propertyType: 'apartment',
  },
  {
    id: 'demo-3',
    title: 'Charming Mountain Retreat',
    sellerId: '', listingType: 'sale' as any, status: 'active' as any,
    price: 210000, address: 'Alpine Valley 5', city: 'Bansko', country: 'Bulgaria',
    beds: 3, baths: 2, livingRooms: 1, sqft: 160, yearBuilt: 2019, parking: 1,
    description: 'Cozy mountain house near ski slopes with stone fireplace and stunning valley views.',
    specialFeatures: [], materials: [], amenities: [],
    imageUrl: 'https://images.unsplash.com/photo-1518780664697-55e3ad937233?w=800&auto=format&fit=crop&q=80',
    lat: 41.84, lng: 23.49, seller: {} as any, propertyType: 'house',
  },
  {
    id: 'demo-4',
    title: 'Beachfront Penthouse',
    sellerId: '', listingType: 'rent' as any, status: 'active' as any,
    price: 2500, address: 'Saranda Bay 3', city: 'Saranda', country: 'Albania',
    beds: 3, baths: 2, livingRooms: 1, sqft: 140, yearBuilt: 2022, parking: 1,
    description: 'Premium penthouse with floor-to-ceiling windows, rooftop terrace, and direct beach access.',
    specialFeatures: [], materials: [], amenities: [],
    imageUrl: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&auto=format&fit=crop&q=80',
    lat: 39.87, lng: 20.00, seller: {} as any, propertyType: 'apartment',
  },
];

const HomePage: React.FC = () => {
  const { t } = useTranslation(['home', 'common']);
  const { state, dispatch } = useAppContext();
  const { navigate } = useLocalizedNavigation();
  const [searchQuery, setSearchQuery] = useState('');
  const searchQueryRef = useRef(searchQuery);

  const { data: featuredProperties = [] } = useQuery<Property[]>({
    queryKey: ['featuredProperties'],
    queryFn: async () => {
      try {
        const properties = await getProperties({ sortBy: 'newest' } as any, { limit: 6 });
        return properties.filter(p => p.status === 'active').slice(0, 6);
      } catch {
        return [];
      }
    },
    staleTime: 5 * 60 * 1000,
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

      <StackedCards
        properties={featuredProperties.length > 0 ? featuredProperties : FALLBACK_PROPERTIES}
        onPropertyClick={handlePropertyClick}
        onViewAll={() => handleNavigate('search', '/search')}
      />

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
