import React, { useState, useCallback, useEffect, useMemo, useRef, lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { User } from 'lucide-react';
import { useBusinessListing, useUpdateBusinessListing, useUploadBusinessBanner, useUploadBusinessLogo } from '../hooks';
import { useAppContext } from '@/context/AppContext';
import NotificationCenter from '@/shared/components/NotificationCenter';
import DefaultAvatar from '@/components/shared/DefaultAvatar';
import { convertToUploadableImage } from '@/shared/utils/imageConversion';

const MapLocationPicker = lazy(() => import('@/src/features/seller/components/MapLocationPicker'));
const EditBusinessListingForm = lazy(() => import('./EditBusinessListingForm'));
import {
  PhoneIcon,
  MapPinIcon,
  EnvelopeIcon,
  GlobeAltIcon,
  ClockIcon,
  CheckBadgeIcon,
  BuildingStorefrontIcon,
  UserIcon,
  ShareIcon,
  EyeIcon,
  ArrowLeftIcon,
  PencilIcon,
} from '@/constants';
import Footer from '@/components/shared/Footer';
import UserAvatar from '@/components/shared/UserAvatar';

interface BusinessDetailPageProps {
  listingId: string;
  onBack: () => void;
}

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;

const CATEGORY_GRADIENTS: Record<string, string> = {
  construction: 'from-amber-500 to-orange-600',
  renovation: 'from-blue-500 to-cyan-600',
  cleaning: 'from-emerald-400 to-teal-600',
  moving: 'from-purple-500 to-indigo-600',
  interior_design: 'from-pink-500 to-rose-600',
  architecture: 'from-slate-500 to-zinc-700',
  plumbing: 'from-sky-500 to-blue-600',
  electrical: 'from-yellow-500 to-amber-600',
  landscaping: 'from-green-500 to-emerald-700',
  security: 'from-red-500 to-rose-700',
  real_estate_law: 'from-indigo-500 to-violet-700',
  insurance: 'from-cyan-500 to-blue-700',
  home_inspection: 'from-orange-400 to-red-600',
  pest_control: 'from-lime-500 to-green-700',
  painting: 'from-fuchsia-500 to-purple-700',
  roofing: 'from-stone-500 to-neutral-700',
  hvac: 'from-blue-400 to-indigo-600',
  furniture: 'from-amber-400 to-yellow-600',
  appliances: 'from-gray-500 to-slate-700',
  other: 'from-primary to-blue-600',
};

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

// Social media brand config
const SOCIAL_BRANDS: Record<string, { label: string; color: string; hoverColor: string; icon: string }> = {
  facebook: { label: 'Facebook', color: 'text-blue-600', hoverColor: 'hover:bg-blue-50', icon: 'f' },
  instagram: { label: 'Instagram', color: 'text-pink-600', hoverColor: 'hover:bg-pink-50', icon: 'ig' },
  linkedin: { label: 'LinkedIn', color: 'text-blue-700', hoverColor: 'hover:bg-blue-50', icon: 'in' },
  tiktok: { label: 'TikTok', color: 'text-neutral-900', hoverColor: 'hover:bg-neutral-50', icon: 'tt' },
};

const fadeUpVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] } },
};

const staggerContainerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const BusinessDetailPage: React.FC<BusinessDetailPageProps> = ({ listingId, onBack }) => {
  const { t } = useTranslation(['businessDirectory', 'nav']);
  const { listing, isLoading, error } = useBusinessListing(listingId);
  const { state, dispatch } = useAppContext();
  const [showShareToast, setShowShareToast] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const currentUser = state.currentUser;
  const isAuthenticated = state.isAuthenticated;
  const isOwner = !!(currentUser?.id && listing?.owner?.id && currentUser.id === listing.owner.id);

  // Scroll to top when detail page mounts or listing changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    const mainContent = document.getElementById('main-content');
    if (mainContent) {
      mainContent.scrollTop = 0;
    }
  }, [listingId]);

  const handleShare = useCallback(() => {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({ title: listing?.name, url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url);
      setShowShareToast(true);
      setTimeout(() => setShowShareToast(false), 2500);
    }
  }, [listing?.name]);

  // Global nav handlers (matching AgentProfileHeader pattern)
  const handleAccountClick = useCallback(() => {
    if (isAuthenticated) {
      dispatch({ type: 'SET_SELECTED_PROPERTY', payload: null });
      dispatch({ type: 'SET_SELECTED_AGENCY', payload: null });
      dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'account' });
      window.history.pushState({}, '', '/account');
    } else {
      dispatch({ type: 'TOGGLE_AUTH_MODAL', payload: { isOpen: true, view: 'login' } });
    }
  }, [isAuthenticated, dispatch]);

  const handleNewListingClick = useCallback(() => {
    if (isAuthenticated) {
      dispatch({ type: 'SET_SELECTED_PROPERTY', payload: null });
      dispatch({ type: 'SET_SELECTED_AGENCY', payload: null });
      dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'create-listing' });
      window.history.pushState({}, '', '/create-listing');
    } else {
      dispatch({ type: 'TOGGLE_AUTH_MODAL', payload: { isOpen: true, view: 'signup' } });
    }
  }, [isAuthenticated, dispatch]);

  const handleSubscribeClick = useCallback(() => {
    dispatch({ type: 'SET_SELECTED_PROPERTY', payload: null });
    dispatch({ type: 'SET_SELECTED_AGENCY', payload: null });
    dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'pricing' });
    const currentLang = window.location.pathname.split('/')[1] || 'en';
    const validLangs = ['en', 'sq', 'sr', 'de', 'mk'];
    const lang = validLangs.includes(currentLang) ? currentLang : 'en';
    window.history.pushState({}, '', `/${lang}/subscribe`);
  }, [dispatch]);

  const accountButton = useMemo(() => {
    if (isAuthenticated && currentUser) {
      return (
        <button
          onClick={handleAccountClick}
          className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 text-white/80 hover:text-white bg-white/[0.06] hover:bg-white/[0.12] rounded-xl transition-all border border-white/[0.08]"
          aria-label={t('nav:myAccount')}
        >
          <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0">
            {currentUser.avatarUrl ? (
              <img src={currentUser.avatarUrl} alt="" className="w-full h-full object-cover" aria-hidden="true" />
            ) : (
              <DefaultAvatar gender={currentUser.gender} seed={currentUser.id || currentUser.name} avatarOptions={currentUser.avatarOptions} />
            )}
          </div>
          <span className="hidden lg:inline text-xs font-medium">{t('nav:myAccount')}</span>
        </button>
      );
    }
    return (
      <button
        onClick={handleAccountClick}
        className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 text-white/80 hover:text-white bg-white/[0.06] hover:bg-white/[0.12] rounded-xl transition-all border border-white/[0.08]"
        aria-label={t('nav:loginRegister')}
      >
        <User className="w-4 h-4" aria-hidden="true" />
        <span className="hidden lg:inline text-xs font-medium">{t('nav:loginRegister')}</span>
      </button>
    );
  }, [isAuthenticated, currentUser, handleAccountClick, t]);

  // Image upload (owner only) - banner + logo
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const { uploadBanner, isLoading: isBannerUploading } = useUploadBusinessBanner();
  const { uploadLogo, isLoading: isLogoUploading } = useUploadBusinessLogo();
  const { updateListing: updateListingData } = useUpdateBusinessListing();
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showCustomizeMenu, setShowCustomizeMenu] = useState(false);
  const customizeRef = useRef<HTMLDivElement>(null);

  // Banner repositioning
  const [isRepositioning, setIsRepositioning] = useState(false);
  const [bannerPosY, setBannerPosY] = useState(listing?.bannerPosition ?? 50);
  const [dragStartY, setDragStartY] = useState<number | null>(null);
  const [dragStartPos, setDragStartPos] = useState(50);
  const bannerContainerRef = useRef<HTMLDivElement>(null);

  // Sync bannerPosY when listing data loads or updates (e.g. after save + refetch)
  useEffect(() => {
    if (!isRepositioning && listing?.bannerPosition != null) {
      setBannerPosY(listing.bannerPosition);
    }
  }, [listing?.bannerPosition, isRepositioning]);

  const handleRepositionStart = useCallback(() => {
    setIsRepositioning(true);
    setShowCustomizeMenu(false);
    setBannerPosY(listing?.bannerPosition ?? 50);
  }, [listing?.bannerPosition]);

  const handleRepositionCancel = useCallback(() => {
    setIsRepositioning(false);
    setBannerPosY(listing?.bannerPosition ?? 50);
  }, [listing?.bannerPosition]);

  const handleRepositionSave = useCallback(async () => {
    if (!listing) return;
    try {
      await updateListingData({ id: listing.id, data: { bannerPosition: Math.round(bannerPosY) } });
      setIsRepositioning(false);
    } catch {
      setUploadError(t('banner.repositionError', 'Failed to save banner position'));
    }
  }, [bannerPosY, listing?.id, updateListingData, t]);

  const handleDragMove = useCallback((clientY: number) => {
    if (dragStartY === null || !bannerContainerRef.current) return;
    const rect = bannerContainerRef.current.getBoundingClientRect();
    const deltaPixels = clientY - dragStartY;
    // Moving mouse down => image should show higher part => decrease position
    const deltaPct = (deltaPixels / rect.height) * 100;
    const newPos = Math.max(0, Math.min(100, dragStartPos - deltaPct));
    setBannerPosY(newPos);
  }, [dragStartY, dragStartPos]);

  // Mouse events for banner dragging
  useEffect(() => {
    if (!isRepositioning || dragStartY === null) return;
    const handleMouseMove = (e: MouseEvent) => { e.preventDefault(); handleDragMove(e.clientY); };
    const handleMouseUp = () => setDragStartY(null);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => { window.removeEventListener('mousemove', handleMouseMove); window.removeEventListener('mouseup', handleMouseUp); };
  }, [isRepositioning, dragStartY, handleDragMove]);

  // Touch events for banner dragging
  useEffect(() => {
    if (!isRepositioning || dragStartY === null) return;
    const handleTouchMove = (e: TouchEvent) => { e.preventDefault(); handleDragMove(e.touches[0].clientY); };
    const handleTouchEnd = () => setDragStartY(null);
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd);
    return () => { window.removeEventListener('touchmove', handleTouchMove); window.removeEventListener('touchend', handleTouchEnd); };
  }, [isRepositioning, dragStartY, handleDragMove]);

  // Close customize menu on outside click
  useEffect(() => {
    if (!showCustomizeMenu) return;
    const handleClick = (e: MouseEvent) => {
      if (customizeRef.current && !customizeRef.current.contains(e.target as Node)) {
        setShowCustomizeMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showCustomizeMenu]);

  const validateImageFile = useCallback((file: File): string | null => {
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      return t('form.bannerInvalidType', 'Please upload a JPEG, PNG, or WebP image');
    }
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return t('form.bannerTooLarge', 'Image must be under 5MB');
    }
    return null;
  }, [t]);

  const handleBannerUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected || !listing) return;
    e.target.value = '';

    // Convert HEIC/HEIF (iPhone photos) to JPEG so it uploads and renders correctly.
    const file = await convertToUploadableImage(selected);

    const error = validateImageFile(file);
    if (error) { setUploadError(error); return; }

    setUploadError(null);
    setShowCustomizeMenu(false);
    try {
      await uploadBanner({ id: listing.id, file });
    } catch {
      setUploadError(t('form.bannerUploadError', 'Failed to upload banner. Please try again.'));
    }
  }, [listing, uploadBanner, validateImageFile, t]);

  const handleLogoUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected || !listing) return;
    e.target.value = '';

    // Convert HEIC/HEIF (iPhone photos) to JPEG so it uploads and renders correctly.
    const file = await convertToUploadableImage(selected);

    const error = validateImageFile(file);
    if (error) { setUploadError(error); return; }

    setUploadError(null);
    setShowCustomizeMenu(false);
    try {
      await uploadLogo({ id: listing.id, file });
    } catch {
      setUploadError(t('form.logoUploadError', 'Failed to upload logo. Please try again.'));
    }
  }, [listing, uploadLogo, validateImageFile, t]);

  // --- Loading skeleton ---
  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-50">
        {/* Sticky header skeleton */}
        <div className="sticky top-0 z-40 bg-gradient-to-r from-gray-800 to-gray-900 h-14" />

        {/* Banner skeleton */}
        <div className="w-full h-36 sm:h-44 lg:h-56 bg-neutral-200 relative overflow-hidden">
          <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/40 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-white to-transparent" />
        </div>

        {/* Hero skeleton */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-6 sm:pb-8 -mt-14 sm:-mt-18 lg:-mt-20 relative z-10">
            <div className="flex flex-col lg:flex-row items-center lg:items-start gap-6">
              <div className="w-28 h-28 sm:w-36 sm:h-36 lg:w-44 lg:h-44 rounded-2xl bg-neutral-200 relative overflow-hidden flex-shrink-0 border-4 border-white shadow-xl">
                <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/40 to-transparent" />
              </div>
              <div className="flex-1 space-y-3 w-full text-center lg:text-left pt-4 sm:pt-8">
                <div className="h-9 bg-neutral-200 rounded-lg w-72 mx-auto lg:mx-0 relative overflow-hidden">
                  <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/40 to-transparent" />
                </div>
                <div className="h-5 bg-neutral-100 rounded w-40 mx-auto lg:mx-0" />
                <div className="flex gap-3 justify-center lg:justify-start">
                  <div className="h-12 bg-neutral-100 rounded-xl w-32" />
                  <div className="h-12 bg-neutral-100 rounded-xl w-32" />
                  <div className="h-12 bg-neutral-100 rounded-xl w-32" />
                </div>
                <div className="h-4 bg-neutral-100 rounded w-full" />
                <div className="h-4 bg-neutral-100 rounded w-3/4" />
              </div>
            </div>
          </div>
        </div>

        {/* Content skeleton */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="lg:flex lg:gap-8">
            <div className="lg:w-2/3 space-y-6">
              <div className="bg-white rounded-2xl p-6 h-40 relative overflow-hidden">
                <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/40 to-transparent" />
              </div>
              <div className="bg-white rounded-2xl p-6 h-60 relative overflow-hidden">
                <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/40 to-transparent" style={{ animationDelay: '200ms' }} />
              </div>
            </div>
            <div className="lg:w-1/3 mt-6 lg:mt-0">
              <div className="bg-white rounded-2xl p-6 h-64 relative overflow-hidden">
                <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/40 to-transparent" style={{ animationDelay: '400ms' }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- Error / Not found ---
  if (error || !listing) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <motion.div
          className="text-center px-4"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        >
          <div
            className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-neutral-100 to-neutral-200 rounded-3xl flex items-center justify-center"
          >
            <BuildingStorefrontIcon className="w-10 h-10 text-neutral-400" />
          </div>
          <h2 className="text-xl font-bold text-neutral-700 mb-2">{t('detail.notFound')}</h2>
          <p className="text-neutral-500 mb-6">{t('detail.notFoundDesc')}</p>
          <motion.button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary to-blue-600 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-primary/25 transition-shadow"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            <ArrowLeftIcon className="w-4 h-4" />
            {t('detail.backToDirectory')}
          </motion.button>
        </motion.div>
      </div>
    );
  }

  // Show edit form if owner is editing
  if (isEditing && isOwner && listing) {
    return (
      <Suspense fallback={
        <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
          <div className="flex items-center gap-2 text-neutral-400">
            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        </div>
      }>
        <EditBusinessListingForm
          listing={listing}
          onBack={() => setIsEditing(false)}
          onSuccess={() => {
            setIsEditing(false);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        />
      </Suspense>
    );
  }

  const gradient = CATEGORY_GRADIENTS[listing.category] || CATEGORY_GRADIENTS.other;
  const isIndividual = listing.listingType === 'individual';
  const categoryKey = listing.category;

  // Open/closed status
  const now = new Date();
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const todayKey = dayNames[now.getDay()];
  const todayHours = listing.businessHours?.[todayKey as keyof typeof listing.businessHours];
  const isOpenToday = !!todayHours && todayHours.toLowerCase() !== 'closed';
  const hasBusinessHours = listing.businessHours && Object.values(listing.businessHours).some(Boolean);
  const hasSocialMedia = listing.socialMedia && Object.values(listing.socialMedia).some(Boolean);

  // Member since
  const createdDate = new Date(listing.createdAt);
  const memberSince = createdDate.toLocaleDateString(undefined, { year: 'numeric', month: 'long' });

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* === STICKY NAVIGATION HEADER (dark gradient, matches AgentProfileHeader) === */}
      <div className="sticky top-0 z-40">
        <div className="relative bg-gradient-to-r from-gray-800 to-gray-900">
          <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-2.5 sm:py-0 sm:h-14">
            <div className="flex items-center justify-between sm:h-full gap-2">
              {/* Back button */}
              <button
                type="button"
                onClick={onBack}
                className="flex items-center gap-1.5 sm:gap-2 text-white/90 hover:text-white font-medium transition-colors group flex-shrink-0"
              >
                <ArrowLeftIcon className="w-4 h-4 sm:w-5 sm:h-5 group-hover:-translate-x-1 transition-transform" />
                <span className="text-sm sm:text-base">{t('detail.backToDirectory')}</span>
              </button>

              {/* Center - Business type badge (desktop) */}
              <div className="hidden sm:flex items-center gap-3">
                <div className="bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded-full">
                  <span className="text-white font-semibold text-sm flex items-center gap-1.5">
                    {isIndividual ? <UserIcon className="w-3.5 h-3.5" /> : <BuildingStorefrontIcon className="w-3.5 h-3.5" />}
                    {isIndividual ? t('types.individual') : t('types.business')}
                  </span>
                </div>
              </div>

              {/* Right actions */}
              <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                {isOwner && (
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 text-white/80 hover:text-white bg-white/[0.06] hover:bg-white/[0.12] rounded-xl transition-all border border-white/[0.08]"
                    title={t('edit.button', { defaultValue: 'Edit Listing' })}
                  >
                    <PencilIcon className="w-4 h-4" />
                    <span className="hidden md:inline text-xs font-medium">{t('edit.button', { defaultValue: 'Edit' })}</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleShare}
                  className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 text-white/80 hover:text-white bg-white/[0.06] hover:bg-white/[0.12] rounded-xl transition-all border border-white/[0.08]"
                  title={t('detail.share')}
                >
                  <ShareIcon className="w-4 h-4" />
                  <span className="hidden md:inline text-xs font-medium">{t('detail.share')}</span>
                </button>

                {/* Divider */}
                <div className="hidden sm:block w-px h-6 bg-white/20 mx-0.5" />

                {/* Global Nav Actions */}
                <button
                  onClick={handleSubscribeClick}
                  className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 bg-primary/80 hover:bg-primary text-white rounded-xl transition-all text-xs font-semibold border border-white/[0.08]"
                >
                  {t('nav:subscribe')}
                </button>
                <button
                  onClick={handleNewListingClick}
                  className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 bg-secondary/80 hover:bg-secondary text-white rounded-xl transition-all text-xs font-semibold border border-white/[0.08]"
                >
                  + {t('nav:newListing')}
                </button>
                <NotificationCenter />
                {accountButton}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* === HERO SECTION === */}
      <div className="bg-white border-b border-gray-200">
        {/* Banner area - always shown */}
        <div
          ref={bannerContainerRef}
          className={`relative w-full h-44 sm:h-52 md:h-60 lg:h-72 overflow-hidden ${isRepositioning ? 'cursor-grab active:cursor-grabbing' : ''}`}
          onMouseDown={isRepositioning ? (e) => { e.preventDefault(); setDragStartY(e.clientY); setDragStartPos(bannerPosY); } : undefined}
          onTouchStart={isRepositioning ? (e) => { setDragStartY(e.touches[0].clientY); setDragStartPos(bannerPosY); } : undefined}
        >
          {listing.bannerUrl ? (
            <>
              <div className={`absolute inset-0 bg-gradient-to-br ${gradient}`} />
              <img
                src={listing.bannerUrl}
                alt={`${listing.name} banner`}
                className={`relative w-full h-full object-cover ${isRepositioning ? 'select-none pointer-events-none' : ''}`}
                style={{ objectPosition: `center ${bannerPosY}%` }}
                draggable={false}
              />
            </>
          ) : (
            <div className={`w-full h-full bg-gradient-to-br ${gradient}`} />
          )}

          {/* Reposition mode overlay */}
          {isRepositioning && (
            <div className="absolute inset-0 ring-2 ring-inset ring-primary/60">
              <div className="absolute inset-x-0 top-0 flex items-center justify-center gap-2 py-2 bg-black/50 backdrop-blur-sm z-30">
                <svg className="w-4 h-4 text-white animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 11l5-5m0 0l5 5m-5-5v12" />
                </svg>
                <span className="text-white text-sm font-medium">{t('banner.dragToReposition', 'Drag to reposition')}</span>
                <svg className="w-4 h-4 text-white animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 13l-5 5m0 0l-5-5m5 5V6" />
                </svg>
              </div>
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2 z-30">
                <button
                  type="button"
                  onClick={handleRepositionCancel}
                  className="px-4 py-2 bg-white/90 backdrop-blur-sm text-neutral-700 text-sm font-medium rounded-lg shadow-lg hover:bg-white transition-colors"
                >
                  {t('common:cancel', 'Cancel')}
                </button>
                <button
                  type="button"
                  onClick={handleRepositionSave}
                  className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg shadow-lg hover:bg-primary/90 transition-colors"
                >
                  {t('common:save', 'Save')}
                </button>
              </div>
            </div>
          )}

          {/* Bottom fade into white */}
          {!isRepositioning && <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-white to-transparent" />}
          {/* Decorative pattern */}
          {!isRepositioning && (
          <div className="absolute inset-0 opacity-[0.07]">
            <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="banner-dots" width="24" height="24" patternUnits="userSpaceOnUse">
                  <circle cx="2" cy="2" r="1" fill="white" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#banner-dots)" />
            </svg>
          </div>
          )}

          {/* Upload progress overlay */}
          {(isBannerUploading || isLogoUploading) && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-20">
              <div className="flex items-center gap-2 bg-white/90 backdrop-blur-sm px-4 py-2.5 rounded-xl shadow-lg">
                <svg className="w-5 h-5 animate-spin text-primary" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span className="text-sm font-medium text-neutral-700">
                  {isBannerUploading ? t('form.bannerUploading', 'Uploading banner...') : t('form.logoUploading', 'Uploading logo...')}
                </span>
              </div>
            </div>
          )}

          {/* Owner: Customize button + dropdown (hidden during reposition) */}
          {isOwner && !isRepositioning && (
            <div className="absolute top-3 right-3 sm:top-4 sm:right-4 z-20" ref={customizeRef}>
              <input ref={bannerInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" onChange={handleBannerUpload} className="hidden" />
              <input ref={logoInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" onChange={handleLogoUpload} className="hidden" />

              <button
                type="button"
                onClick={() => setShowCustomizeMenu(!showCustomizeMenu)}
                className={`inline-flex items-center gap-1.5 px-3 py-2 backdrop-blur-md text-white text-sm font-medium rounded-xl border border-white/20 transition-all duration-300 ${
                  showCustomizeMenu ? 'bg-white/30' : 'bg-black/40 hover:bg-black/60'
                }`}
              >
                <PencilIcon className="w-4 h-4" />
                <span className="hidden sm:inline">{t('banner.customize', 'Customize')}</span>
              </button>

              {/* Dropdown menu */}
              <AnimatePresence>
                {showCustomizeMenu && (
                  <motion.div
                    className="absolute top-full right-0 mt-2 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-neutral-200 z-50 overflow-hidden min-w-[200px]"
                    initial={{ opacity: 0, y: -8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                  >
                    {/* Upload / Change Banner */}
                    <button
                      type="button"
                      onClick={() => bannerInputRef.current?.click()}
                      disabled={isBannerUploading}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors disabled:opacity-50"
                    >
                      <svg className="w-4 h-4 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {listing.bannerUrl ? t('form.bannerChange', 'Change Banner') : t('form.bannerUpload', 'Upload Banner')}
                    </button>

                    {/* Reposition Banner - only if banner exists */}
                    {listing.bannerUrl && (
                      <button
                        type="button"
                        onClick={handleRepositionStart}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors border-t border-neutral-100"
                      >
                        <svg className="w-4 h-4 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                        </svg>
                        {t('banner.reposition', 'Reposition Banner')}
                      </button>
                    )}

                    {/* Upload / Change Logo */}
                    <button
                      type="button"
                      onClick={() => logoInputRef.current?.click()}
                      disabled={isLogoUploading}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors border-t border-neutral-100 disabled:opacity-50"
                    >
                      <svg className="w-4 h-4 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {listing.logoUrl ? t('form.logoChange', 'Change Logo') : t('form.logoUpload', 'Upload Logo')}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Upload error toast */}
          <AnimatePresence>
            {uploadError && (
              <motion.div
                className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-red-500/90 text-white text-xs font-medium px-4 py-2 rounded-lg backdrop-blur-sm z-20"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
              >
                {uploadError}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Profile info - logo overlaps banner, text on white */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-6 sm:pb-8 -mt-14 sm:-mt-18 lg:-mt-20 relative z-10">
          <motion.div
            className="flex flex-col lg:flex-row items-center lg:items-start gap-4 sm:gap-6 lg:gap-8"
            initial="hidden"
            animate="visible"
            variants={staggerContainerVariants}
          >
            {/* Logo / Avatar - overlaps banner */}
            <motion.div className="relative flex-shrink-0" variants={fadeUpVariants}>
              <div className={`w-28 h-28 sm:w-36 sm:h-36 lg:w-44 lg:h-44 rounded-xl sm:rounded-2xl overflow-hidden shadow-xl border-4 border-white bg-gradient-to-br ${gradient}`}
                style={{ boxShadow: '0 10px 25px rgba(0,0,0,0.12)' }}
              >
                {listing.logoUrl ? (
                  <img src={listing.logoUrl} alt={listing.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-5xl sm:text-6xl lg:text-7xl font-bold text-white drop-shadow-lg">
                      {listing.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
              </div>

              {/* Verified badge overlay */}
              {listing.isVerified && (
                <motion.div
                  className="absolute -bottom-1.5 -right-1.5 sm:-bottom-2 sm:-right-2 bg-emerald-500 text-white p-1.5 sm:p-2 rounded-full shadow-lg border-2 border-white"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 15, delay: 0.5 }}
                >
                  <CheckBadgeIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                </motion.div>
              )}
            </motion.div>

            {/* Info section - always on white background */}
            <motion.div className="flex-1 text-center lg:text-left min-w-0 pt-2 sm:pt-6 lg:pt-8" variants={fadeUpVariants}>
              {/* Name + badges row */}
              <div className="flex flex-col lg:flex-row items-center lg:items-start gap-2 sm:gap-3 mb-2 sm:mb-3">
                <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-neutral-900 leading-tight">{listing.name}</h1>
                <div className="flex items-center gap-2 flex-wrap">
                  {listing.isVerified && (
                    <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-600 px-2.5 py-1 rounded-full text-xs font-semibold border border-emerald-100">
                      <CheckBadgeIcon className="w-3.5 h-3.5" />
                      {t('verified')}
                    </span>
                  )}
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${
                    isIndividual
                      ? 'bg-violet-50 text-violet-600 border-violet-100'
                      : 'bg-blue-50 text-blue-600 border-blue-100'
                  }`}>
                    {isIndividual ? <UserIcon className="w-3 h-3" /> : <BuildingStorefrontIcon className="w-3 h-3" />}
                    {isIndividual ? t('types.individual') : t('types.business')}
                  </span>
                </div>
              </div>

              {/* Category tag */}
              <div className="mb-3 sm:mb-4">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold bg-primary/10 text-primary rounded-full border border-primary/15">
                  <CategoryIcon category={categoryKey} className="w-4 h-4" />
                  {listing.category === 'other' && listing.customCategory ? listing.customCategory : t(`categories.${listing.category}`)}
                </span>
              </div>

              {/* Location */}
              <div className="flex items-center justify-center lg:justify-start gap-1.5 sm:gap-2 mb-3 sm:mb-4 text-neutral-600">
                <MapPinIcon className="w-4 sm:w-5 h-4 sm:h-5 text-neutral-400 flex-shrink-0" />
                <span className="text-xs sm:text-sm md:text-base lg:text-lg">
                  {listing.address && `${listing.address}, `}
                  {listing.city}, {listing.country}
                </span>
              </div>

              {/* Open/Closed indicator */}
              {hasBusinessHours && (
                <div className="flex items-center justify-center lg:justify-start gap-2 mb-4 sm:mb-5">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${
                    isOpenToday
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                      : 'bg-neutral-100 text-neutral-500 border border-neutral-200'
                  }`}>
                    <span
                      className={`w-2 h-2 rounded-full ${isOpenToday ? 'bg-emerald-500' : 'bg-neutral-400'}`}
                    />
                    {isOpenToday ? t('detail.openNow') : t('detail.closedNow')}
                  </span>
                  {isOpenToday && todayHours && (
                    <span className="text-sm text-neutral-500">
                      {todayHours}
                    </span>
                  )}
                </div>
              )}

              {/* Quick stats pills */}
              <div className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap sm:justify-center lg:justify-start sm:gap-3 mb-4 sm:mb-5">
                <motion.div
                  className="bg-blue-50 border border-blue-100 px-2.5 sm:px-4 py-2 sm:py-2.5 rounded-xl text-center sm:text-left"
                  whileHover={{ scale: 1.02 }}
                  transition={{ duration: 0.2 }}
                >
                  <span className="text-base sm:text-2xl font-bold text-blue-700">{listing.services.length}</span>
                  <span className="text-blue-600/80 ml-1 sm:ml-1.5 text-[10px] sm:text-sm font-medium">{t('detail.stats.services')}</span>
                </motion.div>
                <motion.div
                  className="bg-amber-50 border border-amber-100 px-2.5 sm:px-4 py-2 sm:py-2.5 rounded-xl text-center sm:text-left"
                  whileHover={{ scale: 1.02 }}
                  transition={{ duration: 0.2 }}
                >
                  <span className="text-base sm:text-2xl font-bold text-amber-700">{listing.views}</span>
                  <span className="text-amber-600/80 ml-1 sm:ml-1.5 text-[10px] sm:text-sm font-medium">{t('detail.stats.views')}</span>
                </motion.div>
                <motion.div
                  className="bg-emerald-50 border border-emerald-100 px-2.5 sm:px-4 py-2 sm:py-2.5 rounded-xl text-center sm:text-left"
                  whileHover={{ scale: 1.02 }}
                  transition={{ duration: 0.2 }}
                >
                  <span className="text-emerald-700 text-[10px] sm:text-sm font-semibold">{t('detail.stats.memberSince')}</span>
                  <span className="block sm:inline text-emerald-600/80 sm:ml-1.5 text-[10px] sm:text-sm">{memberSince}</span>
                </motion.div>
              </div>

            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* === MAIN CONTENT - 2 column layout like agent profile === */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="lg:flex lg:gap-8">
          {/* Left column - Main content */}
          <motion.div
            className="lg:w-2/3 space-y-6"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.1 }}
            variants={staggerContainerVariants}
          >
            {/* About / Description section */}
            {listing.description && (
              <motion.div
                className="bg-white rounded-2xl border border-neutral-200 shadow-sm hover:shadow-lg transition-shadow duration-300 overflow-hidden"
                variants={fadeUpVariants}
              >
                {/* Gradient accent bar */}
                <div className={`h-1 bg-gradient-to-r ${gradient}`} />
                <div className="p-4 sm:p-6 lg:p-8">
                  <div className="flex items-center gap-2.5 sm:gap-3 mb-4 sm:mb-5">
                    <div className={`w-9 sm:w-10 h-9 sm:h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-sm flex-shrink-0`}>
                      <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-base sm:text-lg font-bold text-neutral-900">{t('detail.about', { defaultValue: 'About' })}</h2>
                      <p className="text-[11px] sm:text-xs text-neutral-400">{t('detail.aboutSubtitle', { defaultValue: 'Who we are & what we do' })}</p>
                    </div>
                  </div>

                  {/* Quote-style description */}
                  <div className="relative pl-5 border-l-[3px] border-primary/20 overflow-hidden">
                    <svg className="absolute -left-2.5 -top-1 w-5 h-5 text-primary/30" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983z" />
                    </svg>
                    <p className="text-neutral-600 leading-relaxed text-sm sm:text-base whitespace-pre-line break-words" style={{ overflowWrap: 'anywhere' }}>
                      {listing.description}
                    </p>
                  </div>

                  {/* Quick info badges */}
                  <div className="flex flex-wrap items-center gap-2 mt-5 pt-5 border-t border-neutral-100">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-neutral-50 rounded-lg text-xs font-medium text-neutral-500">
                      <MapPinIcon className="w-3.5 h-3.5" />
                      {listing.city}, {listing.country}
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-neutral-50 rounded-lg text-xs font-medium text-neutral-500">
                      <CategoryIcon category={categoryKey} className="w-4 h-4" />
                      {listing.category === 'other' && listing.customCategory ? listing.customCategory : t(`categories.${listing.category}`)}
                    </span>
                    {listing.isVerified && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 rounded-lg text-xs font-medium text-emerald-600">
                        <CheckBadgeIcon className="w-3.5 h-3.5" />
                        {t('verified')}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-neutral-50 rounded-lg text-xs font-medium text-neutral-500">
                      <EyeIcon className="w-3.5 h-3.5" />
                      {listing.views} {t('detail.stats.views')}
                    </span>
                    {listing.yearEstablished && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 rounded-lg text-xs font-medium text-blue-600">
                        <ClockIcon className="w-3.5 h-3.5" />
                        {t('detail.established', { year: listing.yearEstablished, defaultValue: `Est. ${listing.yearEstablished}` })}
                      </span>
                    )}
                    {listing.priceRange && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 rounded-lg text-xs font-bold text-emerald-600 border border-emerald-100">
                        {listing.priceRange}
                      </span>
                    )}
                    {listing.licenseNumber && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 rounded-lg text-xs font-medium text-amber-700 border border-amber-100">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043 3.745 3.745 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296 3.746 3.746 0 0 1 3.296-1.043A3.746 3.746 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043 3.746 3.746 0 0 1 1.043 3.296A3.745 3.745 0 0 1 21 12Z" />
                        </svg>
                        {t('detail.licensed', 'Licensed')}
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Services section */}
            {listing.services.length > 0 && (
              <motion.div
                className="bg-white rounded-2xl border border-neutral-200 shadow-sm hover:shadow-lg transition-shadow duration-300 overflow-hidden"
                variants={fadeUpVariants}
              >
                <div className="p-5 sm:p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <BuildingStorefrontIcon className="w-4 h-4 text-primary" />
                    </div>
                    <h2 className="text-lg font-bold text-neutral-900">{t('detail.services')}</h2>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {listing.services.map((service, i) => (
                      <motion.span
                        key={service}
                        className="px-3.5 py-2 bg-gradient-to-r from-primary/5 to-blue-500/5 text-neutral-700 rounded-xl text-sm border border-primary/10 font-medium hover:border-primary/25 hover:shadow-sm transition-all"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.05, type: 'spring', stiffness: 300, damping: 20 }}
                        whileHover={{ scale: 1.05, y: -1 }}
                      >
                        {service}
                      </motion.span>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Languages section */}
            {listing.languages && listing.languages.length > 0 && (
              <motion.div
                className="bg-white rounded-2xl border border-neutral-200 shadow-sm hover:shadow-lg transition-shadow duration-300 overflow-hidden"
                variants={fadeUpVariants}
              >
                <div className="p-5 sm:p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
                      <svg className="w-4 h-4 text-violet-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m10.5 21 5.25-11.25L21 21m-9-3h7.5M3 5.621a48.474 48.474 0 0 1 6-.371m0 0c1.12 0 2.233.038 3.334.114M9 5.25V3m3.334 2.364V3m0 2.364a48.016 48.016 0 0 1 3.413.235M15 3v2.25m-6 0a48.667 48.667 0 0 0-3.413.235m0 0V3" />
                      </svg>
                    </div>
                    <h2 className="text-lg font-bold text-neutral-900">{t('detail.languages', 'Languages')}</h2>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {listing.languages.map((lang) => (
                      <span key={lang} className="px-3.5 py-2 bg-violet-50 text-violet-700 rounded-xl text-sm border border-violet-100 font-medium">
                        {lang}
                      </span>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Service Areas section */}
            {listing.serviceAreas && listing.serviceAreas.length > 0 && (
              <motion.div
                className="bg-white rounded-2xl border border-neutral-200 shadow-sm hover:shadow-lg transition-shadow duration-300 overflow-hidden"
                variants={fadeUpVariants}
              >
                <div className="p-5 sm:p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
                      <MapPinIcon className="w-4 h-4 text-orange-600" />
                    </div>
                    <h2 className="text-lg font-bold text-neutral-900">{t('detail.serviceAreas', 'Service Areas')}</h2>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {listing.serviceAreas.map((area) => (
                      <span key={area} className="px-3.5 py-2 bg-orange-50 text-orange-700 rounded-xl text-sm border border-orange-100 font-medium">
                        {area}
                      </span>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Payment Methods section */}
            {listing.paymentMethods && listing.paymentMethods.length > 0 && (
              <motion.div
                className="bg-white rounded-2xl border border-neutral-200 shadow-sm hover:shadow-lg transition-shadow duration-300 overflow-hidden"
                variants={fadeUpVariants}
              >
                <div className="p-5 sm:p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-teal-500/10 flex items-center justify-center">
                      <svg className="w-4 h-4 text-teal-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z" />
                      </svg>
                    </div>
                    <h2 className="text-lg font-bold text-neutral-900">{t('detail.paymentMethods', 'Payment Methods')}</h2>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {listing.paymentMethods.map((method) => (
                      <span key={method} className="px-3.5 py-2 bg-teal-50 text-teal-700 rounded-xl text-sm border border-teal-100 font-medium">
                        {t(`paymentMethods.${method}`, method.replace('_', ' '))}
                      </span>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Business Hours section */}
            {hasBusinessHours && (
              <motion.div
                className="bg-white rounded-2xl border border-neutral-200 shadow-sm hover:shadow-lg transition-shadow duration-300 overflow-hidden"
                variants={fadeUpVariants}
              >
                <div className="p-5 sm:p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                      <ClockIcon className="w-4 h-4 text-amber-600" />
                    </div>
                    <h2 className="text-lg font-bold text-neutral-900">{t('detail.businessHours')}</h2>
                  </div>
                  <div className="space-y-1.5">
                    {DAYS.map((day) => {
                      const hours = listing.businessHours?.[day];
                      const isToday = day === todayKey;
                      const isClosed = !hours || hours.toLowerCase() === 'closed';
                      return (
                        <motion.div
                          key={day}
                          className={`flex justify-between items-center text-xs sm:text-sm py-2 sm:py-2.5 px-3 sm:px-4 rounded-xl transition-all duration-200 ${
                            isToday
                              ? 'bg-primary/5 border border-primary/15 shadow-sm'
                              : 'hover:bg-neutral-50'
                          }`}
                          whileHover={{ x: 2 }}
                        >
                          <span className={`font-medium flex items-center gap-2 ${isToday ? 'text-primary' : 'text-neutral-700'}`}>
                            {t(`days.${day}`)}
                            {isToday && (
                              <span className="px-1.5 py-0.5 text-[10px] uppercase tracking-wider rounded bg-primary/10 text-primary font-bold">
                                {t('detail.today')}
                              </span>
                            )}
                          </span>
                          <span className={`font-medium ${
                            isClosed
                              ? 'text-neutral-400'
                              : isToday
                                ? 'text-primary'
                                : 'text-neutral-600'
                          }`}>
                            {isClosed ? t('detail.closed') : hours}
                          </span>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}

            {/* About the Owner section (if there is owner info) */}
            {listing.owner?.name && (
              <motion.div
                className="bg-white rounded-2xl border border-neutral-200 shadow-sm hover:shadow-lg transition-shadow duration-300 overflow-hidden"
                variants={fadeUpVariants}
              >
                <div className="p-5 sm:p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
                      <UserIcon className="w-4 h-4 text-violet-600" />
                    </div>
                    <h2 className="text-lg font-bold text-neutral-900">{t('detail.owner')}</h2>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full overflow-hidden flex-shrink-0 border-2 border-neutral-100 shadow-md bg-gradient-to-br from-violet-100 to-purple-100">
                      <UserAvatar
                        src={listing.owner.avatarUrl}
                        alt={listing.owner.name}
                        seed={listing.owner.id || listing.owner.name}
                        width={112}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <h3 className="font-semibold text-neutral-900">{listing.owner.name}</h3>
                      <p className="text-sm text-neutral-500">{isIndividual ? t('detail.ownerIndividual') : t('detail.ownerBusiness')}</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </motion.div>

          {/* Right column - Contact sidebar */}
          <motion.div
            className="lg:w-1/3 space-y-6 mt-6 lg:mt-0"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.1 }}
            variants={staggerContainerVariants}
          >
            {/* Contact Info Card */}
            <motion.div
              className="bg-white rounded-2xl border border-neutral-200 shadow-sm hover:shadow-lg transition-shadow duration-300 overflow-hidden"
              variants={fadeUpVariants}
            >
              <div className={`p-4 bg-gradient-to-r ${gradient} relative overflow-hidden`}>
                <div className="absolute inset-0 bg-black/10" />
                <div className="relative z-10">
                  <h2 className="text-lg font-bold text-white mb-1">{t('detail.contactInfo')}</h2>
                  <p className="text-white/70 text-sm">{t('detail.getInTouch')}</p>
                </div>
              </div>
              <div className="p-5 space-y-4">
                {/* Phone - primary CTA */}
                <motion.a
                  href={`tel:${listing.contactPhone}`}
                  className="flex items-center gap-3 p-3 bg-primary/5 hover:bg-primary/10 rounded-xl border border-primary/10 transition-all group"
                  whileHover={{ scale: 1.01, x: 2 }}
                  whileTap={{ scale: 0.99 }}
                >
                  <div className="w-11 h-11 rounded-xl bg-primary/15 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/25 transition-colors">
                    <PhoneIcon className="w-5 h-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs text-neutral-500 font-medium">{t('detail.phone')}</div>
                    <div className="font-semibold text-primary truncate">{listing.contactPhone}</div>
                  </div>
                </motion.a>

                {/* Email */}
                {listing.contactEmail && (
                  <motion.a
                    href={`mailto:${listing.contactEmail}`}
                    className="flex items-center gap-3 p-3 hover:bg-neutral-50 rounded-xl transition-all group"
                    whileHover={{ scale: 1.01, x: 2 }}
                    whileTap={{ scale: 0.99 }}
                  >
                    <div className="w-11 h-11 rounded-xl bg-blue-500/10 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-500/20 transition-colors">
                      <EnvelopeIcon className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs text-neutral-500 font-medium">{t('detail.email')}</div>
                      <div className="font-medium text-neutral-700 truncate">{listing.contactEmail}</div>
                    </div>
                  </motion.a>
                )}

                {/* Website */}
                {listing.website && (
                  <motion.a
                    href={listing.website.startsWith('http') ? listing.website : `https://${listing.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 hover:bg-neutral-50 rounded-xl transition-all group"
                    whileHover={{ scale: 1.01, x: 2 }}
                    whileTap={{ scale: 0.99 }}
                  >
                    <div className="w-11 h-11 rounded-xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0 group-hover:bg-emerald-500/20 transition-colors">
                      <GlobeAltIcon className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs text-neutral-500 font-medium">{t('detail.website')}</div>
                      <div className="font-medium text-neutral-700 truncate">{listing.website}</div>
                    </div>
                  </motion.a>
                )}

                {/* WhatsApp */}
                {listing.whatsapp && (
                  <motion.a
                    href={`https://wa.me/${listing.whatsapp.replace(/[^0-9+]/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 hover:bg-green-50 rounded-xl transition-all group"
                    whileHover={{ scale: 1.01, x: 2 }}
                    whileTap={{ scale: 0.99 }}
                  >
                    <div className="w-11 h-11 rounded-xl bg-green-500/10 flex items-center justify-center flex-shrink-0 group-hover:bg-green-500/20 transition-colors">
                      <svg className="w-5 h-5 text-green-600" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs text-neutral-500 font-medium">WhatsApp</div>
                      <div className="font-medium text-green-700 truncate">{listing.whatsapp}</div>
                    </div>
                  </motion.a>
                )}

                {/* Viber */}
                {listing.viber && (
                  <motion.a
                    href={`viber://chat?number=${listing.viber.replace(/[^0-9+]/g, '')}`}
                    className="flex items-center gap-3 p-3 hover:bg-purple-50 rounded-xl transition-all group"
                    whileHover={{ scale: 1.01, x: 2 }}
                    whileTap={{ scale: 0.99 }}
                  >
                    <div className="w-11 h-11 rounded-xl bg-purple-500/10 flex items-center justify-center flex-shrink-0 group-hover:bg-purple-500/20 transition-colors">
                      <svg className="w-5 h-5 text-purple-600" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M11.398.002C9.473.028 5.331.344 3.014 2.467 1.294 4.177.518 6.77.399 9.932c-.12 3.163-.27 9.093 5.567 10.714l.004.002.002.004s-.037 1.654-.04 2.243c-.003.59.258 1.34.979.737 0 0 .862-.809 1.769-1.754.498-.519.934-.99 1.255-1.35 3.467.294 6.13-.375 6.434-.482.703-.247 4.674-.737 5.32-6.016.667-5.442-.314-8.881-2.07-10.436C17.727.908 14.082-.04 11.398.002zm.297 1.904c2.289-.042 5.54.717 7.164 2.098 1.49 1.32 2.275 4.278 1.725 8.766-.534 4.372-3.753 4.677-4.35 4.886-.253.088-2.547.66-5.456.509 0 0-2.16 2.606-2.834 3.292-.105.107-.24.151-.326.131-.121-.028-.154-.158-.152-.348.003-.255.02-3.146.02-3.146C2.36 16.752 2.487 11.59 2.586 8.924c.1-2.667.736-4.855 2.158-6.244 1.793-1.607 5.235-2.05 6.95-2.086v.312zm-.26 2.706c-.087.002-.174.018-.254.054-.313.14-.455.506-.319.816.136.31.51.453.826.32.1-.043.19-.108.26-.19.137-.163.189-.39.137-.6a.642.642 0 00-.65-.4zm3.053.952c-.16.008-.317.07-.433.196-.263.284-.244.726.04.986.744.683 1.319 1.51 1.689 2.43.173.428.297.874.369 1.33.032.204.05.41.055.617.01.373.31.672.686.666.374-.007.672-.306.666-.679a6.693 6.693 0 00-.077-.855 7.862 7.862 0 00-.505-1.82 7.991 7.991 0 00-2.05-2.68.684.684 0 00-.44-.19zm-4.46.397c-.357-.065-.725.005-1.058.195-.31.19-.58.477-.764.826-.265.501-.173.985.102 1.437l.027.046c.259.406.606.793.95 1.117l.013.012.014.012c.335.337.734.701 1.15.97l.05.03c.332.199.707.356 1.161.208a1.66 1.66 0 00.824-.684c.285-.443.232-.988-.204-1.389l-.01-.009a12.505 12.505 0 00-.695-.503c-.207-.139-.455-.121-.654.03-.139.104-.23.24-.371.368l-.006.005-.023.014c-.022.012-.047.015-.074-.002a5.602 5.602 0 01-1.26-1.028 4.93 4.93 0 01-.795-1.22c-.013-.027-.008-.046.005-.066.007-.013.012-.024.027-.04.143-.153.3-.268.414-.42.168-.222.19-.481.045-.723a22.7 22.7 0 00-.42-.743c-.104-.165-.27-.273-.446-.305zm5.962.752a.676.676 0 00-.473.213c-.257.27-.243.699.028.953.5.47.869 1.056 1.078 1.712.098.305.156.622.17.942.012.373.318.665.694.653.375-.012.668-.316.656-.688a4.85 4.85 0 00-.247-1.36c-.3-.95-.831-1.794-1.546-2.462a.687.687 0 00-.36-.163zm-1.434.963a.676.676 0 00-.468.198.672.672 0 00-.006.955c.278.282.442.625.488 1.015a.68.68 0 00.752.595.681.681 0 00.6-.75 2.906 2.906 0 00-.905-1.82.677.677 0 00-.461-.193z"/>
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs text-neutral-500 font-medium">Viber</div>
                      <div className="font-medium text-purple-700 truncate">{listing.viber}</div>
                    </div>
                  </motion.a>
                )}

                {/* Location with Directions */}
                <div className="rounded-xl overflow-hidden">
                  <div className="flex items-center gap-3 p-3 bg-neutral-50/50">
                    <div className="w-11 h-11 rounded-xl bg-orange-500/10 flex items-center justify-center flex-shrink-0">
                      <MapPinIcon className="w-5 h-5 text-orange-600" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs text-neutral-500 font-medium">{t('detail.location')}</div>
                      <div className="font-medium text-neutral-700">
                        {listing.address && `${listing.address}, `}
                        {listing.city}, {listing.country}
                      </div>
                    </div>
                  </div>
                  <motion.a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${
                      listing.latitude && listing.longitude
                        ? `${listing.latitude},${listing.longitude}`
                        : encodeURIComponent(`${listing.address || ''} ${listing.city}, ${listing.country}`)
                    }`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 py-2.5 bg-emerald-50 hover:bg-emerald-100 border-t border-emerald-100 text-emerald-700 transition-colors text-sm font-semibold"
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498 4.875-2.437c.381-.19.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 0 0-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0Z" />
                    </svg>
                    {t('detail.getDirections', 'Get Directions')}
                  </motion.a>
                </div>

                {/* Call to action button */}
                <motion.a
                  href={`tel:${listing.contactPhone}`}
                  className="flex items-center justify-center gap-2 w-full py-3.5 px-4 bg-gradient-to-r from-primary to-blue-600 hover:from-primary hover:to-blue-700 text-white font-bold rounded-xl transition-all shadow-md hover:shadow-lg hover:shadow-primary/25 text-sm"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <PhoneIcon className="w-4 h-4" />
                  {t('detail.callNow')}
                </motion.a>
              </div>
            </motion.div>

            {/* Social Media Card */}
            {hasSocialMedia && (
              <motion.div
                className="bg-white rounded-2xl border border-neutral-200 shadow-sm hover:shadow-lg transition-shadow duration-300 overflow-hidden"
                variants={fadeUpVariants}
              >
                <div className="p-5 sm:p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-pink-500/10 flex items-center justify-center">
                      <ShareIcon className="w-4 h-4 text-pink-600" />
                    </div>
                    <h2 className="text-lg font-bold text-neutral-900">{t('detail.socialMedia')}</h2>
                  </div>
                  <div className="space-y-2">
                    {Object.entries(listing.socialMedia!).map(([platform, url]) => {
                      if (!url) return null;
                      const brand = SOCIAL_BRANDS[platform];
                      if (!brand) return null;
                      return (
                        <motion.a
                          key={platform}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`flex items-center gap-3 p-3 rounded-xl ${brand.hoverColor} transition-all group border border-transparent hover:border-neutral-100`}
                          whileHover={{ scale: 1.01, x: 2 }}
                          whileTap={{ scale: 0.99 }}
                        >
                          <div className={`w-9 h-9 rounded-lg bg-neutral-100 group-hover:bg-white flex items-center justify-center font-bold text-xs ${brand.color} transition-colors border border-neutral-200`}>
                            {brand.icon}
                          </div>
                          <span className={`font-medium text-sm ${brand.color} group-hover:underline`}>
                            {brand.label}
                          </span>
                        </motion.a>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Map Section - when lat/lng available */}
            {listing.latitude && listing.longitude && (
              <motion.div
                className="bg-white rounded-2xl border border-neutral-200 shadow-sm hover:shadow-lg transition-shadow duration-300 overflow-hidden"
                variants={fadeUpVariants}
              >
                <div className="p-5 sm:p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                      <MapPinIcon className="w-4 h-4 text-emerald-600" />
                    </div>
                    <h2 className="text-lg font-bold text-neutral-900">{t('detail.location')}</h2>
                  </div>
                  <div className="rounded-xl overflow-hidden border border-neutral-200 h-[250px]">
                    <Suspense fallback={
                      <div className="h-full bg-neutral-100 flex items-center justify-center">
                        <div className="flex items-center gap-2 text-neutral-400">
                          <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                        </div>
                      </div>
                    }>
                      <MapLocationPicker
                        lat={listing.latitude}
                        lng={listing.longitude}
                        address={listing.address || ''}
                        zoom={15}
                        country={listing.country}
                        city={listing.city}
                        onLocationChange={() => {}}
                        onAddressChange={() => {}}
                      />
                    </Suspense>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Views counter */}
            <motion.div
              className="text-center py-3 flex items-center justify-center gap-2 text-neutral-400"
              variants={fadeUpVariants}
            >
              <EyeIcon className="w-4 h-4" />
              <span className="text-sm">{t('detail.views', { count: listing.views })}</span>
            </motion.div>
          </motion.div>
        </div>
      </main>

      {/* === BOTTOM CTA BANNER === */}
      <motion.div
        className={`bg-gradient-to-r ${gradient} text-white py-10 sm:py-14 relative overflow-hidden`}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
        variants={fadeUpVariants}
      >
        {/* Pattern */}
        <div className="absolute inset-0 opacity-10">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="cta-dots" width="20" height="20" patternUnits="userSpaceOnUse">
                <circle cx="2" cy="2" r="1" fill="white" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#cta-dots)" />
          </svg>
        </div>
        <div className="absolute inset-0 bg-black/20" />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.h2
            className="text-xl sm:text-2xl md:text-3xl font-bold mb-2 sm:mb-3 leading-tight px-2 sm:px-0"
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
          >
            {t('detail.cta.title', { name: listing.name })}
          </motion.h2>
          <motion.p
            className="text-white/80 text-sm sm:text-base md:text-lg mb-5 sm:mb-6 max-w-2xl mx-auto leading-relaxed px-4 sm:px-0"
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
          >
            {t('detail.cta.subtitle')}
          </motion.p>
          <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3 justify-center px-4 sm:px-0">
            <motion.a
              href={`tel:${listing.contactPhone}`}
              className="inline-flex items-center justify-center gap-2 bg-white text-neutral-900 hover:bg-neutral-100 font-bold py-2.5 sm:py-3 px-6 sm:px-8 rounded-xl transition-colors shadow-lg text-sm"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              <PhoneIcon className="w-4 h-4" />
              {t('detail.cta.callNow', { phone: listing.contactPhone })}
            </motion.a>
            {listing.contactEmail && (
              <motion.a
                href={`mailto:${listing.contactEmail}`}
                className="inline-flex items-center justify-center gap-2 bg-white/15 hover:bg-white/25 text-white border border-white/20 font-bold py-2.5 sm:py-3 px-6 sm:px-8 rounded-xl transition-colors text-sm"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                <EnvelopeIcon className="w-4 h-4" />
                {t('detail.cta.sendEmail')}
              </motion.a>
            )}
          </div>
        </div>
      </motion.div>

      {/* Share Toast */}
      <AnimatePresence>
        {showShareToast && (
          <motion.div
            className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-neutral-900 text-white px-6 py-3 rounded-xl shadow-xl z-50 flex items-center gap-3"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          >
            <CheckBadgeIcon className="w-5 h-5 text-emerald-400" />
            <span className="text-sm font-medium">{t('detail.linkCopied')}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <Footer />
    </div>
  );
};

export default BusinessDetailPage;
