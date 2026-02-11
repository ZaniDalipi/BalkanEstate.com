import React, { useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Property, PropertyImageTag } from '@/types';
import {
    PropertyGallery,
    PropertyInfo,
    PropertyPhotos,
    PropertyMapLink,
} from '@/src/components/property';
import RentalTermsSection from '@/src/features/rental/components/RentalTermsSection';
import ImageViewerModal from '@/src/features/property-details/components/ImageViewerModal';
import FloorPlanViewerModal from '@/src/features/property-details/components/FloorPlanViewerModal';

interface ListingPreviewProps {
    property: Property;
    isSubmitting: boolean;
    wantToPromote: boolean;
    isEditing: boolean;
    onBack: () => void;
    onPublish: (e: React.FormEvent) => void;
}

const ListingPreview: React.FC<ListingPreviewProps> = ({
    property,
    isSubmitting,
    wantToPromote,
    isEditing,
    onBack,
    onPublish,
}) => {
    const { t } = useTranslation(['newListing', 'seller', 'rental', 'property', 'common']);

    // Gallery state
    const [activeCategory, setActiveCategory] = useState<PropertyImageTag | 'all'>('all');
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [isViewerOpen, setIsViewerOpen] = useState(false);
    const [isFloorPlanOpen, setIsFloorPlanOpen] = useState(false);

    const allImages = useMemo(() => {
        const imgs = property.images || [];
        const mainImage = { url: property.imageUrl, tag: 'exterior' as PropertyImageTag };
        const combined = [mainImage, ...imgs];
        return combined.filter((v, i, a) => a.findIndex(item => item.url === v.url) === i);
    }, [property.imageUrl, property.images]);

    const imagesForCurrentCategory = useMemo(() => {
        if (activeCategory === 'all') return allImages;
        return allImages.filter(img => img.tag === activeCategory);
    }, [activeCategory, allImages]);

    const handleCategorySelect = useCallback((tag: PropertyImageTag | 'all') => {
        setActiveCategory(tag);
        setCurrentImageIndex(0);
    }, []);

    const handleImageSelect = useCallback((index: number) => {
        setCurrentImageIndex(index);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, []);

    const handlePublishClick = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        onPublish(e as unknown as React.FormEvent);
    }, [onPublish]);

    return (
        <div className="bg-neutral-50 min-h-screen animate-fade-in">
            {/* Image viewer modal */}
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

            {/* Preview Banner */}
            <div className="sticky top-0 z-20 bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg">
                <div className="max-w-screen-xl mx-auto px-3 sm:px-4 md:px-6 py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                        <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        <span className="font-semibold text-sm sm:text-base truncate">
                            {t('seller:createListing.preview.banner', 'Preview Mode')}
                        </span>
                        <span className="hidden sm:inline text-white/80 text-sm">
                            — {t('seller:createListing.preview.bannerHint', 'Review your listing before publishing')}
                        </span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                            type="button"
                            onClick={onBack}
                            className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold bg-white/20 hover:bg-white/30 rounded-lg transition-colors backdrop-blur-sm"
                        >
                            {t('seller:createListing.preview.editListing', 'Edit Listing')}
                        </button>
                        <button
                            type="button"
                            onClick={handlePublishClick}
                            disabled={isSubmitting}
                            className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-bold bg-white text-amber-600 hover:bg-amber-50 rounded-lg transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSubmitting
                                ? t('seller:createListing.buttons.saving', 'Saving...')
                                : isEditing
                                    ? t('seller:createListing.buttons.updateListing', 'Update Listing')
                                    : wantToPromote
                                        ? t('seller:createListing.buttons.continueToPayment', 'Continue to Payment')
                                        : t('seller:createListing.buttons.publishListing', 'Publish Listing')
                            }
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Preview Content */}
            <main className="max-w-screen-xl mx-auto p-3 sm:p-4 md:p-6 lg:p-8">
                <div className="space-y-6 sm:space-y-8 lg:space-y-10">
                    {/* Image Gallery */}
                    {allImages.length > 0 && (
                        <div>
                            <PropertyGallery
                                property={property}
                                onOpenEditor={() => {}}
                                onOpenViewer={() => setIsViewerOpen(true)}
                                activeCategory={activeCategory}
                                currentImageIndex={currentImageIndex}
                                onCategoryChange={handleCategorySelect}
                                onImageIndexChange={setCurrentImageIndex}
                            />
                        </div>
                    )}

                    {/* Photo Thumbnails */}
                    {allImages.length > 1 && (
                        <div>
                            <PropertyPhotos
                                property={property}
                                activeCategory={activeCategory}
                                currentImageIndex={currentImageIndex}
                                onCategorySelect={handleCategorySelect}
                                onImageSelect={handleImageSelect}
                            />
                        </div>
                    )}

                    {/* Property Info */}
                    <PropertyInfo
                        property={property}
                        onOpenFloorPlan={() => setIsFloorPlanOpen(true)}
                    />

                    {/* Rental Terms (only for rental properties) */}
                    {property.listingType === 'rent' && (
                        <RentalTermsSection property={property} />
                    )}

                    {/* Map Link */}
                    {property.lat !== 0 && property.lng !== 0 && (
                        <PropertyMapLink
                            property={property}
                            onNavigateToMap={() => {}}
                        />
                    )}
                </div>

                {/* Bottom action bar */}
                <div className="sticky bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-neutral-200 mt-8 -mx-3 sm:-mx-4 md:-mx-6 lg:-mx-8 px-3 sm:px-4 md:px-6 lg:px-8 py-3 sm:py-4 shadow-[0_-4px_12px_rgba(0,0,0,0.08)]">
                    <div className="max-w-screen-xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
                        <p className="text-sm text-neutral-500 text-center sm:text-left">
                            {t('seller:createListing.preview.satisfied', 'Satisfied with your listing?')}
                        </p>
                        <div className="flex items-center gap-3 w-full sm:w-auto">
                            <button
                                type="button"
                                onClick={onBack}
                                className="flex-1 sm:flex-none px-5 py-2.5 text-sm font-semibold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-colors border border-neutral-300"
                            >
                                {t('seller:createListing.preview.goBackEdit', 'Go Back & Edit')}
                            </button>
                            <button
                                type="button"
                                onClick={handlePublishClick}
                                disabled={isSubmitting}
                                className="flex-1 sm:flex-none px-5 py-2.5 text-sm font-bold text-white bg-primary hover:bg-primary-dark rounded-lg transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSubmitting
                                    ? t('seller:createListing.buttons.saving', 'Saving...')
                                    : isEditing
                                        ? t('seller:createListing.buttons.updateListing', 'Update Listing')
                                        : wantToPromote
                                            ? t('seller:createListing.buttons.continueToPayment', 'Continue to Payment')
                                            : t('seller:createListing.buttons.publishListing', 'Publish Listing')
                                }
                            </button>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default ListingPreview;
