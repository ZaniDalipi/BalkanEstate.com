// PropertyDetailsPage - Main Component
// Orchestrates all property detail subcomponents
// Real-time updates via WebSocket for instant price/status changes

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Property, PropertyImageTag } from '@/types';
import { useAppContext } from '@/context/AppContext';
import { useRealtimeProperties, useProperty } from '@/src/features/properties/hooks';
import { ArrowLeftIcon, SparklesIcon, UserIcon } from '@/constants';
import DefaultAvatar from '@/components/shared/DefaultAvatar';
import ImageViewerModal from './ImageViewerModal';
import FloorPlanViewerModal from './FloorPlanViewerModal';
import FeaturedAgencies from '@/components/FeaturedAgencies';
import RentalTermsSection from '@/src/features/rental/components/RentalTermsSection';
import RentalHistorySection from '@/src/features/rental/components/RentalHistorySection';
import RentalRulesByCountry from '@/src/features/rental/components/RentalRulesByCountry';
import { SEO, Breadcrumbs, generatePropertyBreadcrumbs } from '@/src/components/seo';
import { generatePropertySlug } from '@/utils/slug';
import { SocialShare } from '@/src/components/marketing/SocialShare';
import {
  ImageEditorModal,
  PropertyGallery,
  PropertyInfo,
  PropertyContact,
  PropertyPhotos,
  PropertyMapLink,
  NeighborhoodInsights,
  SocialVideoEmbed,
} from '@/src/components/property';
import SimilarProperties from '@/src/components/property/SimilarProperties';
import { useLocalizedNavigation } from '@/src/hooks/useLocalizedNavigation';
import { useTrackView } from '@/src/features/view-stats/hooks';
import PromotionModal from '@/src/features/promotions/components/PromotionModal';
import { useNotification } from '@/src/shared/hooks/useNotification';
import Footer from '@/components/shared/Footer';
import Modal from '@/components/shared/Modal';
import * as api from '@/services/apiService';

/**
 * PropertyDetailsPage Component
 *
 * Main property details page that orchestrates all subcomponents:
 * - Back button and favorite toggle
 * - Image gallery with street view
 * - Property information
 * - Photo thumbnail gallery
 * - Neighborhood insights
 * - Contact seller sidebar
 * - Map link
 *
 * All major sections have been extracted into focused components <200 lines.
 */
