import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppContext } from '@/context/AppContext';
import { useBusinessListings, useMyBusinessListings } from '../hooks';
import BusinessCard from './BusinessCard';
import { AdSlot } from '@/src/features/promo';
import BusinessDetailPage from './BusinessDetailPage';
import BusinessDirectoryMap from './BusinessDirectoryMap';
import CreateBusinessListingForm from './CreateBusinessListingForm';
import AnimatedTooltip, { type AnimatedTooltipItem } from '@/src/components/ui/AnimatedTooltip';
import { BUSINESS_CATEGORIES, type BusinessCategory, type BusinessListing, type ListingType } from '@/src/shared/types/businessListing.types';
import { SearchIcon, PlusIcon, BuildingStorefrontIcon, UserGroupIcon, UserIcon, MicrophoneIcon, ArrowPathIcon, BoltIcon, ChartBarIcon, MapIcon } from '@/constants';
import { AnimatedNumber } from '@/src/components/ui/Animations';

import { buildLocalizedPath } from '@/src/utils/languageRouting';
import { generateBusinessSlug } from '@/utils/slug';
import Footer from '@/components/shared/Footer';

interface BusinessDirectoryPageProps {
  selectedListingId?: string | null;
}

type SubView = 'list' | 'detail' | 'create';
type TabType = 'all' | 'businesses' | 'individuals' | 'mine';
type ViewMode = 'grid' | 'map';

