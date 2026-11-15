import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useSearchParams } from 'react-router-dom';
import { useAppContext } from '@/context/AppContext';
import { useBusinessListings, useMyBusinessListings } from '../hooks';
import BusinessCard from './BusinessCard';
import { AdSlot } from '@/src/features/promo';
import BusinessDetailPage from './BusinessDetailPage';
import BusinessDirectoryMap from './BusinessDirectoryMap';
import CreateBusinessListingForm from './CreateBusinessListingForm';
import ListBusinessFab from './ListBusinessFab';
import BusinessGridSkeleton from './BusinessGridSkeleton';
import { useMinimumLoading } from '../hooks/useMinimumLoading';
import ChipScroller from '@/src/components/ui/ChipScroller';
import { useOffscreen } from '../hooks/useOffscreen';
import FeaturedProfessionalsRail from './FeaturedProfessionalsRail';
import { MAX_LANYARDS } from '../utils/lanyardMembers';
import { listingTypeFromQuery } from '../utils/listingTypeFromQuery';
import { BUSINESS_CATEGORIES, type BusinessCategory, type BusinessListing, type ListingType } from '@/src/shared/types/businessListing.types';
import { SearchIcon, PlusIcon, MicrophoneIcon, ArrowPathIcon, MapIcon } from '@/constants';
import { SoftIcon, type SoftIconName } from '@/src/shared/illustrations';
import { AnimatedNumber } from '@/src/components/ui/Animations';

import { goBack, navigate } from '@/src/app/router/navigation';
import { paths } from '@/src/app/router/paths';
import { generateBusinessSlug } from '@/utils/slug';
import Footer from '@/components/shared/Footer';

interface BusinessDirectoryPageProps {
  selectedListingId?: string | null;
  /** The tab the URL names; the "all" tab when absent. */
  initialTab?: Exclude<TabType, 'all'>;
  /** `/business-directory/new`: the create form (signed in only; signed out sees the list) */
  creating?: boolean;
}

type TabType = 'all' | 'businesses' | 'individuals' | 'mine';

/** The featured professionals rail's own query: independent of the tab and filters below it. */
const PROFESSIONALS_FILTER = { listingType: 'individual' as const, limit: MAX_LANYARDS };
type ViewMode = 'grid' | 'map';

const CATEGORY_ICONS: Record<string, SoftIconName> = {
  construction: 'crane',
  renovation: 'wrench',
  cleaning: 'sparkles',
  moving: 'car',
  interior_design: 'sofa',
  architecture: 'ruler',
  plumbing: 'bath',
  electrical: 'bolt',
  landscaping: 'tree',
  security: 'lock',
  real_estate_law: 'scales',
  insurance: 'shield',
  home_inspection: 'search',
  pest_control: 'warning',
  painting: 'pencil',
  roofing: 'home',
  hvac: 'snowflake',
  furniture: 'bed',
  appliances: 'kitchen',
  other: 'clipboard',
};

const CategoryIcon: React.FC<{ category: string; className?: string }> = ({ category, className = 'w-4 h-4' }) => (
  <SoftIcon name={CATEGORY_ICONS[category] || CATEGORY_ICONS.other} className={className} />
);

// Framer-motion variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 24, scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring', stiffness: 300, damping: 28 },
  },
};

const fadeUpVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 28 } },
};

const scaleInVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1, transition: { type: 'spring', stiffness: 300, damping: 28 } },
};

