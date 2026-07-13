import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppContext } from '@/context/AppContext';
import { useHotels } from '../hooks';
import HotelCard from './HotelCard';
import HotelDetailPage from './HotelDetailPage';
import CreateHotelListingForm from './CreateHotelListingForm';
import ManageHotelsPage from './ManageHotelsPage';
import {
  HOTEL_PROPERTY_TYPES,
  HOTEL_AMENITIES,
  type Hotel,
  type HotelFilters,
  type HotelPropertyType,
  type HotelAmenity,
} from '@/src/shared/types/hotel.types';
import {
  SearchIcon, PlusIcon, HomeIcon, UsersIcon, MapPinIcon, CheckBadgeIcon,
  XMarkIcon, CheckIcon,
} from '@/constants';
import { BALKAN_LOCATIONS } from '@/utils/balkanLocations';
import { buildLocalizedPath } from '@/src/utils/languageRouting';
import Footer from '@/components/shared/Footer';

type SubView = 'list' | 'detail' | 'create' | 'mine' | 'edit';

const SORT_OPTIONS: Array<{ value: NonNullable<HotelFilters['sort']>; labelKey: string }> = [
  { value: 'newest', labelKey: 'sort.newest' },
  { value: 'price_asc', labelKey: 'sort.priceAsc' },
  { value: 'price_desc', labelKey: 'sort.priceDesc' },
  { value: 'rating', labelKey: 'sort.rating' },
];

const gridVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] as const } },
};

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
    if (tail === 'my-properties') return { view: 'mine' as SubView, id: null };
    if (tail) return { view: 'detail' as SubView, id: decodeURIComponent(tail) };
    return { view: 'list' as SubView, id: null };
  }, []);

  const [subView, setSubView] = useState<SubView>(initial.view);
  const [selectedHotelId, setSelectedHotelId] = useState<string | null>(initial.id);
  const [editHotel, setEditHotel] = useState<Hotel | null>(null);

  // --- Filters ---
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [propertyType, setPropertyType] = useState<HotelPropertyType | ''>('');
  const [guestsInput, setGuestsInput] = useState<number | ''>('');
  const [guests, setGuests] = useState<number | ''>('');
  const [country, setCountry] = useState('');
  const [city, setCity] = useState('');
  const [minPrice, setMinPrice] = useState<number | ''>('');
  const [maxPrice, setMaxPrice] = useState<number | ''>('');
  const [amenities, setAmenities] = useState<HotelAmenity[]>([]);
  const [sort, setSort] = useState<NonNullable<HotelFilters['sort']>>('newest');
  const [showFilters, setShowFilters] = useState(false);

  const availableCities = useMemo(
    () => BALKAN_LOCATIONS.find((c) => c.name === country)?.cities ?? [],
    [country]
  );

  const filters = useMemo<HotelFilters>(() => ({
    search: search || undefined,
    propertyType: propertyType || undefined,
    guests: typeof guests === 'number' ? guests : undefined,
    country: country || undefined,
    city: city || undefined,
    minPrice: typeof minPrice === 'number' ? minPrice : undefined,
    maxPrice: typeof maxPrice === 'number' ? maxPrice : undefined,
    amenities: amenities.length > 0 ? amenities : undefined,
    sort,
    limit: 24,
  }), [search, propertyType, guests, country, city, minPrice, maxPrice, amenities, sort]);

  const { hotels, total, isLoading, error, refetch } = useHotels(filters);

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (search) n++;
    if (propertyType) n++;
    if (typeof guests === 'number') n++;
    if (country) n++;
    if (city) n++;
    if (typeof minPrice === 'number' || typeof maxPrice === 'number') n++;
    n += amenities.length;
    return n;
  }, [search, propertyType, guests, country, city, minPrice, maxPrice, amenities]);

  const clearAllFilters = useCallback(() => {
    setSearch(''); setSearchInput('');
    setPropertyType('');
    setGuests(''); setGuestsInput('');
    setCountry(''); setCity('');
    setMinPrice(''); setMaxPrice('');
    setAmenities([]);
  }, []);

  const toggleAmenity = useCallback((a: HotelAmenity) => {
    setAmenities((prev) => (prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]));
  }, []);

  const handleSearchSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput.trim());
    setGuests(guestsInput);
  }, [searchInput, guestsInput]);

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
    if (!state.isAuthenticated) {
      dispatch({ type: 'TOGGLE_AUTH_MODAL', payload: { isOpen: true, view: 'login' } });
      return;
    }
    setSubView('create');
    window.history.pushState({}, '', buildLocalizedPath('/hotels/list-property'));
    window.scrollTo(0, 0);
  }, [state.isAuthenticated, dispatch]);

  useEffect(() => {
    if ((subView === 'create' || subView === 'mine' || subView === 'edit') && !state.isAuthenticated) {
      setSubView('list');
      window.history.replaceState({}, '', buildLocalizedPath('/hotels'));
      dispatch({ type: 'TOGGLE_AUTH_MODAL', payload: { isOpen: true, view: 'login' } });
    }
  }, [subView, state.isAuthenticated, dispatch]);

  const openManage = useCallback(() => {
    if (!state.isAuthenticated) {
      dispatch({ type: 'TOGGLE_AUTH_MODAL', payload: { isOpen: true, view: 'login' } });
      return;
    }
    setSubView('mine');
    window.history.pushState({}, '', buildLocalizedPath('/hotels/my-properties'));
    window.scrollTo(0, 0);
  }, [state.isAuthenticated, dispatch]);

  const openEdit = useCallback((hotel: Hotel) => {
    setEditHotel(hotel);
    setSubView('edit');
    window.scrollTo(0, 0);
  }, []);

  const handleCreateSuccess = useCallback(() => {
    setSubView('list');
    refetch();
    window.history.pushState({}, '', buildLocalizedPath('/hotels'));
    window.scrollTo(0, 0);
    dispatch({
      type: 'SHOW_ALERT',
      payload: {
        type: 'success',
        title: t('page.createdSuccessTitle'),
        message: t('page.createdSuccessMessage'),
      },
    });
  }, [refetch, dispatch, t]);

  const handleEditSuccess = useCallback(() => {
    setEditHotel(null);
    setSubView('mine');
    refetch();
    window.scrollTo(0, 0);
    dispatch({
      type: 'SHOW_ALERT',
      payload: { type: 'success', title: t('page.createdSuccessTitle'), message: t('manage.subtitle') },
    });
  }, [refetch, dispatch, t]);

  if (subView === 'create') {
    return <CreateHotelListingForm onBack={backToList} onSuccess={handleCreateSuccess} />;
  }

  if (subView === 'edit' && editHotel) {
    return (
      <CreateHotelListingForm
        editHotel={editHotel}
        onBack={() => { setEditHotel(null); setSubView('mine'); }}
        onSuccess={handleEditSuccess}
      />
    );
  }

  if (subView === 'mine') {
    return (
      <ManageHotelsPage
        onBack={backToList}
        onCreate={openCreate}
        onEdit={openEdit}
        onView={openDetail}
      />
    );
  }

  if (subView === 'detail' && selectedHotelId) {
    return <HotelDetailPage hotelId={selectedHotelId} onBack={backToList} />;
  }

  const activeChips: Array<{ key: string; label: string; clear: () => void }> = [];
  if (search) activeChips.push({ key: 'search', label: `"${search}"`, clear: () => { setSearch(''); setSearchInput(''); } });
  if (country) activeChips.push({ key: 'country', label: country, clear: () => { setCountry(''); setCity(''); } });
  if (city) activeChips.push({ key: 'city', label: city, clear: () => setCity('') });
  if (propertyType) activeChips.push({ key: 'type', label: t(`propertyTypes.${propertyType}`), clear: () => setPropertyType('') });
  if (typeof guests === 'number') activeChips.push({ key: 'guests', label: t('detail.sleeps', { count: guests }), clear: () => { setGuests(''); setGuestsInput(''); } });
  if (typeof minPrice === 'number' || typeof maxPrice === 'number') {
    activeChips.push({ key: 'price', label: `${minPrice || 0}–${maxPrice || '∞'}`, clear: () => { setMinPrice(''); setMaxPrice(''); } });
  }
  amenities.forEach((a) => activeChips.push({ key: `am-${a}`, label: t(`amenities.${a}`), clear: () => toggleAmenity(a) }));

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      {/* ===== Hero ===== */}
      <div className="relative overflow-hidden bg-gradient-to-br from-indigo-950 via-blue-900 to-slate-900">
        {/* animated aurora orbs */}
        <motion.div
          className="absolute -top-16 -left-10 w-72 h-72 bg-cyan-500/25 rounded-full blur-3xl"
          animate={{ x: [0, 40, 0], y: [0, 25, 0] }}
          transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute top-10 right-[8%] w-80 h-80 bg-violet-500/20 rounded-full blur-3xl"
          animate={{ x: [0, -30, 0], y: [0, 30, 0] }}
          transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
        />
        <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '32px 32px' }} />

        <div className="relative z-10 max-w-6xl mx-auto px-4 pt-12 pb-8 sm:pt-16">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-5">
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <h1 className="text-3xl sm:text-5xl font-bold text-white tracking-tight">
                {t('page.title')}
              </h1>
              <p className="mt-3 text-white/70 max-w-xl text-base sm:text-lg">{t('page.subtitle')}</p>
              <div className="mt-4 flex flex-wrap gap-4 text-white/60 text-sm">
                <span className="flex items-center gap-1.5"><CheckBadgeIcon className="w-4 h-4 text-cyan-300" /> {t('page.trustStays')}</span>
                <span className="flex items-center gap-1.5"><MapPinIcon className="w-4 h-4 text-cyan-300" /> {t('page.trustBalkans')}</span>
                <span className="flex items-center gap-1.5"><CheckIcon className="w-4 h-4 text-cyan-300" /> {t('page.trustNoFees')}</span>
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="flex flex-col sm:items-end gap-2 shrink-0"
            >
              <button
                onClick={openCreate}
                className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-white text-indigo-900 font-semibold shadow-lg shadow-black/20 hover:bg-white/90 transition-colors"
              >
                <PlusIcon className="w-5 h-5" /> {t('page.listYourProperty')}
              </button>
              {state.isAuthenticated && (
                <button
                  onClick={openManage}
                  className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium text-sm transition-colors"
                >
                  <HomeIcon className="w-4 h-4" /> {t('page.myProperties')}
                </button>
              )}
            </motion.div>
          </div>

          {/* Floating search card */}
          <motion.form
            onSubmit={handleSearchSubmit}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="mt-8 bg-white/95 backdrop-blur rounded-2xl shadow-2xl shadow-black/25 p-2 flex flex-col md:flex-row gap-2"
          >
            <div className="flex-1 relative">
              <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder={t('page.searchPlaceholder')}
                className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-transparent outline-none text-neutral-800 placeholder:text-neutral-400"
              />
            </div>
            <div className="hidden md:block w-px bg-neutral-200 my-2" />
            <div className="relative md:w-40">
              <UsersIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
              <input
                type="number"
                min={1}
                value={guestsInput}
                onChange={(e) => setGuestsInput(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder={t('page.guests')}
                className="w-full pl-11 pr-3 py-3.5 rounded-xl bg-transparent outline-none text-neutral-800 placeholder:text-neutral-400"
              />
            </div>
            <button type="submit" className="px-7 py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold hover:brightness-110 transition-all shadow-lg shadow-cyan-500/30">
              {t('page.searchButton')}
            </button>
          </motion.form>
        </div>
      </div>

      {/* ===== Sticky toolbar ===== */}
      <div className="sticky top-0 z-20 bg-white/90 backdrop-blur border-b border-neutral-200">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-2 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setShowFilters((s) => !s)}
            className={`shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              showFilters || activeFilterCount > 0
                ? 'bg-primary text-white border-primary'
                : 'bg-white text-neutral-700 border-neutral-300 hover:border-primary/40'
            }`}
          >
            {/* sliders icon */}
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm0 0v6m6 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm0 0v-6m0-6v2m6 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm0 0v2m0-10V6" />
            </svg>
            {t('page.filters')}
            {activeFilterCount > 0 && (
              <span className="ml-0.5 min-w-5 h-5 px-1 inline-flex items-center justify-center rounded-full bg-white text-primary text-xs font-bold">
                {activeFilterCount}
              </span>
            )}
          </button>

          <div className="w-px h-6 bg-neutral-200 shrink-0" />

          <button
            onClick={() => setPropertyType('')}
            className={`shrink-0 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              propertyType === '' ? 'bg-neutral-900 text-white border-neutral-900' : 'bg-white text-neutral-600 border-neutral-300 hover:border-neutral-400'
            }`}
          >
            {t('page.allTypes')}
          </button>
          {HOTEL_PROPERTY_TYPES.map((type) => (
            <button
              key={type}
              onClick={() => setPropertyType((prev) => (prev === type ? '' : type))}
              className={`shrink-0 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                propertyType === type ? 'bg-neutral-900 text-white border-neutral-900' : 'bg-white text-neutral-600 border-neutral-300 hover:border-neutral-400'
              }`}
            >
              {t(`propertyTypes.${type}`)}
            </button>
          ))}

          <div className="ml-auto shrink-0 flex items-center gap-2">
            <label className="text-xs text-neutral-400 hidden sm:block">{t('page.sortBy')}</label>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as NonNullable<HotelFilters['sort']>)}
              className="px-3 py-1.5 rounded-lg border border-neutral-300 text-sm bg-white cursor-pointer"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{t(opt.labelKey)}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Expandable advanced filter panel */}
        <AnimatePresence initial={false}>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden border-t border-neutral-100 bg-neutral-50/60"
            >
              <div className="max-w-6xl mx-auto px-4 py-5 grid grid-cols-1 md:grid-cols-4 gap-5">
                {/* Country */}
                <div>
                  <label className="block text-xs font-semibold text-neutral-500 mb-1.5">{t('page.country')}</label>
                  <select
                    value={country}
                    onChange={(e) => { setCountry(e.target.value); setCity(''); }}
                    className="w-full px-3 py-2.5 rounded-xl border border-neutral-300 bg-white text-sm"
                  >
                    <option value="">{t('page.anyCountry')}</option>
                    {BALKAN_LOCATIONS.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
                  </select>
                </div>
                {/* City */}
                <div>
                  <label className="block text-xs font-semibold text-neutral-500 mb-1.5">{t('page.city')}</label>
                  <select
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    disabled={!country}
                    className="w-full px-3 py-2.5 rounded-xl border border-neutral-300 bg-white text-sm disabled:opacity-50"
                  >
                    <option value="">{t('page.anyCity')}</option>
                    {availableCities.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
                  </select>
                </div>
                {/* Price range */}
                <div>
                  <label className="block text-xs font-semibold text-neutral-500 mb-1.5">{t('page.priceRange')}</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number" min={0}
                      value={minPrice}
                      onChange={(e) => setMinPrice(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder={t('page.priceFrom')}
                      className="w-full px-3 py-2.5 rounded-xl border border-neutral-300 bg-white text-sm"
                    />
                    <span className="text-neutral-400">–</span>
                    <input
                      type="number" min={0}
                      value={maxPrice}
                      onChange={(e) => setMaxPrice(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder={t('page.priceTo')}
                      className="w-full px-3 py-2.5 rounded-xl border border-neutral-300 bg-white text-sm"
                    />
                  </div>
                </div>
                {/* Guests */}
                <div>
                  <label className="block text-xs font-semibold text-neutral-500 mb-1.5">{t('page.guests')}</label>
                  <input
                    type="number" min={1}
                    value={guestsInput}
                    onChange={(e) => { const v = e.target.value === '' ? '' : Number(e.target.value); setGuestsInput(v); setGuests(v); }}
                    placeholder={t('page.guests')}
                    className="w-full px-3 py-2.5 rounded-xl border border-neutral-300 bg-white text-sm"
                  />
                </div>

                {/* Amenities */}
                <div className="md:col-span-4">
                  <label className="block text-xs font-semibold text-neutral-500 mb-2">{t('page.amenitiesFilter')}</label>
                  <div className="flex flex-wrap gap-2">
                    {HOTEL_AMENITIES.map((a) => {
                      const active = amenities.includes(a);
                      return (
                        <button
                          key={a}
                          onClick={() => toggleAmenity(a)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border transition-colors ${
                            active ? 'bg-primary/10 text-primary border-primary' : 'bg-white text-neutral-600 border-neutral-300 hover:border-primary/40'
                          }`}
                        >
                          {active && <CheckIcon className="w-3.5 h-3.5" />}
                          {t(`amenities.${a}`)}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="md:col-span-4 flex items-center justify-between pt-1">
                  <button onClick={clearAllFilters} className="text-sm text-neutral-500 hover:text-red-500 font-medium">
                    {t('page.clearAll')}
                  </button>
                  <button onClick={() => setShowFilters(false)} className="px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90">
                    {t('page.applyFilters')}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ===== Results ===== */}
      <div className="flex-1 max-w-6xl mx-auto px-4 py-8 w-full">
        {/* Active filter chips */}
        {activeChips.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mb-5">
            <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wide">{t('page.activeFilters')}:</span>
            {activeChips.map((chip) => (
              <button
                key={chip.key}
                onClick={chip.clear}
                className="group flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-sm hover:bg-primary/20 transition-colors"
              >
                {chip.label}
                <XMarkIcon className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100" />
              </button>
            ))}
            <button onClick={clearAllFilters} className="text-xs text-neutral-500 hover:text-red-500 font-medium ml-1">
              {t('page.clearAll')}
            </button>
          </div>
        )}

        {!isLoading && !error && (
          <p className="text-sm text-neutral-500 mb-4">{t('page.resultsCount', { count: total })}</p>
        )}

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-neutral-200 overflow-hidden">
                <div className="h-48 bg-gradient-to-br from-neutral-200 to-neutral-100 animate-pulse" />
                <div className="p-4 space-y-3">
                  <div className="h-4 bg-neutral-200 rounded w-3/4 animate-pulse" />
                  <div className="h-3 bg-neutral-200 rounded w-1/2 animate-pulse" />
                  <div className="h-8 bg-neutral-200 rounded animate-pulse" />
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
          <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-20">
            <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-indigo-100 to-cyan-100 flex items-center justify-center">
              <HomeIcon className="w-10 h-10 text-indigo-400" />
            </div>
            <p className="text-neutral-700 mb-1 font-semibold text-lg">{t('page.emptyTitle')}</p>
            <p className="text-neutral-400 text-sm mb-6">{t('page.emptySubtitle')}</p>
            <div className="flex items-center justify-center gap-3">
              {activeFilterCount > 0 && (
                <button onClick={clearAllFilters} className="px-5 py-2.5 rounded-xl border border-neutral-300 text-neutral-700 font-medium hover:bg-neutral-100">
                  {t('page.clearFilters')}
                </button>
              )}
              <button onClick={openCreate} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white font-medium">
                <PlusIcon className="w-4 h-4" /> {t('page.listYourProperty')}
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            variants={gridVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
          >
            {hotels.map((hotel) => (
              <motion.div key={hotel.id} variants={itemVariants}>
                <HotelCard hotel={hotel} onClick={openDetail} />
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>

      <Footer />
    </div>
  );
};

export default HotelsPage;
