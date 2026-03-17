import React, { useState, useCallback, useEffect, lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { useBusinessListing } from '../hooks';

const MapLocationPicker = lazy(() => import('@/src/features/seller/components/MapLocationPicker'));
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
} from '@/constants';
import Footer from '@/components/shared/Footer';

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

// Social media brand config
const SOCIAL_BRANDS: Record<string, { label: string; color: string; hoverColor: string; icon: string }> = {
  facebook: { label: 'Facebook', color: 'text-blue-600', hoverColor: 'hover:bg-blue-50', icon: 'f' },
  instagram: { label: 'Instagram', color: 'text-pink-600', hoverColor: 'hover:bg-pink-50', icon: 'ig' },
  linkedin: { label: 'LinkedIn', color: 'text-blue-700', hoverColor: 'hover:bg-blue-50', icon: 'in' },
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
  const { t } = useTranslation('businessDirectory');
  const { listing, isLoading, error } = useBusinessListing(listingId);
  const [showShareToast, setShowShareToast] = useState(false);

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

  // --- Loading skeleton ---
  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-50">
        {/* Sticky header skeleton */}
        <div className="sticky top-0 z-40 bg-gradient-to-r from-gray-800 to-gray-900 h-14" />

        {/* Hero skeleton */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex flex-col lg:flex-row items-center lg:items-start gap-6">
              <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-2xl bg-neutral-200 relative overflow-hidden flex-shrink-0">
                <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/40 to-transparent" />
              </div>
              <div className="flex-1 space-y-3 w-full text-center lg:text-left">
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
          <motion.div
            className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-neutral-100 to-neutral-200 rounded-3xl flex items-center justify-center"
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ duration: 4, repeat: Infinity }}
          >
            <BuildingStorefrontIcon className="w-10 h-10 text-neutral-400" />
          </motion.div>
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

  const gradient = CATEGORY_GRADIENTS[listing.category] || CATEGORY_GRADIENTS.other;
  const isIndividual = listing.listingType === 'individual';
  const categoryIcon = CATEGORY_ICONS[listing.category] || CATEGORY_ICONS.other;

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
      {/* === STICKY NAVIGATION HEADER === */}
      <motion.div
        className="sticky top-0 z-40"
        initial={{ y: -60 }}
        animate={{ y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      >
        <div className={`relative bg-gradient-to-r ${gradient}`}>
          {/* Subtle glass overlay */}
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" />
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

          <div className="relative max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
            {/* Back button */}
            <motion.button
              type="button"
              onClick={onBack}
              className="flex items-center gap-1.5 text-white/90 hover:text-white font-medium transition-all group bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-xl border border-white/15"
              whileHover={{ x: -2 }}
              whileTap={{ scale: 0.95 }}
            >
              <ArrowLeftIcon className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
              <span className="hidden sm:inline text-sm">{t('detail.backToDirectory')}</span>
            </motion.button>

            {/* Center - Business name (hidden on mobile) */}
            <div className="hidden sm:flex items-center gap-2">
              <div className="bg-white/15 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10">
                <span className="text-white font-semibold text-sm truncate max-w-[200px]">{listing.name}</span>
              </div>
            </div>

            {/* Right actions */}
            <div className="flex items-center gap-1.5">
              <motion.button
                type="button"
                onClick={handleShare}
                className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-xl transition-all border border-white/10"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                title={t('detail.share')}
              >
                <ShareIcon className="w-4 h-4" />
                <span className="hidden md:inline text-xs font-medium">{t('detail.share')}</span>
              </motion.button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* === HERO SECTION - Agent profile style === */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10">
          <motion.div
            className="flex flex-col lg:flex-row items-center lg:items-start gap-5 sm:gap-6 lg:gap-8"
            initial="hidden"
            animate="visible"
            variants={staggerContainerVariants}
          >
            {/* Logo / Avatar - Large, like agent photo */}
            <motion.div className="relative flex-shrink-0" variants={fadeUpVariants}>
              <div className={`w-28 h-28 sm:w-36 sm:h-36 lg:w-44 lg:h-44 rounded-xl sm:rounded-2xl overflow-hidden shadow-xl border-4 border-white bg-gradient-to-br ${gradient}`}
                style={{ boxShadow: '0 10px 25px rgba(0,0,0,0.12), inset 2px 2px 2px 0 rgba(255,255,255,0.5)' }}
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

            {/* Info section */}
            <motion.div className="flex-1 text-center lg:text-left min-w-0" variants={fadeUpVariants}>
              {/* Name + badges row */}
              <div className="flex flex-col lg:flex-row items-center lg:items-start gap-2 sm:gap-3 mb-2 sm:mb-3">
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-neutral-900">{listing.name}</h1>
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
                  <span>{categoryIcon}</span>
                  {t(`categories.${listing.category}`)}
                </span>
              </div>

              {/* Location */}
              <div className="flex items-center justify-center lg:justify-start gap-2 mb-3 sm:mb-4 text-neutral-600">
                <MapPinIcon className="w-5 h-5 text-neutral-400" />
                <span className="text-sm sm:text-base lg:text-lg">
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
                    <motion.span
                      className={`w-2 h-2 rounded-full ${isOpenToday ? 'bg-emerald-500' : 'bg-neutral-400'}`}
                      animate={isOpenToday ? { scale: [1, 1.3, 1], opacity: [1, 0.7, 1] } : {}}
                      transition={isOpenToday ? { duration: 2, repeat: Infinity } : {}}
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

              {/* Quick stats pills - like agent profile */}
              <div className="flex flex-wrap justify-center lg:justify-start gap-2 sm:gap-3 mb-4 sm:mb-5">
                <motion.div
                  className="bg-blue-50 border border-blue-100 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl"
                  whileHover={{ scale: 1.03, y: -1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                >
                  <span className="text-lg sm:text-2xl font-bold text-blue-700">{listing.services.length}</span>
                  <span className="text-blue-600/80 ml-1.5 text-xs sm:text-sm font-medium">{t('detail.stats.services')}</span>
                </motion.div>
                <motion.div
                  className="bg-amber-50 border border-amber-100 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl"
                  whileHover={{ scale: 1.03, y: -1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                >
                  <span className="text-lg sm:text-2xl font-bold text-amber-700">{listing.views}</span>
                  <span className="text-amber-600/80 ml-1.5 text-xs sm:text-sm font-medium">{t('detail.stats.views')}</span>
                </motion.div>
                <motion.div
                  className="bg-emerald-50 border border-emerald-100 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl"
                  whileHover={{ scale: 1.03, y: -1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                >
                  <span className="text-emerald-700 text-xs sm:text-sm font-semibold">{t('detail.stats.memberSince')}</span>
                  <span className="text-emerald-600/80 ml-1.5 text-xs sm:text-sm">{memberSince}</span>
                </motion.div>
              </div>

            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* === MAIN CONTENT - 2 column layout like agent profile === */}
      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-8">
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
                <div className="p-5 sm:p-6 lg:p-8">
                  <div className="flex items-center gap-3 mb-5">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-sm`}>
                      <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-neutral-900">{t('detail.about', { defaultValue: 'About' })}</h2>
                      <p className="text-xs text-neutral-400">{t('detail.aboutSubtitle', { defaultValue: 'Who we are & what we do' })}</p>
                    </div>
                  </div>

                  {/* Quote-style description */}
                  <div className="relative pl-5 border-l-[3px] border-primary/20">
                    <svg className="absolute -left-2.5 -top-1 w-5 h-5 text-primary/30" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983z" />
                    </svg>
                    <p className="text-neutral-600 leading-relaxed text-sm sm:text-base whitespace-pre-line">
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
                      <span>{categoryIcon}</span>
                      {t(`categories.${listing.category}`)}
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
                          className={`flex justify-between items-center text-sm py-2.5 px-3 sm:px-4 rounded-xl transition-all duration-200 ${
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
                    <div className="w-14 h-14 rounded-full overflow-hidden flex-shrink-0 border-2 border-neutral-100 shadow-md bg-gradient-to-br from-violet-400 to-purple-500">
                      {listing.owner.avatarUrl ? (
                        <img src={listing.owner.avatarUrl} alt={listing.owner.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="text-xl font-bold text-white">{listing.owner.name.charAt(0).toUpperCase()}</span>
                        </div>
                      )}
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
            className="text-2xl sm:text-3xl font-bold mb-3"
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
          >
            {t('detail.cta.title', { name: listing.name })}
          </motion.h2>
          <motion.p
            className="text-white/80 text-lg mb-6 max-w-2xl mx-auto"
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
          >
            {t('detail.cta.subtitle')}
          </motion.p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <motion.a
              href={`tel:${listing.contactPhone}`}
              className="inline-flex items-center justify-center gap-2 bg-white text-neutral-900 hover:bg-neutral-100 font-bold py-3 px-8 rounded-xl transition-colors shadow-lg text-sm sm:text-base"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              <PhoneIcon className="w-4 h-4" />
              {t('detail.cta.callNow', { phone: listing.contactPhone })}
            </motion.a>
            {listing.contactEmail && (
              <motion.a
                href={`mailto:${listing.contactEmail}`}
                className="inline-flex items-center justify-center gap-2 bg-white/15 hover:bg-white/25 text-white border border-white/20 font-bold py-3 px-8 rounded-xl transition-colors text-sm sm:text-base"
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
