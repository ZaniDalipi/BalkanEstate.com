import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppContext } from '@/context/AppContext';
import { useBusinessListings } from '../hooks';
import BusinessCard from './BusinessCard';
import BusinessDetailPage from './BusinessDetailPage';
import BusinessDirectoryMap from './BusinessDirectoryMap';
import CreateBusinessListingForm from './CreateBusinessListingForm';
import AnimatedTooltip, { type AnimatedTooltipItem } from '@/src/components/ui/AnimatedTooltip';
import { BUSINESS_CATEGORIES, type BusinessCategory, type BusinessListing, type ListingType } from '@/src/shared/types/businessListing.types';
import { SearchIcon, PlusIcon, BuildingStorefrontIcon, WrenchScrewdriverIcon, UserGroupIcon, UserIcon, MicrophoneIcon, ArrowPathIcon, BoltIcon, ChartBarIcon, MapIcon } from '@/constants';
import { AnimatedNumber } from '@/src/components/ui/Animations';


import { buildLocalizedPath } from '@/src/utils/languageRouting';
import Footer from '@/components/shared/Footer';

interface BusinessDirectoryPageProps {
  selectedListingId?: string | null;
}

type SubView = 'list' | 'detail' | 'create';
type TabType = 'all' | 'businesses' | 'individuals';
type ViewMode = 'grid' | 'map';

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

// Framer-motion variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 30, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring', stiffness: 260, damping: 24 },
  },
};

const fadeUpVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] } },
};

const scaleInVariants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { opacity: 1, scale: 1, transition: { type: 'spring', stiffness: 200, damping: 20 } },
};

