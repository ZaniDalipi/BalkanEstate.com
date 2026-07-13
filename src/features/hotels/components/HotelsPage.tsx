import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '@/context/AppContext';
import { useHotels } from '../hooks';
import HotelCard from './HotelCard';
import HotelDetailPage from './HotelDetailPage';
import CreateHotelListingForm from './CreateHotelListingForm';
import {
  HOTEL_PROPERTY_TYPES,
  type Hotel,
  type HotelFilters,
  type HotelPropertyType,
} from '@/src/shared/types/hotel.types';
import { SearchIcon, PlusIcon, HomeIcon } from '@/constants';
import { buildLocalizedPath } from '@/src/utils/languageRouting';
import Footer from '@/components/shared/Footer';

type SubView = 'list' | 'detail' | 'create';

const SORT_OPTIONS: Array<{ value: NonNullable<HotelFilters['sort']>; labelKey: string }> = [
  { value: 'newest', labelKey: 'sort.newest' },
  { value: 'price_asc', labelKey: 'sort.priceAsc' },
  { value: 'price_desc', labelKey: 'sort.priceDesc' },
  { value: 'rating', labelKey: 'sort.rating' },
];

const HotelsPage: React.FC = () => {
  const { t } = useTranslation('hotels');
  const { state, dispatch } = useAppContext();

  // Initialise the sub-view from the current URL so deep links work:
  //   /hotels                 → list
  //   /hotels/list-property   → create
  //   /hotels/:slug           → detail (slug resolved by the API)
  const initial = useMemo(() => {
    const parts = window.location.pathname.split('/hotels/');
    const tail = parts[1]?.replace(/\/$/, '') || '';
    if (tail === 'list-property') return { view: 'create' as SubView, id: null };
    if (tail) return { view: 'detail' as SubView, id: decodeURIComponent(tail) };
    return { view: 'list' as SubView, id: null };
  }, []);

  const [subView, setSubView] = useState<SubView>(initial.view);
  const [selectedHotelId, setSelectedHotelId] = useState<string | null>(initial.id);

  // Filters
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [propertyType, setPropertyType] = useState<HotelPropertyType | ''>('');
  const [guests, setGuests] = useState<number | ''>('');
  const [sort, setSort] = useState<NonNullable<HotelFilters['sort']>>('newest');

  const filters = useMemo<HotelFilters>(() => ({
    search: search || undefined,
    propertyType: propertyType || undefined,
    guests: typeof guests === 'number' ? guests : undefined,
    sort,
    limit: 24,
  }), [search, propertyType, guests, sort]);

  const { hotels, total, isLoading, error, refetch } = useHotels(filters);

  const handleSearchSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput.trim());
  }, [searchInput]);

  const openDetail = useCallback((hotel: Hotel) => {
    setSelectedHotelId(hotel.id);
    setSubView('detail');
    window.history.pushState({}, '', buildLocalizedPath(`/hotels/${hotel.slug || hotel.id}`));
    window.scrollTo(0, 0);
  }, []);

  const backToList = useCallback(() => {
    setSubView('list');
    setSelectedHotelId(null);
    window.history.pushState({}, '', buildLocalizedPath('/hotels'));
  }, []);

  const openCreate = useCallback(() => {
    // Require authentication to list a property
    if (!state.isAuthenticated) {
      dispatch({ type: 'TOGGLE_AUTH_MODAL', payload: { isOpen: true, view: 'login' } });
      return;
    }
    setSubView('create');
    window.history.pushState({}, '', buildLocalizedPath('/hotels/list-property'));
    window.scrollTo(0, 0);
  }, [state.isAuthenticated, dispatch]);

  // Guard: a logged-out user landing directly on the create form is sent back
  // to the list and prompted to sign in.
  useEffect(() => {
    if (subView === 'create' && !state.isAuthenticated) {
      setSubView('list');
      window.history.replaceState({}, '', buildLocalizedPath('/hotels'));
      dispatch({ type: 'TOGGLE_AUTH_MODAL', payload: { isOpen: true, view: 'login' } });
    }
  }, [subView, state.isAuthenticated, dispatch]);

  const handleCreateSuccess = useCallback(() => {
    setSubView('list');
    refetch();
    window.history.pushState({}, '', buildLocalizedPath('/hotels'));
    window.scrollTo(0, 0);
  }, [refetch]);

  if (subView === 'create') {
    return <CreateHotelListingForm onBack={backToList} onSuccess={handleCreateSuccess} />;
  }

  if (subView === 'detail' && selectedHotelId) {
    return <HotelDetailPage hotelId={selectedHotelId} onBack={backToList} />;
  }

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      {/* Hero */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 relative overflow-hidden">
        <div className="absolute top-10 right-[10%] w-52 h-52 bg-cyan-500/20 rounded-full blur-3xl" />
        <div className="relative z-10 max-w-6xl mx-auto px-4 py-12">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-white flex items-center gap-3">
                <HomeIcon className="w-8 h-8" />
                {t('page.title')}
              </h1>
              <p className="mt-2 text-white/70 max-w-xl">{t('page.subtitle')}</p>
            </div>
            <button
              onClick={openCreate}
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-white text-indigo-900 font-semibold hover:bg-white/90 transition-colors shrink-0"
            >
              <PlusIcon className="w-5 h-5" /> {t('page.listYourProperty')}
            </button>
          </div>

          {/* Search bar */}
          <form onSubmit={handleSearchSubmit} className="mt-6 flex flex-col sm:flex-row gap-2">
            <div className="flex-1 relative">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder={t('page.searchPlaceholder')}
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-white border-0 focus:ring-2 focus:ring-cyan-400 outline-none"
              />
            </div>
            <input
              type="number"
              min={1}
              value={guests}
              onChange={(e) => setGuests(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder={t('page.guests')}
              className="w-full sm:w-32 px-4 py-3 rounded-xl bg-white border-0 focus:ring-2 focus:ring-cyan-400 outline-none"
            />
            <button type="submit" className="px-6 py-3 rounded-xl bg-cyan-500 text-white font-semibold hover:bg-cyan-600 transition-colors">
              {t('page.searchButton')}
            </button>
          </form>
        </div>
      </div>

      {/* Filters bar */}
      <div className="sticky top-0 z-20 bg-white border-b border-neutral-200">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-2 overflow-x-auto">
          <button
            onClick={() => setPropertyType('')}
            className={`shrink-0 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              propertyType === '' ? 'bg-primary text-white border-primary' : 'bg-white text-neutral-600 border-neutral-300 hover:border-primary/40'
            }`}
          >
            {t('page.allTypes')}
          </button>
          {HOTEL_PROPERTY_TYPES.map((type) => (
            <button
              key={type}
              onClick={() => setPropertyType(type)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                propertyType === type ? 'bg-primary text-white border-primary' : 'bg-white text-neutral-600 border-neutral-300 hover:border-primary/40'
              }`}
            >
              {t(`propertyTypes.${type}`)}
            </button>
          ))}

          <div className="ml-auto shrink-0">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as NonNullable<HotelFilters['sort']>)}
              className="px-3 py-1.5 rounded-lg border border-neutral-300 text-sm bg-white"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{t(opt.labelKey)}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 max-w-6xl mx-auto px-4 py-8 w-full">
        {!isLoading && !error && (
          <p className="text-sm text-neutral-500 mb-4">{t('page.resultsCount', { count: total })}</p>
        )}

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-neutral-200 overflow-hidden animate-pulse">
                <div className="h-48 bg-neutral-200" />
                <div className="p-4 space-y-3">
                  <div className="h-4 bg-neutral-200 rounded w-3/4" />
                  <div className="h-3 bg-neutral-200 rounded w-1/2" />
                  <div className="h-8 bg-neutral-200 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-16">
            <p className="text-neutral-600 mb-4">{t('page.loadError')}</p>
            <button onClick={() => refetch()} className="px-5 py-2.5 rounded-xl bg-primary text-white font-medium">
              {t('page.retry')}
            </button>
          </div>
        ) : hotels.length === 0 ? (
          <div className="text-center py-16">
            <HomeIcon className="w-14 h-14 text-neutral-300 mx-auto mb-4" />
            <p className="text-neutral-600 mb-1 font-medium">{t('page.emptyTitle')}</p>
            <p className="text-neutral-400 text-sm mb-6">{t('page.emptySubtitle')}</p>
            <button onClick={openCreate} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white font-medium">
              <PlusIcon className="w-4 h-4" /> {t('page.listYourProperty')}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {hotels.map((hotel) => (
              <HotelCard key={hotel.id} hotel={hotel} onClick={openDetail} />
            ))}
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
};

export default HotelsPage;