const CategoryIcon: React.FC<{ category: string; className?: string }> = ({ category, className = 'w-4 h-4' }) => {
  const icons: Record<string, React.ReactNode> = {
    construction: (
      <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17 17.25 21A2.652 2.652 0 0 0 21 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 1 1-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 0 0 4.486-6.336l-3.276 3.277a3.004 3.004 0 0 1-2.25-2.25l3.276-3.276a4.5 4.5 0 0 0-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085" />
      </svg>
    ),
    renovation: (
      <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17 17.25 21A2.652 2.652 0 0 0 21 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 1 1-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 0 0 4.486-6.336l-3.276 3.277a3.004 3.004 0 0 1-2.25-2.25l3.276-3.276a4.5 4.5 0 0 0-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085" />
      </svg>
    ),
    cleaning: (
      <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
      </svg>
    ),
    moving: (
      <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 0 0-3.213-9.193 2.056 2.056 0 0 0-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 0 0-10.026 0 1.106 1.106 0 0 0-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
      </svg>
    ),
    interior_design: (
      <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.098 19.902a3.75 3.75 0 0 0 5.304 0l6.401-6.402M6.75 21A3.75 3.75 0 0 1 3 17.25V4.125C3 3.504 3.504 3 4.125 3h5.25c.621 0 1.125.504 1.125 1.125v4.072M6.75 21a3.75 3.75 0 0 0 3.75-3.75V8.197M6.75 21h13.125c.621 0 1.125-.504 1.125-1.125v-5.25c0-.621-.504-1.125-1.125-1.125h-4.072M10.5 8.197l2.88-2.88c.438-.439 1.15-.439 1.59 0l3.712 3.713c.44.44.44 1.152 0 1.59l-2.879 2.88M6.75 17.25h.008v.008H6.75v-.008Z" />
      </svg>
    ),
    architecture: (
      <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3H21" />
      </svg>
    ),
    plumbing: (
      <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17 17.25 21A2.652 2.652 0 0 0 21 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 1 1-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 0 0 4.486-6.336l-3.276 3.277a3.004 3.004 0 0 1-2.25-2.25l3.276-3.276a4.5 4.5 0 0 0-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085" />
      </svg>
    ),
    electrical: (
      <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" />
      </svg>
    ),
    landscaping: (
      <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" />
      </svg>
    ),
    security: (
      <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
      </svg>
    ),
    real_estate_law: (
      <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v17.25m0 0c-1.472 0-2.882.265-4.185.75M12 20.25c1.472 0 2.882.265 4.185.75M18.75 4.97A48.416 48.416 0 0 0 12 4.5c-2.291 0-4.545.16-6.75.47m13.5 0c1.01.143 2.01.317 3 .52m-3-.52 2.62 10.726c.122.499-.106 1.028-.589 1.202a5.988 5.988 0 0 1-2.031.352 5.988 5.988 0 0 1-2.031-.352c-.483-.174-.711-.703-.59-1.202L18.75 4.971Zm-16.5.52c.99-.203 1.99-.377 3-.52m0 0 2.62 10.726c.122.499-.106 1.028-.589 1.202a5.989 5.989 0 0 1-2.031.352 5.989 5.989 0 0 1-2.031-.352c-.483-.174-.711-.703-.59-1.202L5.25 4.971Z" />
      </svg>
    ),
    insurance: (
      <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
      </svg>
    ),
    home_inspection: (
      <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
      </svg>
    ),
    pest_control: (
      <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0-10.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.75c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.75h-.152c-3.196 0-6.1-1.249-8.25-3.286Zm0 13.036h.008v.008H12v-.008Z" />
      </svg>
    ),
    painting: (
      <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.098 19.902a3.75 3.75 0 0 0 5.304 0l6.401-6.402M6.75 21A3.75 3.75 0 0 1 3 17.25V4.125C3 3.504 3.504 3 4.125 3h5.25c.621 0 1.125.504 1.125 1.125v4.072M6.75 21a3.75 3.75 0 0 0 3.75-3.75V8.197M6.75 21h13.125c.621 0 1.125-.504 1.125-1.125v-5.25c0-.621-.504-1.125-1.125-1.125h-4.072M10.5 8.197l2.88-2.88c.438-.439 1.15-.439 1.59 0l3.712 3.713c.44.44.44 1.152 0 1.59l-2.879 2.88M6.75 17.25h.008v.008H6.75v-.008Z" />
      </svg>
    ),
    roofing: (
      <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
      </svg>
    ),
    hvac: (
      <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0 1 12 21 8.25 8.25 0 0 1 6.038 7.047 8.287 8.287 0 0 0 9 9.601a8.983 8.983 0 0 1 3.361-6.867 8.21 8.21 0 0 0 3 2.48Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18a3.75 3.75 0 0 0 .495-7.468 5.99 5.99 0 0 0-1.925 3.547 5.975 5.975 0 0 1-2.133-1.001A3.75 3.75 0 0 0 12 18Z" />
      </svg>
    ),
    furniture: (
      <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
      </svg>
    ),
    appliances: (
      <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 14.25h13.5m-13.5 0a3 3 0 0 1-3-3m3 3a3 3 0 1 0 0 6h13.5a3 3 0 1 0 0-6m-16.5-3a3 3 0 0 1 3-3h13.5a3 3 0 0 1 3 3m-19.5 0a4.5 4.5 0 0 1 .9-2.7L5.737 5.1a3.375 3.375 0 0 1 2.7-1.35h7.126c1.062 0 2.062.5 2.7 1.35l2.587 3.45a4.5 4.5 0 0 1 .9 2.7m0 0a3 3 0 0 1-3 3m0 3h.008v.008h-.008v-.008Zm0-6h.008v.008h-.008v-.008Zm-3 6h.008v.008h-.008v-.008Zm0-6h.008v.008h-.008v-.008Z" />
      </svg>
    ),
    other: (
      <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" />
      </svg>
    ),
  };
  return <>{icons[category] || icons.other}</>;
};

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

  const { listings: allListings, total, totalPages, isLoading } = useBusinessListings(filters);
  const { listings: myListings, isLoading: myListingsLoading } = useMyBusinessListings(!!state.currentUser);

  const listings = activeTab === 'mine' ? myListings : allListings;
  const effectiveLoading = activeTab === 'mine' ? myListingsLoading : isLoading;

  const navigateToListing = useCallback((listing: BusinessListing) => {
    const identifier = listing.id;
    const urlSlug = generateBusinessSlug(listing);
    setSelectedListingId(identifier);
    setSubView('detail');
    dispatch({ type: 'SET_SELECTED_BUSINESS_LISTING', payload: identifier });
    window.history.pushState({}, '', buildLocalizedPath(`/business-directory/${urlSlug}`));
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
    if (tab === 'mine' && !state.currentUser) {
      dispatch({ type: 'TOGGLE_AUTH_MODAL', payload: { isOpen: true, view: 'login' } });
      return;
    }
    setActiveTab(tab);
    setPage(1);
    dispatch({ type: 'SET_BUSINESS_DIRECTORY_TAB', payload: tab });
    const tabPath = tab === 'all' ? '/business-directory' : `/business-directory/${tab}`;
    window.history.pushState({}, '', buildLocalizedPath(tabPath));
  }, [dispatch, state.currentUser]);

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
    ...(state.currentUser
      ? [{ key: 'mine' as TabType, label: t('tabs.mine', 'My Businesses'), icon: <UserGroupIcon className="w-4 h-4" /> }]
      : []),
  ];

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* === PREMIUM HERO SECTION === */}
      <div className="relative overflow-hidden">
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
        <div className="relative z-10 px-4 sm:px-6 lg:px-8 py-10 sm:py-14 lg:py-20">
          <div className="max-w-7xl mx-auto">
            {/* Heading */}
            <motion.div
              className="text-center mb-8 sm:mb-10"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, type: 'spring', stiffness: 300, damping: 28 }}
            >
              <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-black text-white mb-3 sm:mb-5 leading-[1.15] tracking-tight px-2 sm:px-0">
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
              <div className="relative bg-white/10 backdrop-blur-xl rounded-2xl sm:rounded-3xl p-3 sm:p-5 md:p-6 border border-white/20 shadow-2xl shadow-black/20">
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
                            <CategoryIcon category={cat} className="w-3.5 h-3.5 inline-block" /> {t(`categories.${cat}`)}
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
      {!effectiveLoading && total > 0 && activeTab !== 'mine' && (
        <motion.div
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-4 sm:-mt-6 mb-6 relative z-10"
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

      {/* Ad — horizontal leaderboard between the hero/stats and the listings */}
      <AdSlot page="business-directory" placement="in-content" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4" />

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
          <div className="overflow-x-auto scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
            <div className="flex items-center gap-1 p-1 bg-white rounded-xl border border-neutral-200/80 shadow-sm min-w-max">
              {tabs.map((tab) => (
                <motion.button
                  key={tab.key}
                  type="button"
                  onClick={() => handleTabChange(tab.key)}
                  className={`relative flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors duration-200 whitespace-nowrap ${
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
          </div>

          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0 sm:overflow-visible">
            {/* Map / Grid toggle */}
            <motion.button
              type="button"
              onClick={() => setViewMode(v => v === 'grid' ? 'map' : 'grid')}
              className={`flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl font-semibold transition-all text-xs sm:text-sm flex-shrink-0 ${
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
                className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-amber-500/25 transition-shadow flex-shrink-0 text-xs sm:text-sm disabled:opacity-70"
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
              className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2 sm:py-2.5 bg-gradient-to-r from-primary to-blue-600 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-primary/25 transition-shadow flex-shrink-0 text-xs sm:text-sm"
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
              className="mb-6 sm:mb-8 p-4 sm:p-6 bg-gradient-to-r from-slate-900 via-blue-900/95 to-indigo-900 rounded-xl sm:rounded-2xl border border-white/10 shadow-xl overflow-visible relative"
              initial={{ opacity: 0, y: 20, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: -10, height: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 25 }}
            >
              {/* Decorative accent */}
              <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-violet-500/20 rounded-full blur-3xl" />
              </div>

              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-1">
                  <UserGroupIcon className="w-5 h-5 text-violet-400" />
                  <h3 className="text-white font-bold text-base sm:text-lg">{t('individuals.title')}</h3>
                </div>
                <p className="text-white/50 text-xs sm:text-sm mb-4 sm:mb-5 leading-relaxed">{t('individuals.subtitle')}</p>
                <div className="flex justify-center overflow-visible">
                  <AnimatedTooltip items={tooltipItems} onItemClick={handleTooltipClick} onQuoteRequest={handleQuoteRequest} />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Category filters */}
        <motion.div
          className="flex gap-1.5 sm:gap-2 overflow-x-auto pb-2 scrollbar-hide mb-4 -mx-4 px-4 sm:mx-0 sm:px-0"
          variants={fadeUpVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          <motion.button
            type="button"
            onClick={() => handleCategoryClick('')}
            className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium transition-all duration-300 flex-shrink-0 ${
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
              className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium transition-all duration-300 flex-shrink-0 whitespace-nowrap ${
                selectedCategory === category
                  ? 'bg-primary text-white shadow-lg shadow-primary/25'
                  : 'bg-white text-neutral-600 border border-neutral-200 hover:border-primary/30 hover:shadow-md'
              }`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <CategoryIcon category={category} className="w-3.5 h-3.5 inline-block mr-0.5" />
              {t(`categories.${category}`)}
            </motion.button>
          ))}
        </motion.div>

        {/* Results info */}
        <AnimatePresence mode="wait">
          {!effectiveLoading && (
            <motion.p
              key={`results-${total}`}
              className="text-xs sm:text-sm text-neutral-500 mb-4"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.3 }}
            >
              {activeTab === 'mine'
                ? t('results.showing', { count: myListings.length })
                : t('results.showing', { count: total })}
            </motion.p>
          )}
        </AnimatePresence>

        {/* Loading state - shimmer skeletons */}
        <AnimatePresence>
          {effectiveLoading && (
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
          {!effectiveLoading && listings.length > 0 && viewMode === 'grid' && (
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
          {!effectiveLoading && listings.length > 0 && viewMode === 'map' && (
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
          {!effectiveLoading && listings.length === 0 && (
            <motion.div
              className="text-center py-16 relative"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            >
              <div className="relative">
                <div
                  className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-primary/10 to-violet-500/10 rounded-3xl flex items-center justify-center"
                >
                  <BuildingStorefrontIcon className="w-10 h-10 text-primary/50" />
                </div>
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
              className="px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-white/80 backdrop-blur-sm border border-neutral-200 text-xs sm:text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-primary hover:text-white hover:border-primary transition-all duration-300"
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
              className="px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-white/80 backdrop-blur-sm border border-neutral-200 text-xs sm:text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-primary hover:text-white hover:border-primary transition-all duration-300"
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