const BusinessDirectoryPage: React.FC<BusinessDirectoryPageProps> = ({ selectedListingId: propListingId, initialTab, creating = false }) => {
  const { t } = useTranslation('businessDirectory');
  const { state, dispatch } = useAppContext();


  // The open listing and the create form are the URL's
  const selectedListingId = propListingId ?? null;

  // Filters
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<BusinessCategory | ''>('');
  const urlTab: TabType = initialTab ?? 'all';
  const [activeTab, setActiveTab] = useState<TabType>(urlTab);
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  // Follow the URL's tab (back/forward, links). A listing's URL names no tab,
  // so opening one leaves the list's tab as it was.
  useEffect(() => {
    if (propListingId) return;
    if (urlTab !== activeTab) {
      setActiveTab(urlTab);
      setPage(1);
    }
  }, [urlTab, propListingId]);

  // Voice search
  const [isListening, setIsListening] = useState(false);
  const [voiceSupported] = useState(() =>
    typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)
  );
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const startVoiceSearch = useCallback(() => {
    if (!voiceSupported) return;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0][0].transcript;
      setSearchInput(transcript);
      setSearch(transcript);
      setPage(1);
      setIsListening(false);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, [voiceSupported]);

  const stopVoiceSearch = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  const [surpriseAnim, setSurpriseAnim] = useState(false);

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

  const { listings: allListings, total, totalPages, isLoading, isSwitching } = useBusinessListings(filters);
  const { listings: myListings, isLoading: myListingsLoading } = useMyBusinessListings(!!state.currentUser);
  const { listings: professionals, isLoading: professionalsLoading } = useBusinessListings(PROFESSIONALS_FILTER);

  const listings = activeTab === 'mine' ? myListings : allListings;
  const effectiveLoading = activeTab === 'mine' ? myListingsLoading : isLoading;
  // Every switch shows the loading cards: while the new results load (the old
  // ones are only placeholder data), and for a moment even when cached.
  const resultsKey = `${activeTab}|${selectedCategory}|${search}|${page}`;
  const resultsLoading = useMinimumLoading(
    resultsKey,
    effectiveLoading || (activeTab !== 'mine' && isSwitching),
  );
  const reduceMotion = useReducedMotion();

  const navigateToListing = useCallback((listing: BusinessListing) => {
    navigate(paths.businessListing(generateBusinessSlug(listing)));
  }, []);

  // Surprise Me - random business discovery
  const handleSurpriseMe = useCallback(() => {
    if (listings.length === 0) return;
    setSurpriseAnim(true);
    setTimeout(() => {
      const randomListing = listings[Math.floor(Math.random() * listings.length)];
      navigateToListing(randomListing);
      setSurpriseAnim(false);
    }, 800);
  }, [listings, navigateToListing]);

  // Individuals on screen (stats + the featured professionals rail)
  const individualListings = useMemo(() =>
    listings.filter(l => l.listingType === 'individual'),
  [listings]);

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
    if (tab === 'mine' && !state.currentUser) {
      dispatch({ type: 'TOGGLE_AUTH_MODAL', payload: { isOpen: true, view: 'login' } });
      return;
    }
    setActiveTab(tab);
    setPage(1);
    navigate(paths.businessDirectory(tab === 'all' ? undefined : tab));
  }, [dispatch, state.currentUser]);

  const handleCardClick = useCallback((listing: BusinessListing) => {
    navigateToListing(listing);
  }, [navigateToListing]);


  // Back like the platform's own back: to wherever the visitor came from
  // (search, home, another business); the directory only when there is no
  // history to return to (a shared link, a fresh tab).
  const handleBackToList = useCallback(() => {
    goBack(paths.businessDirectory(activeTab === 'all' ? undefined : activeTab));
  }, [activeTab]);

  // Auth-guarded create click - require login for any create/list action
  const requireAuth = useCallback((action: () => void) => {
    if (!state.currentUser) {
      dispatch({ type: 'TOGGLE_AUTH_MODAL', payload: { isOpen: true, view: 'login' } });
      return;
    }
    action();
  }, [state.currentUser, dispatch]);

  // The floating phone button shows while the inline one is out of view.
  const [listButton, setListButton] = useState<HTMLButtonElement | null>(null);
  const listButtonOffscreen = useOffscreen(listButton);

  const handleCreateClick = useCallback(() => {
    requireAuth(() => navigate(paths.businessListingNew()));
  }, [requireAuth]);

  // "Offer your services" (professionals rail): the form opens on Individual.
  const handleOfferServices = useCallback(() => {
    requireAuth(() => navigate(paths.businessListingNew('individual')));
  }, [requireAuth]);
  const [searchParams] = useSearchParams();
  const createType = listingTypeFromQuery(searchParams.get('type'));

  const handleCreateSuccess = useCallback(() => {
    // Replace, so Back does not return to an emptied form
    navigate(paths.businessDirectory('mine'), { replace: true });
    setPage(1);
    setSearch('');
    setSelectedCategory('');
  }, []);

  const popularCategories = useMemo(() =>
    BUSINESS_CATEGORIES.filter(c => ['construction', 'renovation', 'cleaning', 'moving', 'architecture', 'plumbing'].includes(c)),
  []);

  // Stats derived from listings
  const businessCount = useMemo(() => listings.filter(l => l.listingType === 'business').length, [listings]);
  const individualCount = useMemo(() => individualListings.length, [individualListings]);
  const categoryCount = useMemo(() => new Set(listings.map(l => l.category)).size, [listings]);

  // Sub-view routing
  if (selectedListingId) {
    return <BusinessDetailPage listingId={selectedListingId} onBack={handleBackToList} />;
  }

  if (creating && state.currentUser) {
    return <CreateBusinessListingForm onBack={() => goBack(paths.businessDirectory())} onSuccess={handleCreateSuccess} initialType={createType} />;
  }

  const tabs: { key: TabType; label: string; icon: SoftIconName | null }[] = [
    { key: 'all', label: t('tabs.all'), icon: null },
    { key: 'businesses', label: t('tabs.businesses'), icon: 'store' },
    { key: 'individuals', label: t('tabs.individuals'), icon: 'user' },
    ...(state.currentUser
      ? [{ key: 'mine' as TabType, label: t('tabs.mine', 'My Businesses'), icon: 'users' as SoftIconName }]
      : []),
  ];

  return (
    <div className="liquid-backdrop min-h-screen">
      {/* === PREMIUM HERO SECTION === (its wavy bottom edge is a mask, .bd-hero-wave) */}
      <div className="bd-hero-wave relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900" />
        <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-transparent to-violet-600/20" />

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

        {/* Background accents */}
        <div className="absolute top-10 left-[10%] w-72 h-72 bg-blue-500/20 rounded-full blur-3xl" />
        <div className="absolute bottom-10 right-[10%] w-96 h-96 bg-violet-500/20 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/10 rounded-full blur-3xl" />

        {/* Main hero content */}
        <div className="relative z-10 px-4 sm:px-6 lg:px-8 py-10 sm:py-14 lg:py-20 landscape:py-6">
          <div className="max-w-7xl mx-auto">
            {/* Heading */}
            <motion.div
              className="text-center mb-8 sm:mb-10"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, type: 'spring', stiffness: 300, damping: 28 }}
            >
              <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-black text-white mb-3 sm:mb-5 leading-[1.15] tracking-tight px-2 sm:px-0 landscape:text-3xl">
                {t('hero.title')}
                <span
                  className="block mt-1 sm:mt-2 bg-gradient-to-r from-blue-400 via-violet-400 to-purple-400 bg-clip-text text-transparent"
                >
                  {t('hero.titleHighlight')}
                </span>
              </h1>
              <p className="text-sm sm:text-base md:text-lg lg:text-xl text-white/70 max-w-2xl mx-auto leading-relaxed px-4 sm:px-0">
                {t('hero.subtitle')}
              </p>
            </motion.div>

            {/* Glass search box */}
            <motion.div
              className="max-w-2xl mx-auto"
              initial={{ opacity: 0, y: 24, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.35, type: 'spring', stiffness: 300, damping: 28 }}
            >
              <div className="liquid-dark rounded-[24px] p-3 sm:rounded-[30px] sm:p-5 md:p-6">
                <form onSubmit={handleSearch}>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-3 sm:left-4 flex items-center pointer-events-none">
                      <SearchIcon className={`w-5 h-5 transition-colors duration-300 ${searchInput ? 'text-primary' : 'text-white/50'}`} />
                    </div>
                    <input
                      type="text"
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      placeholder={isListening ? t('voiceSearch.listening') : t('search.placeholder')}
                      className={`w-full pl-10 sm:pl-12 pr-36 sm:pr-40 py-3 sm:py-4 bg-white/10 border rounded-xl sm:rounded-2xl text-white placeholder-white/40 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 transition-all duration-300 text-sm sm:text-base ${isListening ? 'border-red-400/60 ring-2 ring-red-400/20' : 'border-white/20'}`}
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                      {/* Voice search button */}
                      {voiceSupported && (
                        <motion.button
                          type="button"
                          onClick={isListening ? stopVoiceSearch : startVoiceSearch}
                          className={`relative w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
                            isListening
                              ? 'bg-red-500 text-white'
                              : 'bg-white/10 text-white/60 hover:bg-white/20 hover:text-white'
                          }`}
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          aria-label={isListening ? t('voiceSearch.stop') : t('voiceSearch.start')}
                          title={isListening ? t('voiceSearch.stop') : t('voiceSearch.start')}
                        >
                          <MicrophoneIcon className="w-4 h-4" />
                          {isListening && (
                            <>
                              <motion.span
                                className="absolute inset-0 rounded-lg border-2 border-red-400"
                                animate={{ scale: [1, 1.4], opacity: [0.6, 0] }}
                                transition={{ duration: 1, repeat: Infinity }}
                              />
                              <motion.span
                                className="absolute inset-0 rounded-lg border-2 border-red-400"
                                animate={{ scale: [1, 1.6], opacity: [0.4, 0] }}
                                transition={{ duration: 1, repeat: Infinity, delay: 0.3 }}
                              />
                            </>
                          )}
                        </motion.button>
                      )}
                      <motion.button
                        type="submit"
                        className="liquid-tint rounded-full px-4 py-2 text-xs font-bold sm:px-6 sm:py-2.5 sm:text-sm"
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        {t('search.button')}
                      </motion.button>
                    </div>
                  </div>
                </form>

                {/* Popular categories */}
                <AnimatePresence>
                  {!searchInput && (
                    <motion.div
                      className="text-center mt-4"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <p className="text-white/50 text-xs mb-2">{t('hero.popularCategories')}</p>
                      <div className="flex flex-wrap justify-center gap-2">
                        {popularCategories.map((cat, i) => (
                          <motion.button
                            key={cat}
                            type="button"
                            onClick={() => handleCategoryClick(cat)}
                            className="liquid-dark rounded-full px-3 py-1.5 text-xs text-white/85 hover:text-white"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5 + i * 0.05 }}
                            whileHover={{ scale: 1.05, y: -1 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            <CategoryIcon category={cat} className="inline-block w-4 h-4 mr-0.5 align-[-3px]" /> {t(`categories.${cat}`)}
                          </motion.button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </div>
        </div>

      </div>

      {/* === ANIMATED STATS BAR === */}
      {!isLoading && total > 0 && activeTab !== 'mine' && (
        <motion.div
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-4 sm:-mt-6 mb-6 relative z-10"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.5 }}
          variants={scaleInVariants}
        >
          <div className="liquid-surface rounded-[28px] p-3 sm:p-5">
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3">
              {[
                { icon: 'chart' as SoftIconName, value: total, label: t('stats.totalListings'), color: 'from-primary/10 to-blue-500/10' },
                { icon: 'store' as SoftIconName, value: businessCount, label: t('stats.businesses'), color: 'from-blue-500/10 to-cyan-500/10' },
                { icon: 'user' as SoftIconName, value: individualCount, label: t('stats.professionals'), color: 'from-violet-500/10 to-purple-500/10' },
                { icon: 'tag' as SoftIconName, value: categoryCount, label: t('stats.categories'), color: 'from-amber-500/10 to-orange-500/10' },
              ].map((stat, i) => (
                <motion.div
                  key={stat.label}
                  className={`liquid-control rounded-2xl p-3 text-center`}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1, type: 'spring', stiffness: 200, damping: 20 }}
                >
                  <div className="flex items-center justify-center gap-1.5 mb-1">
                    <SoftIcon name={stat.icon} className="w-7 h-7 sm:w-8 sm:h-8 flex-shrink-0" />
                    <span className="text-2xl sm:text-3xl font-black text-neutral-900">
                      <AnimatedNumber value={stat.value} duration={1200} />
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-neutral-500 font-medium">{stat.label}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* Ad — horizontal leaderboard between the hero/stats and the listings */}
      <AdSlot page="business-directory" placement="in-content" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 mb-2" showPlaceholder />

      {/* === MAIN CONTENT === */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Tabs + Actions bar */}
        <motion.div
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-6"
          variants={fadeUpVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {/* Scrollable tabs wrapper on mobile */}
          <div className="overflow-x-auto scrollbar-hide -mx-4 px-4 -mt-2 pt-2 -mb-6 pb-6 sm:mx-0 sm:px-0">
            <div className="liquid-control flex min-w-max items-center gap-1 rounded-full p-1">
              {tabs.map((tab) => (
                <motion.button
                  key={tab.key}
                  type="button"
                  onClick={() => handleTabChange(tab.key)}
                  className={`relative flex min-h-[40px] items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-2 text-xs font-semibold transition-colors duration-200 sm:px-4 sm:text-sm ${
                    activeTab === tab.key
                      ? 'text-white'
                      : 'text-neutral-600 hover:text-neutral-900'
                  }`}
                  whileHover={activeTab !== tab.key ? { scale: 1.02 } : {}}
                  whileTap={{ scale: 0.97 }}
                >
                  {activeTab === tab.key && (
                    <motion.div
                      layoutId="activeTab"
                      className="liquid-tint absolute inset-0 rounded-full"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-1.5">
                    {tab.icon && <SoftIcon name={tab.icon} className="w-5 h-5" />}
                    {tab.label}
                  </span>
                </motion.button>
              ))}
            </div>
          </div>

          {/* Wraps instead of scrolling: a scroll box would clip the glass shadows. */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Map / Grid toggle */}
            <motion.button
              type="button"
              onClick={() => setViewMode(v => v === 'grid' ? 'map' : 'grid')}
              className={`flex min-h-[40px] flex-shrink-0 items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold sm:px-4 sm:py-2.5 sm:text-sm ${
                viewMode === 'map'
                  ? 'liquid-tint'
                  : 'liquid-control text-neutral-700'
              }`}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              {viewMode === 'map' ? (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" />
                  </svg>
                  {t('viewMode.grid', 'Grid')}
                </>
              ) : (
                <>
                  <MapIcon className="w-4 h-4" />
                  {t('viewMode.map', 'Map')}
                </>
              )}
            </motion.button>

            {/* Surprise Me button - requires auth */}
            {listings.length > 1 && (
              <motion.button
                type="button"
                onClick={() => requireAuth(handleSurpriseMe)}
                disabled={surpriseAnim}
                className="liquid-tint liquid-tint--amber flex min-h-[40px] flex-shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold disabled:opacity-70 sm:gap-2 sm:px-4 sm:py-2.5 sm:text-sm"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                <motion.span
                  animate={surpriseAnim ? { rotate: 360 } : {}}
                  transition={surpriseAnim ? { duration: 0.6, repeat: Infinity, ease: 'linear' } : {}}
                >
                  <ArrowPathIcon className="w-4 h-4" />
                </motion.span>
                {surpriseAnim ? t('surpriseMe.loading') : t('surpriseMe.button')}
              </motion.button>
            )}

            {/* List Your Business - requires auth */}
            <motion.button
              ref={setListButton}
              type="button"
              onClick={handleCreateClick}
              className="liquid-tint flex min-h-[40px] flex-shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold sm:gap-2 sm:px-5 sm:py-2.5 sm:text-sm"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              <PlusIcon className="w-4 h-4" />
              {t('cta.listBusiness')}
            </motion.button>
          </div>
        </motion.div>

        {/* Featured professionals: ID badges on lanyards. Always shown, on every
            tab and filter (its own query), with an invitation when there are none. */}
        {professionalsLoading ? (
          <div className="mb-6 h-[26rem] animate-pulse rounded-[28px] bg-white/70 sm:mb-8" aria-hidden="true" />
        ) : (
          <FeaturedProfessionalsRail listings={professionals} onListYourself={handleOfferServices} className="mb-6 sm:mb-8" showWhenEmpty />
        )}

        {/* Category filters */}
        <motion.div variants={fadeUpVariants} initial="hidden" whileInView="visible" viewport={{ once: true }}>
          <ChipScroller className="gap-1.5 sm:gap-2 pt-2 pb-8 -mb-5 -mx-4 px-4 sm:-mx-1 sm:px-1">
            <motion.button
              type="button"
              onClick={() => handleCategoryClick('')}
              className={`px-3 sm:px-4 py-1.5 sm:py-2 min-h-[38px] rounded-full text-xs sm:text-sm font-medium flex-shrink-0 ${
                selectedCategory === ''
                  ? 'liquid-tint'
                  : 'liquid-control text-neutral-700'
              }`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {t('filters.all')}
            </motion.button>
            {BUSINESS_CATEGORIES.filter(c => c !== 'other').slice(0, 10).map((category) => (
              <motion.button
                key={category}
                type="button"
                onClick={() => handleCategoryClick(category)}
                className={`px-3 sm:px-4 py-1.5 sm:py-2 min-h-[38px] rounded-full text-xs sm:text-sm font-medium flex-shrink-0 whitespace-nowrap ${
                  selectedCategory === category
                    ? 'liquid-tint'
                    : 'liquid-control text-neutral-700'
                }`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <CategoryIcon category={category} className="inline-block w-5 h-5 mr-1 align-[-5px]" />
                {t(`categories.${category}`)}
              </motion.button>
            ))}
          </ChipScroller>
        </motion.div>

        {/* Results count: a placeholder bar while loading keeps the line's height */}
        <div className="mb-4 flex min-h-5 items-center" aria-live="polite">
          {resultsLoading ? (
            <div className="h-3 w-32 animate-pulse rounded bg-neutral-200" />
          ) : (
            <p className="text-xs text-neutral-500 sm:text-sm">
              {t('results.showing', { count: activeTab === 'mine' ? myListings.length : total })}
            </p>
          )}
        </div>

        {/* One state at a time (loading, grid, map, empty): the old one leaves before the next enters */}
        <AnimatePresence mode="wait" initial={false}>
          {resultsLoading ? (
            <motion.div
              key="loading"
              role="status"
              aria-label={t('results.loading', 'Loading businesses')}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <BusinessGridSkeleton />
            </motion.div>
          ) : listings.length === 0 ? (
            <motion.div
              key="empty"
              className="text-center py-16 relative"
              initial={{ opacity: 0, scale: reduceMotion ? 1 : 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="relative">
                <SoftIcon name="store" className="block w-20 h-20 mx-auto mb-6" />
                <h3 className="text-xl font-bold text-neutral-800 mb-2">
                  {t('empty.title')}
                </h3>
                <p className="text-neutral-500 mb-6 max-w-md mx-auto">
                  {t('empty.description')}
                </p>
                {/* Be First button - requires auth */}
                <motion.button
                  type="button"
                  onClick={handleCreateClick}
                  className="liquid-tint inline-flex min-h-[48px] items-center gap-2 rounded-full px-6 py-3 font-semibold"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <PlusIcon className="w-4 h-4" />
                  {t('cta.beFirst')}
                </motion.button>
              </div>
            </motion.div>
          ) : viewMode === 'map' ? (
            <motion.div
              key="map-view"
              className="h-[500px] sm:h-[600px] lg:h-[700px]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <BusinessDirectoryMap
                listings={listings}
                onListingClick={handleCardClick}
              />
            </motion.div>
          ) : (
            <motion.div
              key={`listings-${resultsKey}`}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              exit={{ opacity: 0, transition: { duration: 0.15 } }}
            >
              {listings.map((listing) => (
                <motion.div key={listing.id} variants={cardVariants}>
                  <BusinessCard
                    listing={listing}
                    onClick={handleCardClick}
                  />
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Pagination */}
        {totalPages > 1 && activeTab !== 'mine' && (
          <motion.div
            className="flex justify-center items-center gap-2 sm:gap-3 mt-8 sm:mt-10"
            variants={fadeUpVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            <motion.button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 sm:px-5 py-2 sm:py-2.5 liquid-control rounded-full text-xs sm:text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-primary hover:text-white hover:border-primary transition-all duration-300"
              whileHover={page > 1 ? { scale: 1.03 } : {}}
              whileTap={page > 1 ? { scale: 0.97 } : {}}
            >
              {t('pagination.previous')}
            </motion.button>
            <span className="text-xs sm:text-sm text-neutral-500 font-medium whitespace-nowrap">
              {t('pagination.pageOf', { page, totalPages })}
            </span>
            <motion.button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-3 sm:px-5 py-2 sm:py-2.5 liquid-control rounded-full text-xs sm:text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-primary hover:text-white hover:border-primary transition-all duration-300"
              whileHover={page < totalPages ? { scale: 1.03 } : {}}
              whileTap={page < totalPages ? { scale: 0.97 } : {}}
            >
              {t('pagination.next')}
            </motion.button>
          </motion.div>
        )}
      </div>

      <Footer />
      <ListBusinessFab visible={listButtonOffscreen} onClick={handleCreateClick} />
    </div>
  );
};

export default BusinessDirectoryPage;