const PropertyDetailsPage: React.FC<{ property: Property }> = ({ property: cachedProperty }) => {
  const { t, i18n } = useTranslation(['property', 'rental', 'common']);
  const { state, dispatch, createConversation, toggleSavedHome, fetchProperties } = useAppContext();
  const { error } = useNotification();
  const { navigate } = useLocalizedNavigation();

  // Fetch fresh property data to ensure we have latest fields (e.g., generated video)
  // This fixes the issue where video doesn't show when opening from search (stale cache)
  const { property: freshProperty } = useProperty(cachedProperty?.id, {
    enablePolling: false, // Don't poll, just fetch once on mount
  });

  // Use fresh data if available, fall back to cached data
  // This ensures we show the page immediately with cached data, then update with fresh
  const property = useMemo(() => {
    if (freshProperty) {
      // Merge fresh data with cached to ensure all fields are present
      return { ...cachedProperty, ...freshProperty };
    }
    return cachedProperty;
  }, [freshProperty, cachedProperty]);

  // Track page view for analytics
  useTrackView({
    entityType: 'property',
    entityId: property.id,
    enabled: !!property.id,
  });

  // Enable real-time updates - refresh when this property is updated
  useRealtimeProperties({
    onPropertyUpdated: (data) => {
      // If the updated property is the one being viewed, refresh the data
      if (data.propertyId === property.id) {
        fetchProperties?.();
      }
    },
    onPropertyDeleted: (data) => {
      // If the property being viewed was deleted, go back to the appropriate listing page
      if (data.propertyId === property.id) {
        const isRental = property.listingType === 'rent';
        navigate(isRental ? '/rentals' : '/search');
      }
    },
  });

  // State for image gallery
  const [activeCategory, setActiveCategory] = useState<PropertyImageTag | 'all'>('all');
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // State for modals
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [isFloorPlanOpen, setIsFloorPlanOpen] = useState(false);

  // State for contact
  const [isCreatingConversation, setIsCreatingConversation] = useState(false);

  // State for share
  const [showCopiedToast, setShowCopiedToast] = useState(false);

  // State for promotion modal
  const [isPromotionModalOpen, setIsPromotionModalOpen] = useState(false);

  // State for rental status management
  const [showRentedModal, setShowRentedModal] = useState(false);
  const [showAvailableConfirm, setShowAvailableConfirm] = useState(false);
  const [rentedUntilDate, setRentedUntilDate] = useState('');
  const [localStatus, setLocalStatus] = useState(property.status);
  // Sync if the property prop is updated externally (re-fetch / real-time update)
  useEffect(() => { setLocalStatus(property.status); }, [property.status]);

  // State for mobile breadcrumb collapse on scroll
  const [isBreadcrumbCollapsed, setIsBreadcrumbCollapsed] = useState(false);
  const lastScrollY = useRef(0);
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' && window.innerWidth < 768);

  // Handle scroll to collapse/expand breadcrumb on mobile
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!isMobile) {
      setIsBreadcrumbCollapsed(false);
      return;
    }

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const scrollThreshold = 50; // Minimum scroll before collapsing

      if (currentScrollY > scrollThreshold && currentScrollY > lastScrollY.current) {
        // Scrolling down - collapse
        setIsBreadcrumbCollapsed(true);
      } else if (currentScrollY < lastScrollY.current - 10) {
        // Scrolling up (with 10px buffer) - expand
        setIsBreadcrumbCollapsed(false);
      }

      lastScrollY.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isMobile]);

  // Get current user
  const currentUser = state.currentUser || state.user;

  // Check if current user is the owner (private seller or agent)
  const isOwner = React.useMemo(() => {
    if (!currentUser) return false;
    const userId = String(currentUser.id || currentUser._id);
    // Check if user is the seller (covers both private sellers and agents)
    if (property.sellerId && String(property.sellerId) === userId) return true;
    return false;
  }, [currentUser, property.sellerId]);

  // Computed values
  const isFavorited = state.savedHomes.some((p) => p.id === property.id);

  // Calculate days since listing
  const daysListed = React.useMemo(() => {
    if (!property.createdAt) return null;
    const now = Date.now();
    // Handle both number timestamps and ISO date strings from the backend
    const created = typeof property.createdAt === 'string'
      ? new Date(property.createdAt).getTime()
      : property.createdAt;
    if (isNaN(created)) return null;
    const diffDays = Math.floor((now - created) / (1000 * 60 * 60 * 24));
    return diffDays;
  }, [property.createdAt]);

  // Format days listed text
  const daysListedText = React.useMemo(() => {
    if (daysListed === null) return null;
    if (daysListed === 0) return t('property:listing.listedToday');
    if (daysListed === 1) return t('property:listing.listedYesterday');
    if (daysListed < 7) return t('property:listing.listedDaysAgo', { days: daysListed });
    if (daysListed < 30) {
      const weeks = Math.floor(daysListed / 7);
      return weeks > 1
        ? t('property:listing.listedWeeksAgoPlural', { weeks })
        : t('property:listing.listedWeeksAgo', { weeks });
    }
    const months = Math.floor(daysListed / 30);
    return months > 1
      ? t('property:listing.listedMonthsAgoPlural', { months })
      : t('property:listing.listedMonthsAgo', { months });
  }, [daysListed, t]);

  // Get current image URL for editor
  const allImages = React.useMemo(() => {
    const images = property.images || [];
    const mainImage = { url: property.imageUrl, tag: 'exterior' as PropertyImageTag };
    const combined = [mainImage, ...images];
    return combined.filter((v, i, a) => a.findIndex((t) => t.url === v.url) === i);
  }, [property.imageUrl, property.images]);

  const categorizedImages = React.useMemo(() => {
    return allImages.reduce((acc, img) => {
      const tag = img.tag || 'other';
      if (!acc[tag]) {
        acc[tag] = [];
      }
      acc[tag].push(img);
      return acc;
    }, {} as Record<PropertyImageTag, { url: string; tag: PropertyImageTag }[]>);
  }, [allImages]);

  const imagesForCurrentCategory = React.useMemo(() => {
    if (activeCategory === 'all') {
      return allImages;
    }
    return categorizedImages[activeCategory] || [];
  }, [activeCategory, allImages, categorizedImages]);

  const currentImageUrl = imagesForCurrentCategory[currentImageIndex]?.url || property.imageUrl;

  // Handlers
  const handleBack = () => {
    // Use browser history for proper PWA back navigation
    // This preserves the user's navigation context (e.g., coming from saved properties, agents, etc.)
    if (window.history.length > 1) {
      window.history.back();
    } else {
      // Fallback for direct navigation (e.g., shared link with no history)
      dispatch({ type: 'SET_SELECTED_PROPERTY', payload: null });
      const isRental = property.listingType === 'rent';
      navigate(isRental ? '/rentals' : '/search');
    }
  };

  const handleFavoriteClick = async () => {
    if (!state.isAuthenticated && !state.user) {
      dispatch({ type: 'TOGGLE_AUTH_MODAL', payload: { isOpen: true } });
    } else {
      try {
        await toggleSavedHome(property);
      } catch (err) {
        // Error removed
        await error(t('property:errors.errorTitle', 'Error'), t('property:errors.saveFailed', 'Failed to save property. Please try again.'));
      }
    }
  };

  const handleContactSeller = async () => {
    if (!state.isAuthenticated) {
      dispatch({ type: 'TOGGLE_AUTH_MODAL', payload: { isOpen: true } });
      return;
    }

    setIsCreatingConversation(true);
    try {
      const conversation = await createConversation(property.id);
      // Clear selected property so App.tsx stops rendering PropertyDetailsPage
      dispatch({ type: 'SET_SELECTED_PROPERTY', payload: null });
      dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'inbox' });
      dispatch({ type: 'SET_ACTIVE_CONVERSATION', payload: conversation.id });
      window.history.pushState({}, '', '/inbox');
    } catch (err) {
      await error(t('property:errors.errorTitle', 'Error'), t('property:errors.conversationFailed', 'Failed to start conversation. Please try again.'));
    } finally {
      setIsCreatingConversation(false);
    }
  };

  const handleNavigateToMap = () => {
    const isRental = property.listingType === 'rent';
    dispatch({
      type: 'UPDATE_SEARCH_PAGE_STATE',
      payload: {
        focusMapOnProperty: {
          lat: property.lat,
          lng: property.lng,
          address: property.address,
        },
      },
    });
    dispatch({ type: 'SET_SELECTED_PROPERTY', payload: null });
    dispatch({ type: 'SET_ACTIVE_VIEW', payload: isRental ? 'rentals' : 'search' });
  };

  // Navigate to 3D tour - scroll to map section and open 360 tour
  const handleNavigateTo3DTour = () => {
    // Scroll to map section
    const mapSection = document.getElementById('property-map-section');
    if (mapSection) {
      mapSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    // Open 360 tour in new tab after a short delay
    if (property.virtualTour360Url) {
      setTimeout(() => {
        window.open(property.virtualTour360Url, '_blank', 'noopener,noreferrer');
      }, 500);
    }
  };

  const handleProfileClick = useCallback(() => {
    if (state.isAuthenticated) {
      dispatch({ type: 'SET_SELECTED_PROPERTY', payload: null });
      dispatch({ type: 'SET_SELECTED_AGENCY', payload: null });
      dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'account' });
      navigate('/account');
    } else {
      dispatch({ type: 'TOGGLE_AUTH_MODAL', payload: { isOpen: true, view: 'login' } });
    }
  }, [state.isAuthenticated, dispatch, navigate]);

  const handleCategorySelect = useCallback((tag: PropertyImageTag | 'all') => {
    // Smoothly scroll to top to show the gallery
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setActiveCategory(tag);
    setCurrentImageIndex(0);
  }, []);

  // Handler for image selection from thumbnails - scroll to gallery
  const handleImageSelect = useCallback((index: number) => {
    setCurrentImageIndex(index);
    // Smoothly scroll to show the main gallery
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Rental status handlers
  const handleMarkAsRented = useCallback(async () => {
    setShowRentedModal(false);
    setLocalStatus('rented');
    const rentedAt = Date.now();
    const until = rentedUntilDate ? new Date(rentedUntilDate).getTime() : undefined;
    dispatch({ type: 'MARK_PROPERTY_RENTED', payload: { id: property.id, rentedAt, rentedUntil: until } });
    window.dispatchEvent(new CustomEvent('property-status-update', { detail: { id: property.id, status: 'rented', rentedAt, rentedUntil: until } }));
    setRentedUntilDate('');
    try {
      await api.markPropertyAsRented(property.id, rentedUntilDate || undefined);
      fetchProperties?.();
      window.dispatchEvent(new CustomEvent('property-status-changed'));
    } catch {
      setLocalStatus('active');
      dispatch({ type: 'MARK_PROPERTY_AVAILABLE', payload: property.id });
    }
  }, [property.id, rentedUntilDate, fetchProperties, dispatch]);

  const handleMarkAsAvailable = useCallback(async () => {
    setShowAvailableConfirm(false);
    setLocalStatus('active');
    dispatch({ type: 'MARK_PROPERTY_AVAILABLE', payload: property.id });
    window.dispatchEvent(new CustomEvent('property-status-update', { detail: { id: property.id, status: 'active', rentedAt: undefined, rentedUntil: undefined } }));
    try {
      await api.markPropertyAsAvailable(property.id);
      fetchProperties?.();
      window.dispatchEvent(new CustomEvent('property-status-changed'));
    } catch {
      setLocalStatus('rented');
      dispatch({ type: 'MARK_PROPERTY_RENTED', payload: { id: property.id } });
    }
  }, [property.id, fetchProperties, dispatch]);

  // Keep localStatus in sync with property
  useEffect(() => {
    setLocalStatus(property.status);
  }, [property.status]);

  const handleShare = async () => {
    const url = `${window.location.origin}/property/${propertySlug}`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: `${property.address}, ${property.city}`,
          text: `Check out this property: ${property.beds} beds, ${property.baths} baths, ${property.sqft}m²`,
          url,
        });
      } else {
        await navigator.clipboard.writeText(url);
        setShowCopiedToast(true);
        setTimeout(() => setShowCopiedToast(false), 2000);
      }
    } catch (err) {
      // User cancelled share or error occurred
      // Log removed
    }
  };

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [property.id]);

  // Handle browser back button
  useEffect(() => {
    const handlePopState = () => {
      dispatch({ type: 'SET_SELECTED_PROPERTY', payload: null });
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [dispatch]);

  // Generate keyword-rich SEO title (matches target keywords like "3-Bed Apartment in Budva, Montenegro")
  const propertyTypeLabel = property.propertyType
    ? property.propertyType.charAt(0).toUpperCase() + property.propertyType.slice(1)
    : 'Property';
  const isRentalProperty = property.listingType === 'rent';
  const listingAction = isRentalProperty ? t('property:seo.forRent', 'Rent') : t('property:seo.forSale', 'Sale');
  const priceStr = `€${property.price?.toLocaleString()}${isRentalProperty ? t('property:seo.perMonth', '/mo') : ''}`;
  const seoTitle = t('property:seo.title', {
    beds: property.beds,
    type: propertyTypeLabel,
    listingAction,
    city: property.city,
    country: property.country,
    price: property.price?.toLocaleString(),
    defaultValue: `${property.beds}-Bed ${propertyTypeLabel} for ${listingAction} in ${property.city}, ${property.country} - ${priceStr}`,
  });

  // Generate SEO description
  const seoDescription = t('property:seo.description', {
    beds: property.beds,
    baths: property.baths,
    type: property.propertyType || 'property',
    listingAction,
    city: property.city,
    country: property.country,
    sqft: property.sqft,
    price: property.price?.toLocaleString(),
    defaultValue: `${property.beds} bedroom, ${property.baths} bathroom ${property.propertyType || 'property'} for ${listingAction} in ${property.city}, ${property.country}. ${property.sqft}m² for ${priceStr}.`,
  }) + (property.description ? ` ${property.description.slice(0, 120)}` : '');

  // Get all images for SEO
  const seoImages = allImages.map(img => img.url).filter(Boolean);

  // Generate SEO-friendly slug for canonical URL
  const propertySlug = generatePropertySlug(property);

  return (
    <div className="bg-neutral-50 h-full overflow-y-auto overflow-x-hidden animate-fade-in" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)', overscrollBehaviorY: 'contain', WebkitOverflowScrolling: 'touch' }}>
      {/* SEO Meta Tags + VideoObject for tours */}
      <SEO
        title={seoTitle}
        description={seoDescription}
        canonical={`${window.location.origin}/property/${propertySlug}`}
        image={property.imageUrl}
        type="product"
        property={{
          price: property.price,
          originalPrice: property.originalPrice,
          currency: 'EUR',
          bedrooms: property.beds,
          bathrooms: property.baths,
          sqft: property.sqft,
          address: property.address,
          city: property.city,
          country: property.country,
          propertyType: property.propertyType,
          images: seoImages,
          latitude: property.lat,
          longitude: property.lng,
          datePosted: property.createdAt,
          dateModified: property.lastRenewed || property.createdAt,
          videoUrl: property.videoUrl || property.generatedVideoUrl,
          virtualTour360Url: property.virtualTour360Url,
          listingType: property.listingType,
        }}
      />

      {/* Modals */}
      {isEditorOpen && (
        <ImageEditorModal
          imageUrl={currentImageUrl}
          property={property}
          onClose={() => setIsEditorOpen(false)}
        />
      )}
      {isViewerOpen && (
        <ImageViewerModal
          images={imagesForCurrentCategory}
          startIndex={currentImageIndex}
          onClose={() => setIsViewerOpen(false)}
        />
      )}
      {isFloorPlanOpen && property.floorplanUrl && (
        <FloorPlanViewerModal
          imageUrl={property.floorplanUrl}
          propertyId={property.id}
          onClose={() => setIsFloorPlanOpen(false)}
        />
      )}
      {isPromotionModalOpen && (
        <PromotionModal
          isOpen={isPromotionModalOpen}
          onClose={() => setIsPromotionModalOpen(false)}
          propertyId={property.id}
          propertyTitle={property.title || property.address}
          isExtension={property.isPromoted}
          currentTier={property.promotionTier as 'featured' | 'highlight' | 'premium' | undefined}
        />
      )}

      {/* Mark as Rented Modal */}
      <Modal
        isOpen={showRentedModal}
        onClose={() => { setShowRentedModal(false); setRentedUntilDate(''); }}
        title={t('rental:status.markAsRented')}
      >
        <div className="space-y-4">
          <p className="text-neutral-600 text-center text-sm">
            {t('rental:status.markAsRentedDesc')}
          </p>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">{t('rental:status.rentedUntilLabel')}</label>
            <input
              type="date"
              value={rentedUntilDate}
              onChange={(e) => setRentedUntilDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-sm"
            />
            <p className="text-xs text-neutral-400 mt-1">{t('rental:status.leaveEmptyHint')}</p>
          </div>
          <div className="flex justify-center gap-4 pt-2">
            <button onClick={() => { setShowRentedModal(false); setRentedUntilDate(''); }} className="px-6 py-2 border border-neutral-300 text-neutral-700 font-semibold rounded-lg hover:bg-neutral-100">{t('common:cancel')}</button>
            <button onClick={handleMarkAsRented} className="px-6 py-2 bg-orange-500 text-white font-semibold rounded-lg hover:bg-orange-600">{t('rental:status.markAsRented')}</button>
          </div>
        </div>
      </Modal>

      {/* Mark as Available Confirm Modal */}
      <Modal
        isOpen={showAvailableConfirm}
        onClose={() => setShowAvailableConfirm(false)}
        title={t('rental:status.markAsAvailable')}
      >
        <p className="text-neutral-600 mb-6 text-center">
          {t('rental:status.markAsAvailableDesc')}
        </p>
        <div className="flex justify-center gap-4">
          <button onClick={() => setShowAvailableConfirm(false)} className="px-6 py-2 border border-neutral-300 text-neutral-700 font-semibold rounded-lg hover:bg-neutral-100">{t('common:cancel')}</button>
          <button onClick={handleMarkAsAvailable} className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700">{t('rental:status.markAsAvailable')}</button>
        </div>
      </Modal>

      {/* Copied Toast */}
      {showCopiedToast && (
        <div className="fixed left-1/2 -translate-x-1/2 z-50 bg-neutral-800 text-white px-4 py-2.5 rounded-xl shadow-lg text-sm font-medium animate-fade-in" style={{ top: 'calc(env(safe-area-inset-top, 0px) + 5rem)' }}>
          {t('property:toast.linkCopied')}
        </div>
      )}

      {/* Sold Banner */}
      {property.status === 'sold' && (
        <div className="bg-gradient-to-r from-red-600 to-red-700 text-white py-3 px-4" style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top, 0.75rem))' }}>
          <div className="max-w-7xl mx-auto flex items-center justify-center gap-3">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="font-semibold text-sm md:text-base">
              {t('property:status.soldBanner', 'This property has been sold')}
            </span>
          </div>
        </div>
      )}

      {/* Rented Banner */}
      {localStatus === 'rented' && (
        <div className="bg-gradient-to-r from-orange-500 to-amber-600 text-white py-3 px-4" style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top, 0.75rem))' }}>
          <div className="max-w-7xl mx-auto flex items-center justify-center gap-3">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
            </svg>
            <span className="font-semibold text-sm md:text-base">
              {property.rentedUntil ? (
                <>
                  {t('property:status.rentedBanner', 'This property has been rented')}
                  {' — '}
                  {t('property:status.rentedUntil', { date: new Date(property.rentedUntil).toLocaleDateString(i18n.language === 'me' ? 'sr-Latn-ME' : i18n.language === 'sq' ? 'sq-AL' : i18n.language, { day: 'numeric', month: 'long', year: 'numeric' }), defaultValue: `Available from {{date}}` })}
                </>
              ) : (
                t('property:status.rentedBanner', 'This property has been rented')
              )}
            </span>
          </div>
        </div>
      )}

      {/* Header - Compact on mobile with PWA safe area */}
      <div className="bg-white/80 backdrop-blur-sm shadow-sm sticky top-0 z-10" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        {/* Breadcrumbs - Hidden on mobile, visible on larger screens */}
        <div
          className={`px-3 sm:px-4 overflow-hidden transition-all duration-300 ease-in-out hidden sm:block ${
            isBreadcrumbCollapsed
              ? 'max-h-0 opacity-0 py-0'
              : 'max-h-20 opacity-100 pt-2 pb-1'
          }`}
        >
          <Breadcrumbs
            items={generatePropertyBreadcrumbs({
              id: property.id,
              address: property.address,
              city: property.city,
              country: property.country,
            })}
          />
        </div>

        {/* Single row header on mobile: Back + Stats + Actions */}
        <div className="px-2 xs:px-3 sm:px-4 py-2 sm:py-3 md:py-5 md:mt-2 flex items-center justify-between gap-1 xs:gap-2">
          {/* Back button - larger tap target for PWA */}
          <button
            onClick={handleBack}
            className="flex items-center gap-1.5 sm:gap-2 text-primary font-semibold hover:underline text-sm sm:text-base min-h-[44px] min-w-[44px] -ml-1 pl-1"
            aria-label={t('property:navigation.goBackToSearch')}
          >
            <ArrowLeftIcon className="w-5 h-5" />
            <span className="hidden xs:inline">{t('property:navigation.back')}</span>
          </button>

          {/* Stats - hidden on mobile for cleaner layout */}
          {(daysListedText || property.views) && (
            <div className="hidden sm:flex items-center gap-2 sm:gap-3 text-xs text-neutral-500">
              {daysListedText && (
                <span className="flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="whitespace-nowrap">{daysListedText}</span>
                </span>
              )}
              {property.views !== undefined && property.views > 0 && (
                <span className="flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  <span>{property.views.toLocaleString()}</span>
                </span>
              )}
            </div>
          )}

          {/* Action buttons - tighter gap on mobile */}
          <div className="flex items-center gap-1 xs:gap-1.5 sm:gap-2 md:gap-3">
            {/* Promote/Extend Button - Only visible to property owners */}
            {isOwner && property.status !== 'sold' && (
              <button
                onClick={() => setIsPromotionModalOpen(true)}
                className={`flex items-center gap-1 px-2 sm:px-3 py-1.5 sm:py-2 text-white text-xs sm:text-sm font-semibold rounded-full shadow-md hover:shadow-lg transition-all ${
                  property.isPromoted
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600'
                    : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700'
                }`}
                aria-label={property.isPromoted ? t('property:actions.extendPromotion', 'Extend') : t('property:actions.promote', 'Promote')}
              >
                <SparklesIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">
                  {property.isPromoted
                    ? t('property:actions.extendPromotion', 'Extend')
                    : t('property:actions.promote', 'Promote')}
                </span>
              </button>
            )}

            {/* Rental Status Toggle - Only for rental property owners */}
            {isOwner && property.listingType === 'rent' && localStatus !== 'sold' && (
              localStatus === 'rented' ? (
                <button
                  onClick={() => setShowAvailableConfirm(true)}
                  className="flex items-center gap-1 px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold rounded-full shadow-md hover:shadow-lg transition-all bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white"
                >
                  <svg className="h-3.5 w-3.5 sm:h-4 sm:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span className="hidden sm:inline">{t('rental:status.markAsAvailable')}</span>
                </button>
              ) : (
                <button
                  onClick={() => setShowRentedModal(true)}
                  className="flex items-center gap-1 px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold rounded-full shadow-md hover:shadow-lg transition-all bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white"
                >
                  <svg className="h-3.5 w-3.5 sm:h-4 sm:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="hidden sm:inline">{t('rental:status.markAsRented')}</span>
                </button>
              )
            )}

            {/* Share Button */}
            <button
              onClick={handleShare}
              className="bg-white p-2 sm:p-2 md:p-2.5 rounded-full border border-neutral-200 cursor-pointer hover:shadow-md hover:border-primary/30 transition-all"
              aria-label={t('property:actions.share')}
              title={t('property:actions.share')}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-[18px] w-[18px] sm:h-6 sm:w-6 md:h-7 md:w-7 text-neutral-500 hover:text-primary transition-colors"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                />
              </svg>
            </button>

            {/* Favorite Button */}
            <div
              onClick={property.status === 'sold' ? undefined : handleFavoriteClick}
              className={`bg-white p-2 sm:p-2 md:p-2.5 rounded-full border border-neutral-200 ${
                property.status === 'sold'
                  ? 'opacity-50 cursor-not-allowed'
                  : 'cursor-pointer hover:shadow-md'
              }`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className={`h-[18px] w-[18px] sm:h-6 sm:w-6 md:h-7 md:w-7 transition-colors duration-300 ${
                  property.status === 'sold'
                    ? 'text-neutral-300'
                    : isFavorited
                    ? 'text-red-500 fill-current'
                    : 'text-neutral-500 hover:text-red-500'
                }`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                />
              </svg>
            </div>

            {/* Profile Button - compact avatar for PWA navigation */}
            <button
              onClick={handleProfileClick}
              className="rounded-full border-2 border-neutral-200 bg-white cursor-pointer hover:shadow-md hover:border-primary/30 transition-all overflow-hidden flex-shrink-0 w-9 h-9 sm:w-10 sm:h-10 md:w-10 md:h-10"
              aria-label={currentUser ? t('common:myAccount', 'My Account') : t('common:login', 'Login')}
            >
              {currentUser?.avatarUrl ? (
                <img src={currentUser.avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : currentUser ? (
                <DefaultAvatar gender={currentUser.gender} seed={currentUser.id || currentUser.name} avatarOptions={currentUser.avatarOptions} />
              ) : (
                <div className="w-full h-full bg-neutral-100 flex items-center justify-center">
                  <UserIcon className="w-4 h-4 sm:w-5 sm:h-5 text-neutral-400" />
                </div>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-screen-xl mx-auto p-3 sm:p-4 md:p-6 lg:p-8 overflow-x-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
          {/* Left Column - Property Details */}
          <div className="lg:col-span-2 space-y-6 sm:space-y-8 lg:space-y-10 min-w-0">
            {/* Image Gallery */}
            <div className="animate-slide-up" style={{ animationDelay: '0ms' }}>
              <PropertyGallery
                property={property}
                onOpenEditor={(url) => setIsEditorOpen(true)}
                onOpenViewer={() => setIsViewerOpen(true)}
                onNavigateTo3DTour={handleNavigateTo3DTour}
                activeCategory={activeCategory}
                currentImageIndex={currentImageIndex}
                onCategoryChange={handleCategorySelect}
                onImageIndexChange={setCurrentImageIndex}
              />
            </div>

            {/* Photo Thumbnails - Under gallery with spacing */}
            <div className="animate-slide-up mt-4 sm:mt-6" style={{ animationDelay: '50ms' }}>
              <PropertyPhotos
                property={property}
                activeCategory={activeCategory}
                currentImageIndex={currentImageIndex}
                onCategorySelect={handleCategorySelect}
                onImageSelect={handleImageSelect}
              />
            </div>

            {/* Mobile Only: Property Info (description) shown early */}
            <div className="lg:hidden animate-slide-up" style={{ animationDelay: '50ms' }}>
              <PropertyInfo property={property} onOpenFloorPlan={() => setIsFloorPlanOpen(true)} />
            </div>

            {/* Mobile Only: Quick Actions & Contact (shown after description on mobile) */}
            <div className="lg:hidden animate-slide-up" style={{ animationDelay: '75ms' }}>
              <PropertyContact
                property={property}
                isCreatingConversation={isCreatingConversation}
                onContactSeller={handleContactSeller}
              />
            </div>

            {/* 360 Virtual Tour is now shown as a badge in the gallery and can be opened from there */}
            {/* Video Tour (YouTube/Vimeo) is now integrated in the PropertyGallery as the first view */}

            {/* Social Video Embed - TikTok, Instagram (these need special embed) */}
            {property.tourUrl && (property.tourUrl.includes('tiktok.com') || property.tourUrl.includes('instagram.com')) && (
              <div className="animate-slide-up" style={{ animationDelay: '125ms' }}>
                <SocialVideoEmbed videoUrl={property.tourUrl} />
              </div>
            )}

            {/* Property Info (Desktop only - mobile version shown above) */}
            <div className="hidden lg:block animate-slide-up" style={{ animationDelay: '100ms' }}>
              <PropertyInfo property={property} onOpenFloorPlan={() => setIsFloorPlanOpen(true)} />
            </div>

            {/* Rental Terms (only for rental properties) */}
            {property.listingType === 'rent' && (
              <div className="animate-slide-up space-y-6" style={{ animationDelay: '150ms' }}>
                <RentalTermsSection property={property} />
                <RentalHistorySection property={property} isOwner={isOwner} />
                <RentalRulesByCountry country={property.country} />
              </div>
            )}

            {/* Map Link */}
            <div id="property-map-section" className="animate-slide-up" style={{ animationDelay: '300ms' }}>
              <PropertyMapLink property={property} onNavigateToMap={handleNavigateToMap} />
            </div>

            {/* Neighborhood Insights */}
            <div className="animate-slide-up" style={{ animationDelay: '400ms' }}>
              <NeighborhoodInsights
                lat={property.lat}
                lng={property.lng}
                address={property.address}
                city={property.city}
                country={property.country}
              />
            </div>

            {/* Similar Properties - Internal linking for SEO */}
            <div className="mt-4 sm:mt-6 lg:mt-8 animate-slide-up" style={{ animationDelay: '450ms' }}>
              <SimilarProperties property={property} maxItems={4} />
            </div>

            {/* Featured Agencies */}
            <div className="mt-4 sm:mt-6 lg:mt-8 animate-slide-up" style={{ animationDelay: '500ms' }}>
              <h3 className="text-xl sm:text-2xl font-bold text-neutral-800 mb-3 sm:mb-4">{t('property:featuredAgencies')}</h3>
              <FeaturedAgencies />
            </div>
          </div>

          {/* Right Column - Contact Sidebar (Desktop only - mobile version shown above) */}
          <div className="hidden lg:block lg:col-span-1 min-w-0 animate-slide-up" style={{ animationDelay: '150ms' }}>
            <PropertyContact
              property={property}
              isCreatingConversation={isCreatingConversation}
              onContactSeller={handleContactSeller}
            />
          </div>
        </div>
      </main>

      {/* Animation styles */}
      <style>{`
        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-slide-up {
          animation: slide-up 0.6s ease-out forwards;
          opacity: 0;
        }
      `}</style>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default PropertyDetailsPage;
