// PropertyDetailsPage - Main Component
// Orchestrates all property detail subcomponents

import React, { useState, useEffect, useCallback } from 'react';
import { Property, PropertyImageTag } from '../../../types';
import { useAppContext } from '../../../context/AppContext';
import { ArrowLeftIcon } from '../../../constants';
import ImageViewerModal from '../Modals/ImageViewerModal';
import FloorPlanViewerModal from '../Modals/FloorPlanViewerModal';
import FeaturedAgencies from '../../FeaturedAgencies';
import {
  ImageEditorModal,
  PropertyGallery,
  PropertyInfo,
  PropertyContact,
  PropertyPhotos,
  PropertyMapLink,
  NeighborhoodInsights,
} from '../../../src/components/property';

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
  const { state, dispatch, createConversation, toggleSavedHome } = useAppContext();

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
    if (daysListed === 0) return 'Listed today';
    if (daysListed === 1) return 'Listed yesterday';
    if (daysListed < 7) return `Listed ${daysListed} days ago`;
    if (daysListed < 30) return `Listed ${Math.floor(daysListed / 7)} week${Math.floor(daysListed / 7) > 1 ? 's' : ''} ago`;
    return `Listed ${Math.floor(daysListed / 30)} month${Math.floor(daysListed / 30) > 1 ? 's' : ''} ago`;
  }, [daysListed]);

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
      } catch (error) {
        console.error('Failed to toggle saved home:', error);
        alert('Failed to save property. Please try again.');
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
    } catch (error) {
      alert('Failed to start conversation. Please try again.');
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

  const handleCategorySelect = useCallback((tag: PropertyImageTag | 'all') => {
    window.scrollTo(0, 0);
    setActiveCategory(tag);
    setCurrentImageIndex(0);
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

  return (
    <div className="bg-neutral-50 h-full overflow-y-auto animate-fade-in">
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

      {/* Copied Toast */}
      {showCopiedToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-neutral-800 text-white px-4 py-2 rounded-lg shadow-lg text-sm font-medium animate-fade-in">
          Link copied to clipboard
        </div>
      )}

      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm shadow-sm sticky top-0 z-10">
        <div className="p-4 flex items-center justify-between">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 text-primary font-semibold hover:underline"
            aria-label="Go back to search results"
          >
            <ArrowLeftIcon className="w-5 h-5" />
            Back
          </button>

          <div className="flex items-center gap-2">
            {/* Share Button */}
            <button
              onClick={handleShare}
              className="bg-white p-2 rounded-full border border-neutral-200 cursor-pointer hover:shadow-md hover:border-primary/30 transition-all"
              aria-label="Share this property"
              title="Share"
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
                {property.views.toLocaleString()} views
              </span>
            )}
          </div>
        )}
      </div>

      {/* Main Content */}
      <main className="max-w-screen-xl mx-auto p-3 sm:p-4 md:p-6 lg:p-8 overflow-x-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
          {/* Left Column - Property Details */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-6 lg:space-y-8">
            {/* Image Gallery */}
            <div className="animate-slide-up" style={{ animationDelay: '0ms' }}>
              <PropertyGallery
                property={property}
                onOpenEditor={(url) => setIsEditorOpen(true)}
                onOpenViewer={() => setIsViewerOpen(true)}
              />
            </div>

            {/* 360 Virtual Tour */}
            {property.virtualTour360Url && (
              <div className="bg-white rounded-xl shadow-lg border border-neutral-200 overflow-hidden">
                <div className="p-4 border-b border-neutral-200 bg-gradient-to-r from-purple-50 to-pink-50">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg">
                      <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                        <path d="M2 12h20" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-neutral-800">360° Virtual Tour</h3>
                      <p className="text-sm text-neutral-600">Explore this property in immersive 360°</p>
                    </div>
                  </div>
                </div>
                <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                  <iframe
                    src={property.virtualTour360Url}
                    className="absolute top-0 left-0 w-full h-full border-0"
                    allowFullScreen
                    loading="lazy"
                    allow="xr-spatial-tracking; gyroscope; accelerometer"
                    title="360 Virtual Tour"
                  />
                </div>
                <div className="p-3 bg-neutral-50 border-t border-neutral-200">
                  <a
                    href={property.virtualTour360Url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-purple-600 hover:text-purple-800 font-medium flex items-center gap-1"
                  >
                    <span>Open in new tab for full experience</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </div>
              </div>
            )}

            {/* Property Info */}
            <div className="animate-slide-up" style={{ animationDelay: '100ms' }}>
              <PropertyInfo property={property} onOpenFloorPlan={() => setIsFloorPlanOpen(true)} />
            </div>

            {/* Photo Thumbnails */}
            <div className="animate-slide-up" style={{ animationDelay: '200ms' }}>
              <PropertyPhotos
                property={property}
                activeCategory={activeCategory}
                currentImageIndex={currentImageIndex}
                onCategorySelect={handleCategorySelect}
                onImageSelect={setCurrentImageIndex}
              />
            </div>

            {/* Map Link */}
            <div className="animate-slide-up" style={{ animationDelay: '300ms' }}>
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
              <h3 className="text-xl sm:text-2xl font-bold text-neutral-800 mb-3 sm:mb-4">Featured Agencies</h3>
              <FeaturedAgencies />
            </div>
          </div>

          {/* Right Column - Contact Sidebar */}
          <div className="lg:col-span-1 animate-slide-up" style={{ animationDelay: '150ms' }}>
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
    </div>
  );
};

export default PropertyDetailsPage;
