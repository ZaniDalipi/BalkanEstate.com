// PropertyDetailsPage - Main Component
// Orchestrates all property detail subcomponents

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Property, PropertyImageTag } from '@/types';
import { useAppContext } from '@/context/AppContext';
import { ArrowLeftIcon, SparklesIcon } from '@/constants';
import ImageViewerModal from './ImageViewerModal';
import FloorPlanViewerModal from './FloorPlanViewerModal';
import FeaturedAgencies from '@/components/FeaturedAgencies';
import { SEO, Breadcrumbs, generatePropertyBreadcrumbs } from '@/src/components/seo';
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
import { useTrackView } from '@/src/features/view-stats/hooks';
import PromotionModal from '@/src/features/promotions/components/PromotionModal';
import { useNotification } from '@/src/shared/hooks/useNotification';
import Footer from '@/components/shared/Footer';

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
const PropertyDetailsPage: React.FC<{ property: Property }> = ({ property }) => {
  const { t } = useTranslation(['property']);
  const { state, dispatch, createConversation, toggleSavedHome } = useAppContext();
  const { error } = useNotification();

  // Track page view for analytics
  useTrackView({
    entityType: 'property',
    entityId: property.id,
    enabled: !!property.id,
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
    const created = property.createdAt;
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
    dispatch({ type: 'SET_SELECTED_PROPERTY', payload: null });
    window.history.pushState({}, '', '/search');
  };

  const handleFavoriteClick = async () => {
    if (!state.isAuthenticated && !state.user) {
      dispatch({ type: 'TOGGLE_AUTH_MODAL', payload: { isOpen: true } });
    } else {
      try {
        await toggleSavedHome(property);
      } catch (err) {
        console.error('Failed to toggle saved home:', err);
        await error(t('property:errors.errorTitle', 'Error'), t('property:errors.saveFailed', 'Failed to save property. Please try again.'));
      }
    }
  };

  const handleContactSeller = async () => {
    if (!state.isAuthenticated) {
      dispatch({ type: 'TOGGLE_AUTH_MODAL', payload: { isOpen: true } });
      return;
    }

    dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'inbox' });

    setIsCreatingConversation(true);
    try {
      const conversation = await createConversation(property.id);
      dispatch({ type: 'SET_ACTIVE_CONVERSATION', payload: conversation.id });
    } catch (err) {
      await error(t('property:errors.errorTitle', 'Error'), t('property:errors.conversationFailed', 'Failed to start conversation. Please try again.'));
    } finally {
      setIsCreatingConversation(false);
    }
  };

  const handleNavigateToMap = () => {
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
    dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'search' });
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

  const handleShare = async () => {
    const url = `${window.location.origin}/property/${property.id}`;
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
      console.log('Share cancelled or failed');
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

  // Generate SEO description
  const seoDescription = `${property.beds} bedroom, ${property.baths} bathroom ${property.propertyType || 'property'} in ${property.city}, ${property.country}. ${property.sqft}m² for €${property.price?.toLocaleString()}. ${property.description?.slice(0, 100) || ''}`;

  // Get all images for SEO
  const seoImages = allImages.map(img => img.url).filter(Boolean);

  return (
    <div className="bg-neutral-50 h-full overflow-y-auto overflow-x-hidden animate-fade-in">
      {/* SEO Meta Tags */}
      <SEO
        title={`${property.address}, ${property.city} - €${property.price?.toLocaleString()}`}
        description={seoDescription}
        canonical={`${window.location.origin}/property/${property.id}`}
        image={property.imageUrl}
        type="product"
        property={{
          price: property.price,
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

      {/* Copied Toast */}
      {showCopiedToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-neutral-800 text-white px-4 py-2 rounded-lg shadow-lg text-sm font-medium animate-fade-in">
          {t('property:toast.linkCopied')}
        </div>
      )}

      {/* Sold Banner */}
      {property.status === 'sold' && (
        <div className="bg-gradient-to-r from-red-600 to-red-700 text-white py-3 px-4">
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

      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm shadow-sm sticky top-0 z-10">
        {/* Breadcrumbs - Collapses on scroll on mobile */}
        <div
          className={`px-4 overflow-hidden transition-all duration-300 ease-in-out ${
            isBreadcrumbCollapsed
              ? 'max-h-0 opacity-0 py-0'
              : 'max-h-20 opacity-100 pt-3 pb-1'
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

        <div className={`p-4 flex items-center justify-between transition-all duration-300 ${
          isBreadcrumbCollapsed ? 'pt-2' : 'pt-2'
        }`}>
          <button
            onClick={handleBack}
            className="flex items-center gap-2 text-primary font-semibold hover:underline"
            aria-label={t('property:navigation.goBackToSearch')}
          >
            <ArrowLeftIcon className="w-5 h-5" />
            {t('property:navigation.back')}
          </button>

          <div className="flex items-center gap-2">
            {/* Promote/Extend Button - Only visible to property owners */}
            {isOwner && property.status !== 'sold' && (
              <button
                onClick={() => setIsPromotionModalOpen(true)}
                className={`flex items-center gap-1.5 px-3 py-2 text-white text-sm font-semibold rounded-full shadow-md hover:shadow-lg transition-all ${
                  property.isPromoted
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600'
                    : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700'
                }`}
                aria-label={property.isPromoted ? t('property:actions.extendPromotion', 'Extend') : t('property:actions.promote', 'Promote')}
              >
                <SparklesIcon className="h-4 w-4" />
                <span className="hidden sm:inline">
                  {property.isPromoted
                    ? t('property:actions.extendPromotion', 'Extend')
                    : t('property:actions.promote', 'Promote')}
                </span>
              </button>
            )}

            {/* Share Button */}
            <button
              onClick={handleShare}
              className="bg-white p-2 rounded-full border border-neutral-200 cursor-pointer hover:shadow-md hover:border-primary/30 transition-all"
              aria-label={t('property:actions.share')}
              title={t('property:actions.share')}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 text-neutral-500 hover:text-primary transition-colors"
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
              className={`bg-white p-2 rounded-full border border-neutral-200 ${
                property.status === 'sold'
                  ? 'opacity-50 cursor-not-allowed'
                  : 'cursor-pointer hover:shadow-md'
              }`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className={`h-6 w-6 transition-colors duration-300 ${
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
          </div>
        </div>

        {/* Stats Bar */}
        {(daysListedText || property.views) && (
          <div className="px-4 pb-3 flex items-center gap-4 text-xs text-neutral-500">
            {daysListedText && (
              <span className="flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {daysListedText}
              </span>
            )}
            {property.views !== undefined && property.views > 0 && (
              <span className="flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                {property.views.toLocaleString()} {t('property:listing.views')}
              </span>
            )}
          </div>
        )}
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