const BusinessDirectoryPage: React.FC<BusinessDirectoryPageProps> = ({ selectedListingId: propListingId }) => {
  const { t } = useTranslation('businessDirectory');
  const { state, dispatch } = useAppContext();


  const [subView, setSubView] = useState<SubView>(propListingId ? 'detail' : 'list');
  const [selectedListingId, setSelectedListingId] = useState<string | null>(propListingId ?? null);

  // Sync with prop when URL-based navigation changes the prop
  useEffect(() => {
    if (propListingId) {
      setSelectedListingId(propListingId);
      setSubView('detail');
    } else if (propListingId === null && subView === 'detail') {
      setSubView('list');
      setSelectedListingId(null);
    }
  }, [propListingId]);

  // Filters
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<BusinessCategory | ''>('');
  const [activeTab, setActiveTab] = useState<TabType>(state.businessDirectoryTab || 'all');
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  // Sync tab from context (URL-based navigation)
  useEffect(() => {
    if (state.businessDirectoryTab && state.businessDirectoryTab !== activeTab) {
      setActiveTab(state.businessDirectoryTab);
      setPage(1);
    }
  }, [state.businessDirectoryTab]);

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

  const { listings, total, totalPages, isLoading } = useBusinessListings(filters);

  const navigateToListing = useCallback((listing: BusinessListing) => {
    const identifier = listing.slug || listing.id;
    setSelectedListingId(identifier);
    setSubView('detail');
    dispatch({ type: 'SET_SELECTED_BUSINESS_LISTING', payload: identifier });
    window.history.pushState({}, '', buildLocalizedPath(`/business-directory/${identifier}`));
  }, [dispatch]);

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

  // Derive individuals for AnimatedTooltip row
  const individualListings = useMemo(() =>
    listings.filter(l => l.listingType === 'individual'),
  [listings]);

  const tooltipItems: AnimatedTooltipItem[] = useMemo(() => {
    const shuffled = [...individualListings].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 12).map((l, i) => ({
      id: i,
      name: l.name,
      designation: t(`categories.${l.category}`),
      image: l.logoUrl || '',
      location: `${l.city}, ${l.country}`,
      phone: l.contactPhone,
      email: l.contactEmail,
      services: l.services,
      isVerified: l.isVerified,
      listingId: l.id,
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
    dispatch({ type: 'SET_BUSINESS_DIRECTORY_TAB', payload: tab });
    const tabPath = tab === 'all' ? '/business-directory' : `/business-directory/${tab}`;
    window.history.pushState({}, '', buildLocalizedPath(tabPath));
  }, [dispatch]);

  const handleCardClick = useCallback((listing: BusinessListing) => {
    navigateToListing(listing);
  }, [navigateToListing]);

  const handleTooltipClick = useCallback((item: AnimatedTooltipItem) => {
    const match = individualListings.find(l =>
      (item.listingId && (l.id === item.listingId || l.slug === item.listingId)) || l.name === item.name
    );
    if (match) {
      navigateToListing(match);
    }
  }, [individualListings, navigateToListing]);

  const handleQuoteRequest = useCallback((item: AnimatedTooltipItem) => {
    // Build pre-filled message for requesting a quote
    const subject = encodeURIComponent(`Quote Request - ${item.name}`);
    const body = encodeURIComponent(
      `Hi ${item.name},\n\nI found your profile on BalkanEstate and I'm interested in your ${item.designation} services.\n\nCould you please provide me with a quote?\n\nThank you!`
    );
    if (item.email) {
      window.open(`mailto:${item.email}?subject=${subject}&body=${body}`, '_self');
    } else if (item.phone) {
      window.open(`tel:${item.phone}`, '_self');
    }
  }, []);

  const handleBackToList = useCallback(() => {
    setSubView('list');
    setSelectedListingId(null);
    dispatch({ type: 'SET_SELECTED_BUSINESS_LISTING', payload: null });
    const tabPath = activeTab === 'all' ? '/business-directory' : `/business-directory/${activeTab}`;
    window.history.pushState({}, '', buildLocalizedPath(tabPath));
  }, [dispatch, activeTab]);

  // Auth-guarded create click - require login for any create/list action
  const requireAuth = useCallback((action: () => void) => {
    if (!state.currentUser) {
      dispatch({ type: 'TOGGLE_AUTH_MODAL', payload: { isOpen: true, view: 'login' } });
      return;
    }
    action();
  }, [state.currentUser, dispatch]);

  const handleCreateClick = useCallback(() => {
    requireAuth(() => setSubView('create'));
  }, [requireAuth]);

  const handleCreateSuccess = useCallback(() => {
    setSubView('list');
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

        {/* Floating blur orbs with motion */}
        <motion.div
          className="absolute top-10 left-[10%] w-72 h-72 bg-blue-500/20 rounded-full blur-3xl"
          animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.35, 0.2] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute bottom-10 right-[10%] w-96 h-96 bg-violet-500/20 rounded-full blur-3xl"
          animate={{ scale: [1.1, 1, 1.1], opacity: [0.15, 0.3, 0.15] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
        />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/10 rounded-full blur-3xl" />

        {/* Floating decorative icons */}
        <motion.div
          className="absolute top-20 left-[5%] opacity-20 hidden lg:block"
          animate={{ y: [-10, 10, -10], rotate: [0, 5, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
        >
          <WrenchScrewdriverIcon className="w-16 h-16 text-white" />
        </motion.div>
        <motion.div
          className="absolute bottom-32 right-[8%] opacity-15 hidden lg:block"
          animate={{ y: [10, -10, 10], rotate: [0, -5, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 1.5 }}
        >
          <BuildingStorefrontIcon className="w-20 h-20 text-white" />
        </motion.div>

        {/* Main hero content */}
        <div className="relative z-10 px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
          <div className="max-w-7xl mx-auto">
            {/* Heading */}
            <motion.div
              className="text-center mb-8 sm:mb-10"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-white mb-4 sm:mb-6 leading-tight">
                {t('hero.title')}
                <motion.span
                  className="block mt-2 bg-gradient-to-r from-blue-400 via-violet-400 to-purple-400 bg-clip-text text-transparent"
                  initial={{ backgroundPosition: '0% 50%' }}
                  animate={{ backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] }}
                  transition={{ duration: 5, repeat: Infinity, ease: 'linear' }}
                  style={{ backgroundSize: '200% auto' }}
                >
                  {t('hero.titleHighlight')}
                </motion.span>
              </h1>
              <p className="text-base sm:text-lg lg:text-xl text-white/70 max-w-3xl mx-auto leading-relaxed">
                {t('hero.subtitle')}
              </p>
            </motion.div>

            {/* Glass search box */}
            <motion.div
              className="max-w-2xl mx-auto"
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.4, type: 'spring', stiffness: 200, damping: 22 }}
            >
              <div className="relative bg-white/10 backdrop-blur-xl rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-white/20 shadow-2xl shadow-black/20">
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
                        className="px-4 sm:px-6 py-2 sm:py-2.5 bg-gradient-to-r from-primary to-blue-600 hover:from-primary hover:to-blue-700 text-white font-bold rounded-lg sm:rounded-xl text-xs sm:text-sm transition-colors hover:shadow-lg hover:shadow-primary/30"
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
                            className="px-3 py-1.5 text-xs bg-white/10 hover:bg-white/20 border border-white/10 hover:border-white/30 text-white/70 hover:text-white rounded-lg transition-colors"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5 + i * 0.05 }}
                            whileHover={{ scale: 1.05, y: -1 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            {CATEGORY_ICONS[cat]} {t(`categories.${cat}`)}
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

        {/* Wave divider */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
            <path d="M0 80V40C240 0 480 0 720 40C960 80 1200 80 1440 40V80H0Z" fill="#fafafa" />
          </svg>
        </div>
      </div>

      {/* === ANIMATED STATS BAR === */}
      {!isLoading && total > 0 && (
        <motion.div
          className="max-w-7xl mx-auto px-4 -mt-6 mb-6 relative z-10"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.5 }}
          variants={scaleInVariants}
        >
          <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl shadow-neutral-200/50 border border-neutral-100/80 p-4 sm:p-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
              {[
                { icon: <ChartBarIcon className="w-5 h-5 text-primary" />, value: total, label: t('stats.totalListings'), color: 'from-primary/10 to-blue-500/10' },
                { icon: <BuildingStorefrontIcon className="w-5 h-5 text-blue-500" />, value: businessCount, label: t('stats.businesses'), color: 'from-blue-500/10 to-cyan-500/10' },
                { icon: <UserIcon className="w-5 h-5 text-violet-500" />, value: individualCount, label: t('stats.professionals'), color: 'from-violet-500/10 to-purple-500/10' },
                { icon: <BoltIcon className="w-5 h-5 text-amber-500" />, value: categoryCount, label: t('stats.categories'), color: 'from-amber-500/10 to-orange-500/10' },
              ].map((stat, i) => (
                <motion.div
                  key={stat.label}
                  className={`text-center p-3 rounded-xl bg-gradient-to-br ${stat.color}`}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1, type: 'spring', stiffness: 200, damping: 20 }}
                >
                  <div className="flex items-center justify-center gap-1.5 mb-1">
                    {stat.icon}
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

      {/* === MAIN CONTENT === */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Tabs + Actions bar */}
        <motion.div
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6"
          variants={fadeUpVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          <div className="flex items-center gap-1 p-1 bg-white rounded-xl border border-neutral-200/80 shadow-sm">
            {tabs.map((tab) => (
              <motion.button
                key={tab.key}
                type="button"
                onClick={() => handleTabChange(tab.key)}
                className={`relative flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
                  activeTab === tab.key
                    ? 'text-white'
                    : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50'
                }`}
                whileHover={activeTab !== tab.key ? { scale: 1.02 } : {}}
                whileTap={{ scale: 0.97 }}
              >
                {activeTab === tab.key && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 bg-gradient-to-r from-primary to-blue-600 rounded-lg shadow-md shadow-primary/25"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-1.5">
                  {tab.icon}
                  {tab.label}
                </span>
              </motion.button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            {/* Map / Grid toggle */}
            <motion.button
              type="button"
              onClick={() => setViewMode(v => v === 'grid' ? 'map' : 'grid')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold transition-all text-sm ${
                viewMode === 'map'
                  ? 'bg-primary text-white shadow-lg shadow-primary/25'
                  : 'bg-white text-neutral-600 border border-neutral-200 hover:border-primary/30 hover:shadow-md'
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
                className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-amber-500/25 transition-shadow flex-shrink-0 text-sm disabled:opacity-70"
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
              type="button"
              onClick={handleCreateClick}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary to-blue-600 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-primary/25 transition-shadow flex-shrink-0"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              <PlusIcon className="w-4 h-4" />
              {t('cta.listBusiness')}
            </motion.button>
          </div>
        </motion.div>

        {/* Individuals AnimatedTooltip showcase */}
        <AnimatePresence>
          {(activeTab === 'all' || activeTab === 'individuals') && tooltipItems.length > 0 && (
            <motion.div
              className="mb-8 p-6 bg-gradient-to-r from-slate-900 via-blue-900/95 to-indigo-900 rounded-2xl border border-white/10 shadow-xl overflow-hidden relative"
              initial={{ opacity: 0, y: 20, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: -10, height: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 25 }}
            >
              {/* Subtle decorative orb (clipped so it doesn't bleed) */}
              <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
                <motion.div
                  className="absolute -top-10 -right-10 w-40 h-40 bg-violet-500/20 rounded-full blur-3xl"
                  animate={{ scale: [1, 1.3, 1], opacity: [0.2, 0.4, 0.2] }}
                  transition={{ duration: 4, repeat: Infinity }}
                />
              </div>

              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-1">
                  <UserGroupIcon className="w-5 h-5 text-violet-400" />
                  <h3 className="text-white font-bold text-lg">{t('individuals.title')}</h3>
                </div>
                <p className="text-white/50 text-sm mb-5">{t('individuals.subtitle')}</p>
                <div className="flex justify-center overflow-visible">
                  <AnimatedTooltip items={tooltipItems} onItemClick={handleTooltipClick} onQuoteRequest={handleQuoteRequest} />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Category filters */}
        <motion.div
          className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide mb-4"
          variants={fadeUpVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          <motion.button
            type="button"
            onClick={() => handleCategoryClick('')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 flex-shrink-0 ${
              selectedCategory === ''
                ? 'bg-primary text-white shadow-lg shadow-primary/25'
                : 'bg-white text-neutral-600 border border-neutral-200 hover:border-primary/30 hover:shadow-md'
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
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 flex-shrink-0 whitespace-nowrap ${
                selectedCategory === category
                  ? 'bg-primary text-white shadow-lg shadow-primary/25'
                  : 'bg-white text-neutral-600 border border-neutral-200 hover:border-primary/30 hover:shadow-md'
              }`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <span className="mr-1">{CATEGORY_ICONS[category]}</span>
              {t(`categories.${category}`)}
            </motion.button>
          ))}
        </motion.div>

        {/* Results info */}
        <AnimatePresence mode="wait">
          {!isLoading && (
            <motion.p
              key={`results-${total}`}
              className="text-sm text-neutral-500 mb-4"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.3 }}
            >
              {t('results.showing', { count: total })}
            </motion.p>
          )}
        </AnimatePresence>

        {/* Loading state - shimmer skeletons */}
        <AnimatePresence>
          {isLoading && (
            <motion.div
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-white rounded-2xl sm:rounded-3xl shadow-lg overflow-hidden border border-gray-100/80">
                  <div className="h-20 sm:h-24 relative overflow-hidden bg-neutral-200">
                    <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/40 to-transparent" />
                  </div>
                  <div className="px-4 sm:px-5 -mt-8">
                    <div className="w-14 h-14 rounded-xl bg-neutral-200 border-4 border-white relative overflow-hidden">
                      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/40 to-transparent" style={{ animationDelay: `${i * 150}ms` }} />
                    </div>
                  </div>
                  <div className="p-4 pt-3 space-y-2.5">
                    <div className="h-5 bg-neutral-200 rounded-lg w-3/4 relative overflow-hidden">
                      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/40 to-transparent" style={{ animationDelay: `${i * 150 + 100}ms` }} />
                    </div>
                    <div className="h-3 bg-neutral-100 rounded w-1/2" />
                    <div className="h-3 bg-neutral-100 rounded w-full" />
                    <div className="h-3 bg-neutral-100 rounded w-2/3" />
                  </div>
                  <div className="px-4 py-3 border-t border-neutral-100 flex justify-between">
                    <div className="h-3 bg-neutral-100 rounded w-1/3" />
                    <div className="h-3 bg-neutral-100 rounded w-1/4" />
                  </div>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Listings grid or map */}
        <AnimatePresence mode="wait">
          {!isLoading && listings.length > 0 && viewMode === 'grid' && (
            <motion.div
              key={`listings-${selectedCategory}-${activeTab}-${page}`}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
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

        {/* Map view */}
        <AnimatePresence mode="wait">
          {!isLoading && listings.length > 0 && viewMode === 'map' && (
            <motion.div
              key="map-view"
              className="h-[500px] sm:h-[600px] lg:h-[700px]"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.3 }}
            >
              <BusinessDirectoryMap
                listings={listings}
                onListingClick={handleCardClick}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty state */}
        <AnimatePresence>
          {!isLoading && listings.length === 0 && (
            <motion.div
              className="text-center py-16 relative"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            >
              <motion.div
                className="absolute top-8 left-1/4 w-20 h-20 bg-primary/5 rounded-full blur-xl"
                animate={{ scale: [1, 1.4, 1], opacity: [0.3, 0.6, 0.3] }}
                transition={{ duration: 3, repeat: Infinity }}
              />
              <motion.div
                className="absolute bottom-8 right-1/4 w-16 h-16 bg-violet-500/5 rounded-full blur-xl"
                animate={{ scale: [1.2, 1, 1.2], opacity: [0.2, 0.5, 0.2] }}
                transition={{ duration: 4, repeat: Infinity, delay: 1 }}
              />

              <div className="relative">
                <motion.div
                  className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-primary/10 to-violet-500/10 rounded-3xl flex items-center justify-center"
                  animate={{ rotate: [0, 5, -5, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <BuildingStorefrontIcon className="w-10 h-10 text-primary/50" />
                </motion.div>
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
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary to-blue-600 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-primary/25 transition-shadow"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <PlusIcon className="w-4 h-4" />
                  {t('cta.beFirst')}
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Pagination */}
        {totalPages > 1 && (
          <motion.div
            className="flex justify-center items-center gap-3 mt-10"
            variants={fadeUpVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            <motion.button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-5 py-2.5 rounded-xl bg-white/80 backdrop-blur-sm border border-neutral-200 text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-primary hover:text-white hover:border-primary transition-all duration-300"
              whileHover={page > 1 ? { scale: 1.03 } : {}}
              whileTap={page > 1 ? { scale: 0.97 } : {}}
            >
              {t('pagination.previous')}
            </motion.button>
            <span className="text-sm text-neutral-500 font-medium">
              {t('pagination.pageOf', { page, totalPages })}
            </span>
            <motion.button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-5 py-2.5 rounded-xl bg-white/80 backdrop-blur-sm border border-neutral-200 text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-primary hover:text-white hover:border-primary transition-all duration-300"
              whileHover={page < totalPages ? { scale: 1.03 } : {}}
              whileTap={page < totalPages ? { scale: 0.97 } : {}}
            >
              {t('pagination.next')}
            </motion.button>
          </motion.div>
        )}
      </div>

      <Footer />
    </div>
  );
};

export default BusinessDirectoryPage;
