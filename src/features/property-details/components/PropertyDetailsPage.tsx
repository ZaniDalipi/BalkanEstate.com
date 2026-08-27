// PropertyDetailsPage - Main Component
// Orchestrates all property detail subcomponents
// Real-time updates via WebSocket for instant price/status changes

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Property, PropertyImageTag } from '@/types';
import { useAppContext } from '@/context/AppContext';
import { useRealtimeProperties, useProperty } from '@/src/features/properties/hooks';
import { ArrowLeftIcon, SparklesIcon, UserIcon, HomeIcon, XMarkIcon } from '@/constants';
import { formatPrice } from '@/utils/currency';
import DefaultAvatar from '@/components/shared/DefaultAvatar';
import ImageViewerModal from './ImageViewerModal';
import FloorPlanViewerModal from './FloorPlanViewerModal';
import PropertySectionNav from './PropertySectionNav';
import FeaturedAgencies from '@/components/FeaturedAgencies';
import RentalTermsSection from '@/src/features/rental/components/RentalTermsSection';
import RentalHistorySection from '@/src/features/rental/components/RentalHistorySection';
import RentalRulesByCountry from '@/src/features/rental/components/RentalRulesByCountry';
import PropertyPriceHistory from './PropertyPriceHistory';
import { QueryErrorBoundary } from '@/src/app/components';
import { SEO, Breadcrumbs, generatePropertyBreadcrumbs } from '@/src/components/seo';
import { generatePropertySlug } from '@/utils/slug';
import { SocialShare } from '@/src/components/marketing/SocialShare';
import {
  ImageEditorModal,
  PropertyGallery,
  PropertyInfo,
  PropertyContact,
  PropertyMapLink,
  NeighborhoodInsights,
  SocialVideoEmbed,
} from '@/src/components/property';
import SimilarProperties from '@/src/components/property/SimilarProperties';
import { useLocalizedNavigation } from '@/src/hooks/useLocalizedNavigation';
import { useTrackView } from '@/src/features/view-stats/hooks';
import { useRecentlyViewed } from '@/src/hooks/useRecentlyViewed';
import PromotionModal from '@/src/features/promotions/components/PromotionModal';
import ScheduleViewingModal from '@/src/features/rental/components/ScheduleViewingModal';
import ExternalSourceBadge from '@/src/features/properties/components/ExternalSourceBadge';
import { useNotification } from '@/src/shared/hooks/useNotification';
import { buildMapFocusTarget, resolveMapDestination } from '@/shared/map/mapDestination';
import Footer from '@/components/shared/Footer';
import Modal from '@/components/shared/Modal';
import * as api from '@/services/apiService';
import { optimizeCloudinaryUrl } from '@/config/cloudinaryConfig';

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

  // Track recently viewed for homepage carousel
  const { trackView } = useRecentlyViewed();
  useEffect(() => {
    if (property?.id) trackView(property);
  }, [property?.id]); // eslint-disable-line react-hooks/exhaustive-deps

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
        navigate(isRental ? '/rentals' : '/search', { direction: 'back' });
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

  // State for sticky bottom bar schedule modal
  const [showStickyScheduleModal, setShowStickyScheduleModal] = useState(false);
  const [sellerAvatarError, setSellerAvatarError] = useState(false);

  // State for sticky bar agent long-press preview ("more from this agent")
  const [showAgentPreview, setShowAgentPreview] = useState(false);
  const agentLongPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const agentLongPressFiredRef = useRef(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Reset avatar error if the seller's photo changes (e.g. live property refresh)
  useEffect(() => {
    setSellerAvatarError(false);
  }, [property.seller?.avatarUrl]);

  // State for promotion modal
  const [isPromotionModalOpen, setIsPromotionModalOpen] = useState(false);

  // State for rental status management
  const [showRentedModal, setShowRentedModal] = useState(false);
  const [showAvailableConfirm, setShowAvailableConfirm] = useState(false);
  const [rentedUntilDate, setRentedUntilDate] = useState('');
  const [tenantName, setTenantName] = useState('');
  const [rentalNotes, setRentalNotes] = useState('');
  // Auto-release: if rentedUntil date has fully passed (the day after), treat as active
  // e.g. rentedUntil = March 22 → stays rented on March 22, becomes active on March 23
  const isRentalExpired = (() => {
    if (property.status !== 'rented' || !property.rentedUntil) return false;
    const rentedEnd = new Date(property.rentedUntil);
    rentedEnd.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return rentedEnd < today;
  })();
  const [localStatus, setLocalStatus] = useState(isRentalExpired ? 'active' : property.status);
  // Sync if the property prop is updated externally (re-fetch / real-time update)
  useEffect(() => {
    if (property.status === 'rented' && property.rentedUntil) {
      const rentedEnd = new Date(property.rentedUntil);
      rentedEnd.setHours(0, 0, 0, 0);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      setLocalStatus(rentedEnd < today ? 'active' : 'rented');
    } else {
      setLocalStatus(property.status);
    }
  }, [property.status, property.rentedUntil]);

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
      // popstate handler in NavigationProvider will auto-detect back direction
      window.history.back();
    } else {
      // Fallback for direct navigation (e.g., shared link with no history)
      dispatch({ type: 'SET_SELECTED_PROPERTY', payload: null });
      const isRental = property.listingType === 'rent';
      navigate(isRental ? '/rentals' : '/search', { direction: 'back' });
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

  /**
   * "Full Map" on the property map: hand the visitor to the map that actually
   * contains this listing — the villas map for a luxury villa, the rentals map
   * for a rental, the buy map otherwise (see `resolveMapDestination`).
   *
   * The focus target is validated rather than forwarded: a listing with a
   * missing or out-of-range coordinate navigates to the right map without a
   * fly-to instead of sending it to (0, 0).
   */
  const handleNavigateToMap = useCallback(() => {
    const destination = resolveMapDestination(property);
    const focusMapOnProperty = buildMapFocusTarget(property);

    // Set the focus target *before* navigating: the route handler switches the
    // view synchronously, and the destination page reads this on mount.
    if (focusMapOnProperty) {
      dispatch({ type: 'UPDATE_SEARCH_PAGE_STATE', payload: { focusMapOnProperty } });
    }
    // Routed rather than dispatched, so the address bar and the back button
    // end up on the map the visitor is now looking at. The route handler
    // clears the selected property itself.
    navigate(destination.path);
  }, [property, dispatch, navigate]);

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

  // Scroll to the 3D representational map section (button shown in the gallery)
  const handleView3DMap = useCallback(() => {
    document
      .getElementById('property-map-section')
      ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, []);

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

  // Navigate to the seller's agent profile page (from the sticky bottom bar)
  const handleSellerProfileClick = useCallback(() => {
    if (property.seller?.type !== 'agent') return;
    const agentIdentifier = property.seller?.agentId || property.sellerId;
    dispatch({ type: 'SET_SELECTED_PROPERTY', payload: null });
    dispatch({ type: 'SET_SELECTED_AGENCY', payload: null });
    dispatch({ type: 'SET_SELECTED_AGENT', payload: agentIdentifier });
    dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'agentProfile' });
    window.history.pushState({}, '', `/agents/${agentIdentifier}`);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }, [property.seller, property.sellerId, dispatch]);

  // Long-press on the seller avatar/name reveals a quick preview of their other listings
  const handleSellerPressStart = useCallback(() => {
    if (property.seller?.type !== 'agent') return;
    agentLongPressFiredRef.current = false;
    agentLongPressTimerRef.current = setTimeout(() => {
      agentLongPressFiredRef.current = true;
      setShowAgentPreview(true);
      if (navigator.vibrate) navigator.vibrate(8);
    }, 500);
  }, [property.seller?.type]);

  const handleSellerPressEnd = useCallback(() => {
    if (agentLongPressTimerRef.current) {
      clearTimeout(agentLongPressTimerRef.current);
      agentLongPressTimerRef.current = null;
    }
  }, []);

  const handleSellerClick = useCallback(() => {
    if (agentLongPressFiredRef.current) {
      // Long-press already opened the preview - swallow the trailing click
      agentLongPressFiredRef.current = false;
      return;
    }
    handleSellerProfileClick();
  }, [handleSellerProfileClick]);

  // Other active listings from the same agent, for the long-press preview
  const otherAgentProperties = useMemo(() => {
    if (property.seller?.type !== 'agent') return [];
    return (state.properties || []).filter(
      (p) => p.id !== property.id && p.status === 'active' && p.sellerId === property.sellerId
    ).slice(0, 6);
  }, [state.properties, property.id, property.sellerId, property.seller?.type]);

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
    // Validate date is not in the past
    if (rentedUntilDate) {
      const selected = new Date(rentedUntilDate);
      selected.setHours(0, 0, 0, 0);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (selected < today) return;
    }

    setShowRentedModal(false);
    setLocalStatus('rented');
    const rentedAt = Date.now();
    const until = rentedUntilDate ? new Date(rentedUntilDate).getTime() : undefined;
    dispatch({ type: 'MARK_PROPERTY_RENTED', payload: { id: property.id, rentedAt, rentedUntil: until } });
    window.dispatchEvent(new CustomEvent('property-status-update', { detail: { id: property.id, status: 'rented', rentedAt, rentedUntil: until } }));
    const savedTenantName = tenantName.trim();
    const savedNotes = rentalNotes.trim();
    setRentedUntilDate('');
    setTenantName('');
    setRentalNotes('');
    try {
      await api.markPropertyAsRented(property.id, rentedUntilDate || undefined, savedTenantName || undefined, savedNotes || undefined);
      fetchProperties?.();
      window.dispatchEvent(new CustomEvent('property-status-changed'));
    } catch {
      setLocalStatus('active');
      dispatch({ type: 'MARK_PROPERTY_AVAILABLE', payload: property.id });
    }
  }, [property.id, rentedUntilDate, tenantName, rentalNotes, fetchProperties, dispatch]);

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
    const shareUrl = `${window.location.origin}/property/${propertySlug}`;
    try {
      const bedroomText = property.beds === 1 ? '1 bedroom' : `${property.beds} bedrooms`;
      const bathroomText = property.baths === 1 ? '1 bathroom' : `${property.baths} bathrooms`;
      const livingRoomText = property.livingRooms
        ? property.livingRooms === 1
          ? ', 1 living room'
          : `, ${property.livingRooms} living rooms`
        : '';
      const mapText = ` Check out the 3D map: ${shareUrl}`;
      const shareText = `Check out this property: ${bedroomText}, ${bathroomText}${livingRoomText}, ${property.sqft}m².${mapText}`;
      if (navigator.share) {
        await navigator.share({
          title: `${property.address}, ${property.city}`,
          text: shareText,
          url: shareUrl,
        });
      } else {
        await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
        setShowCopiedToast(true);
        setTimeout(() => setShowCopiedToast(false), 2000);
      }
    } catch (err) {
      // User cancelled share or error occurred
    }
  };

  // Scroll to top on mount
  useEffect(() => {
    scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [property.id]);

  // Handle browser back button
  useEffect(() => {
    const handlePopState = () => {
      dispatch({ type: 'SET_SELECTED_PROPERTY', payload: null });
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [dispatch]);

  const propertyTypeLabel = property.propertyType
    ? property.propertyType.charAt(0).toUpperCase() + property.propertyType.slice(1)
    : 'Property';
  const isRentalProperty = property.listingType === 'rent';
  const listingAction = isRentalProperty ? t('property:seo.forRent', 'Rent') : t('property:seo.forSale', 'Sale');
  const priceStr = `€${property.price?.toLocaleString()}${isRentalProperty ? t('property:seo.perMonth', '/mo') : ''}`;
  const bedsPrefix = property.beds > 0 ? `${property.beds}-Bed ` : '';
  const seoTitle = property.title
    ? `${property.title} – ${property.city}, ${property.country}`
    : t('property:seo.title', {
        beds: property.beds,
        type: propertyTypeLabel,
        listingAction,
        city: property.city,
        country: property.country,
        price: property.price?.toLocaleString(),
        defaultValue: `${bedsPrefix}${propertyTypeLabel} for ${listingAction} in ${property.city}, ${property.country} - ${priceStr}`,
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
    <div ref={scrollContainerRef} className="bg-neutral-50 h-full overflow-y-auto overflow-x-hidden animate-fade-in" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)', overscrollBehaviorY: 'contain', WebkitOverflowScrolling: 'touch' }}>
      {/* SEO Meta Tags + VideoObject for tours */}
      <SEO
        title={seoTitle}
        description={seoDescription}
        canonical={`${window.location.origin}/property/${propertySlug}`}
        image={seoImages[0] || property.imageUrl}
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
          propertyId={property.id}
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
        onClose={() => { setShowRentedModal(false); setRentedUntilDate(''); setTenantName(''); setRentalNotes(''); }}
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
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-sm ${
                rentedUntilDate && new Date(rentedUntilDate) < new Date(new Date().toISOString().split('T')[0])
                  ? 'border-red-400 bg-red-50'
                  : 'border-neutral-300'
              }`}
            />
            {rentedUntilDate && new Date(rentedUntilDate) < new Date(new Date().toISOString().split('T')[0]) ? (
              <p className="text-xs text-red-500 mt-1">{t('rental:status.dateInPastError')}</p>
            ) : (
              <p className="text-xs text-neutral-400 mt-1">{t('rental:status.leaveEmptyHint')}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">{t('rental:status.tenantNameLabel')}</label>
            <input
              type="text"
              value={tenantName}
              onChange={(e) => setTenantName(e.target.value)}
              placeholder={t('rental:status.tenantNamePlaceholder')}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-sm"
            />
            <p className="text-xs text-neutral-400 mt-1">{t('rental:status.tenantNameHint')}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">{t('rental:status.rentalNotesLabel')}</label>
            <textarea
              value={rentalNotes}
              onChange={(e) => setRentalNotes(e.target.value)}
              placeholder={t('rental:status.rentalNotesPlaceholder')}
              rows={2}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-sm resize-none"
            />
          </div>
          <div className="flex justify-center gap-4 pt-2">
            <button onClick={() => { setShowRentedModal(false); setRentedUntilDate(''); setTenantName(''); setRentalNotes(''); }} className="px-6 py-2 border border-neutral-300 text-neutral-700 font-semibold rounded-lg hover:bg-neutral-100">{t('common:cancel')}</button>
            <button
              onClick={handleMarkAsRented}
              disabled={!!(rentedUntilDate && new Date(rentedUntilDate) < new Date(new Date().toISOString().split('T')[0]))}
              className="px-6 py-2 bg-orange-500 text-white font-semibold rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t('rental:status.markAsRented')}
            </button>
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

        {/* Bookmark-style quick navigation — horizontal chip bar (mobile/tablet) */}
        <PropertySectionNav variant="bar" />
      </div>

      {/* Bookmark-style quick navigation — Notion-style vertical rail (desktop).
          Mounted at the page root, outside the backdrop-blurred header. */}
      <PropertySectionNav variant="rail" />

      {/* Gallery — full-bleed, outside main container so it spans 100% page width */}
      <div className="animate-slide-up w-full" style={{ animationDelay: '0ms' }}>
        <PropertyGallery
          property={property}
          onOpenEditor={(url) => setIsEditorOpen(true)}
          onOpenViewer={() => setIsViewerOpen(true)}
          onNavigateTo3DTour={handleNavigateTo3DTour}
          onView3DMap={
            property.lat != null && property.lng != null && !isNaN(property.lat) && !isNaN(property.lng)
              ? handleView3DMap
              : undefined
          }
          activeCategory={activeCategory}
          currentImageIndex={currentImageIndex}
          onCategoryChange={handleCategorySelect}
          onImageIndexChange={setCurrentImageIndex}
          isFavorited={isFavorited}
          onFavoriteClick={handleFavoriteClick}
        />
      </div>

      {/* Main Content */}
      <main className="max-w-screen-xl mx-auto p-3 sm:p-4 md:p-6 lg:p-8 overflow-x-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
          {/* Left Column - Property Details */}
          <div className="lg:col-span-2 space-y-6 sm:space-y-8 lg:space-y-10 min-w-0">

            {/* External-source attribution: shown above PropertyInfo when this listing was imported from a third-party site */}
            {property.source && (
              <div className="px-4 lg:px-0 animate-slide-up" style={{ animationDelay: '40ms' }}>
                <ExternalSourceBadge source={property.source} sourceUrl={property.sourceUrl} variant="link" />
              </div>
            )}

            {/* Mobile Only: Property Info (description) shown early */}
            <div data-section="details" className="scroll-mt-24 lg:hidden animate-slide-up" style={{ animationDelay: '50ms' }}>
              <PropertyInfo property={property} onOpenFloorPlan={() => setIsFloorPlanOpen(true)} />
            </div>

            {/* Mobile Only: Neighborhood Insights — directly under the description */}
            <div data-section="neighborhood" className="scroll-mt-24 lg:hidden animate-slide-up" style={{ animationDelay: '62ms' }}>
              <NeighborhoodInsights
                lat={property.lat}
                lng={property.lng}
                address={property.address}
                city={property.city}
                country={property.country}
              />
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

            {/* Social Video Embed - TikTok, Instagram (fallback embed below gallery) */}
            {(() => {
              const socialVideoUrl = [property.tourUrl, property.videoUrl].find(
                url => url && (url.includes('tiktok.com') || url.includes('instagram.com'))
              );
              return socialVideoUrl ? (
                <div className="animate-slide-up" style={{ animationDelay: '125ms' }}>
                  <SocialVideoEmbed videoUrl={socialVideoUrl} />
                </div>
              ) : null;
            })()}

            {/* Property Info (Desktop only - mobile version shown above) */}
            <div data-section="details" className="scroll-mt-24 hidden lg:block animate-slide-up" style={{ animationDelay: '100ms' }}>
              <PropertyInfo property={property} onOpenFloorPlan={() => setIsFloorPlanOpen(true)} />
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

      {/* 3D Map — full-bleed full-width band, rendered outside the main container so it
          spans the full screen width, right after the description to keep readers engaged.
          id + data-section kept so the section nav still targets it. */}
      <div id="property-map-section" data-section="map" className="scroll-mt-24 animate-slide-up w-full px-3 sm:px-4 lg:px-6 my-6 sm:my-8" style={{ animationDelay: '130ms' }}>
        <PropertyMapLink property={property} onNavigateToMap={handleNavigateToMap} fullBleed />
      </div>

      {/* Main Content (continued) — remaining details below the full-width map */}
      <main className="max-w-screen-xl mx-auto p-3 sm:p-4 md:p-6 lg:p-8 overflow-x-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
          <div className="lg:col-span-2 space-y-6 sm:space-y-8 lg:space-y-10 min-w-0">

            {/* Neighborhood Insights (Desktop only — mobile version shown above) */}
            <div data-section="neighborhood" className="scroll-mt-24 hidden lg:block animate-slide-up" style={{ animationDelay: '130ms' }}>
              <NeighborhoodInsights
                lat={property.lat}
                lng={property.lng}
                address={property.address}
                city={property.city}
                country={property.country}
              />
            </div>

            {/* Rental Terms (only for rental properties) */}
            {property.listingType === 'rent' && (
              <div data-section="availability" className="scroll-mt-24 animate-slide-up space-y-6" style={{ animationDelay: '150ms' }}>
                <RentalTermsSection property={property} />
                <RentalHistorySection property={property} isOwner={isOwner} />
                <RentalRulesByCountry country={property.country} />
              </div>
            )}

            {/* Price History */}
            <div data-section="price-history" className="scroll-mt-24 animate-slide-up" style={{ animationDelay: '380ms' }}>
              <QueryErrorBoundary>
                <PropertyPriceHistory property={property} />
              </QueryErrorBoundary>
            </div>

            {/* Similar Properties - Internal linking for SEO */}
            <div data-section="similar" className="scroll-mt-24 mt-4 sm:mt-6 lg:mt-8 animate-slide-up" style={{ animationDelay: '450ms' }}>
              <SimilarProperties property={property} maxItems={4} />
            </div>

            {/* Featured Agencies */}
            <div className="mt-4 sm:mt-6 lg:mt-8 animate-slide-up" style={{ animationDelay: '500ms' }}>
              <h3 className="text-xl sm:text-2xl font-bold text-neutral-800 mb-3 sm:mb-4">{t('property:featuredAgencies')}</h3>
              <FeaturedAgencies />
            </div>

          </div>
        </div>
      </main>

      {/* Sticky Bottom Action Bar - Mobile Only (Zillow-style) */}
      {!isOwner && property.status !== 'sold' && (
        <div
          className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-neutral-200 shadow-[0_-4px_24px_rgba(0,0,0,0.10)] px-3 py-2.5 flex items-center gap-2.5"
          style={{ paddingBottom: 'calc(0.625rem + env(safe-area-inset-bottom, 0px))' }}
        >
          {/* Agent avatar + info - tap to view profile, long-press to preview other listings */}
          <button
            type="button"
            onClick={handleSellerClick}
            onPointerDown={handleSellerPressStart}
            onPointerUp={handleSellerPressEnd}
            onPointerLeave={handleSellerPressEnd}
            onPointerCancel={handleSellerPressEnd}
            onContextMenu={(e) => { if (property.seller?.type === 'agent') e.preventDefault(); }}
            disabled={property.seller?.type !== 'agent'}
            aria-label={property.seller?.type === 'agent' ? t('property:seller.viewProfile', 'View Profile') : undefined}
            className="min-w-0 flex-1 flex items-center gap-2.5 text-left select-none disabled:cursor-default"
            style={{ WebkitTouchCallout: 'none' }}
          >
            {/* Avatar with ripple-ring animation */}
            <div className="relative flex-shrink-0">
              <span className="absolute inset-0 rounded-full avatar-ring-pulse" />
              {property.seller?.avatarUrl && !sellerAvatarError ? (
                <img
                  src={optimizeCloudinaryUrl(property.seller.avatarUrl, { width: 88, quality: 'auto', crop: 'fill' })}
                  alt={property.seller.name || ''}
                  className="w-11 h-11 rounded-full object-cover ring-2 ring-white shadow-md relative"
                  onError={() => setSellerAvatarError(true)}
                />
              ) : (
                <div className={`w-11 h-11 rounded-full flex items-center justify-center ring-2 ring-white shadow-md relative ${property.seller?.type === 'agent' ? 'bg-gradient-to-br from-blue-500 to-indigo-600' : 'bg-gradient-to-br from-green-500 to-emerald-600'}`}>
                  <span className="text-white font-bold text-base select-none">
                    {property.seller?.name
                      ? property.seller.name.trim().split(/\s+/).map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
                      : '?'}
                  </span>
                </div>
              )}
              {/* Online indicator */}
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white shadow-sm" />
            </div>

            <div className="min-w-0 flex-1">
              <p className="font-semibold text-sm text-neutral-900 truncate leading-tight">{property.seller?.name || t('property:seller.privateSeller', 'Private Seller')}</p>
              <p className="text-xs text-neutral-500 leading-tight">{property.seller?.type === 'agent' ? t('property:seller.agent', 'Agent') : t('property:seller.privateSeller', 'Private Seller')}</p>
            </div>
          </button>

          {/* Call button */}
          {property.seller?.phone ? (
            <a
              href={`tel:${property.seller.phone}`}
              className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl border-2 border-green-500 text-green-600 font-semibold text-sm hover:bg-green-50 active:bg-green-100 transition-colors flex-shrink-0"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              {t('property:actions.call', 'Call')}
            </a>
          ) : null}

          {/* Schedule Tour button */}
          <button
            onClick={() => property.visitAvailability?.enabled && setShowStickyScheduleModal(true)}
            disabled={!property.visitAvailability?.enabled}
            className={`flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-md flex-shrink-0 ${property.visitAvailability?.enabled ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600 active:from-amber-700 active:to-orange-700' : 'bg-neutral-200 text-neutral-400 cursor-not-allowed shadow-none'}`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {t('property:actions.scheduleVisit', 'Schedule Tour')}
          </button>
        </div>
      )}

      {/* Schedule modal for sticky bar */}
      <ScheduleViewingModal
        property={property}
        isOpen={showStickyScheduleModal}
        onClose={() => setShowStickyScheduleModal(false)}
      />

      {/* Agent long-press preview - "cute" quick peek at their other listings */}
      {showAgentPreview && property.seller?.type === 'agent' && (
        <>
          <div
            className="lg:hidden fixed inset-0 z-40 bg-black/20 animate-backdrop-in"
            onClick={() => setShowAgentPreview(false)}
          />
          <div
            className="lg:hidden fixed left-3 right-3 z-50 bg-white rounded-2xl shadow-2xl border border-neutral-100 overflow-hidden animate-pop-in origin-bottom"
            style={{ bottom: 'calc(4.75rem + env(safe-area-inset-bottom, 0px))' }}
          >
            <div className="flex items-center gap-3 p-3.5 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-neutral-100">
              {property.seller?.avatarUrl && !sellerAvatarError ? (
                <img
                  src={optimizeCloudinaryUrl(property.seller.avatarUrl, { width: 72, quality: 'auto', crop: 'fill' })}
                  alt={property.seller.name || ''}
                  className="w-9 h-9 rounded-full object-cover ring-2 ring-white shadow-sm flex-shrink-0"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center ring-2 ring-white shadow-sm flex-shrink-0">
                  <span className="text-white font-bold text-xs select-none">
                    {property.seller?.name?.trim().split(/\s+/).map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || '?'}
                  </span>
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="font-bold text-sm text-neutral-900 truncate leading-tight">{property.seller?.name}</p>
                <p className="text-xs text-neutral-500 leading-tight">{t('property:seller.moreFromAgent', 'More listings from this agent')} ✨</p>
              </div>
              <button
                type="button"
                onClick={() => setShowAgentPreview(false)}
                aria-label={t('common:actions.close', 'Close')}
                className="p-1.5 rounded-full text-neutral-400 hover:text-neutral-600 hover:bg-white/70 transition-colors flex-shrink-0"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            </div>

            {otherAgentProperties.length > 0 ? (
              <div className="flex gap-3 overflow-x-auto p-3 snap-x snap-mandatory">
                {otherAgentProperties.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setShowAgentPreview(false);
                      navigate(`/property/${generatePropertySlug(p)}`);
                    }}
                    className="flex-shrink-0 w-32 snap-start text-left rounded-xl border border-neutral-100 hover:border-blue-300 hover:shadow-md transition-all overflow-hidden bg-white"
                  >
                    <div className="w-32 h-20 bg-neutral-100 flex items-center justify-center overflow-hidden">
                      {p.images?.[0]?.url ? (
                        <img
                          src={optimizeCloudinaryUrl(p.images[0].url, { width: 160, quality: 'auto', crop: 'fill' })}
                          alt={p.title}
                          loading="lazy"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <HomeIcon className="w-6 h-6 text-neutral-300" />
                      )}
                    </div>
                    <div className="p-2">
                      <p className="text-xs font-bold text-neutral-900 truncate">{formatPrice(p.price, p.country)}</p>
                      <p className="text-[11px] text-neutral-500 truncate">{p.title}</p>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-neutral-500 py-6 px-4 text-center">
                {t('property:seller.noOtherListings', 'No other active listings right now')}
              </p>
            )}

            <button
              type="button"
              onClick={() => { setShowAgentPreview(false); handleSellerProfileClick(); }}
              className="w-full flex items-center justify-center gap-1.5 py-3 text-sm font-semibold text-blue-600 hover:bg-blue-50 border-t border-neutral-100 transition-colors"
            >
              {t('property:seller.viewFullProfile', 'View full profile')} →
            </button>
          </div>
        </>
      )}

      {/* Animation styles */}
      <style>{`
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .animate-slide-up {
          animation: slide-up 0.6s ease-out forwards;
          opacity: 0;
        }
        @keyframes avatar-ring {
          0%   { box-shadow: 0 0 0 0 rgba(59,130,246,0.45); }
          60%  { box-shadow: 0 0 0 7px rgba(59,130,246,0); }
          100% { box-shadow: 0 0 0 0 rgba(59,130,246,0); }
        }
        .avatar-ring-pulse {
          animation: avatar-ring 2.2s ease-out infinite;
          border-radius: 9999px;
          pointer-events: none;
        }
        @keyframes pop-in {
          0%   { opacity: 0; transform: scale(0.9) translateY(8px); }
          60%  { opacity: 1; transform: scale(1.02) translateY(-2px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        .animate-pop-in {
          animation: pop-in 0.28s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
        @keyframes backdrop-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        .animate-backdrop-in {
          animation: backdrop-in 0.2s ease-out forwards;
        }
      `}</style>

      {/* Spacer so sticky bar doesn't overlap footer on mobile */}
      {!isOwner && property.status !== 'sold' && <div className="h-20 lg:hidden" />}

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default PropertyDetailsPage;

