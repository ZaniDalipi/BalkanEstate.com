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
import { Button } from '@/components/ui/liquid-glass-button';

interface ListingPreviewProps {
    property: Property;
    isSubmitting: boolean;
    isCompressing: boolean;
    isUploading: boolean;
    uploadProgress: number;
    wantToPromote: boolean;
    isEditing: boolean;
    onBack: () => void;
    onPublish: (e: React.FormEvent) => void;
}

const ListingPreview: React.FC<ListingPreviewProps> = ({
    property,
    isSubmitting,
    isCompressing,
    isUploading,
    uploadProgress,
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

    const isProcessing = isSubmitting || isCompressing || isUploading;

    return (
        <div className="liquid-glass-bg min-h-screen animate-fade-in">
            {/* Full-screen submission overlay */}
            {isProcessing && (
                <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}>
                    <div className="bg-white/90 backdrop-blur-xl rounded-3xl p-8 sm:p-10 shadow-2xl border border-white/50 max-w-sm w-full mx-4 text-center">
                        {/* Animated spinner */}
                        <div className="relative w-20 h-20 mx-auto mb-6">
                            <div className="absolute inset-0 rounded-full border-4 border-gray-200" />
                            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-500 border-r-blue-400 animate-spin" />
                            {isUploading && (
                                <div className="absolute inset-2 flex items-center justify-center">
                                    <span className="text-sm font-bold text-blue-600">{Math.round(uploadProgress)}%</span>
                                </div>
                            )}
                            {!isUploading && (
                                <div className="absolute inset-2 flex items-center justify-center">
                                    <svg className="w-8 h-8 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                        {isCompressing ? (
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                                        ) : (
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
                                        )}
                                    </svg>
                                </div>
                            )}
                        </div>

                        {/* Status text */}
                        <h3 className="text-lg font-bold text-gray-900 mb-2">
                            {isCompressing && t('seller:createListing.progress.compressing', 'Compressing images...')}
                            {isUploading && t('seller:createListing.progress.uploading', 'Uploading to cloud...')}
                            {isSubmitting && !isUploading && !isCompressing && t('seller:createListing.progress.creating', 'Creating listing...')}
                        </h3>
                        <p className="text-sm text-gray-500 mb-5">
                            {isCompressing && t('seller:createListing.progress.compressingHint', 'Optimizing your images for the best quality...')}
                            {isUploading && t('seller:createListing.progress.uploadingHint', 'Securely uploading your photos...')}
                            {isSubmitting && !isUploading && !isCompressing && t('seller:createListing.progress.creatingHint', 'Almost there! Saving your listing...')}
                        </p>

                        {/* Progress bar */}
                        {isUploading && (
                            <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                                <div
                                    className="bg-gradient-to-r from-blue-500 via-blue-400 to-cyan-400 h-2.5 rounded-full transition-all duration-500 ease-out"
                                    style={{ width: `${uploadProgress}%` }}
                                />
                            </div>
                        )}
                        {!isUploading && (
                            <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                                <div className="bg-gradient-to-r from-blue-500 via-blue-400 to-cyan-400 h-2.5 rounded-full animate-pulse w-2/3" />
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Floating orbs */}
            <div className="glass-orb w-64 h-64 bg-blue-200/30 top-20 -left-10" />
            <div className="glass-orb w-80 h-80 bg-purple-200/20 bottom-40 right-0" style={{ animationDelay: '-7s' }} />

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
            <div className="sticky top-0 z-20" style={{ background: 'linear-gradient(135deg, rgba(0,122,255,0.9), rgba(88,86,214,0.85))', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.2)' }}>
                <div className="max-w-screen-xl mx-auto px-3 sm:px-4 md:px-6 py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                        <svg className="w-5 h-5 flex-shrink-0 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        <span className="font-semibold text-sm sm:text-base truncate text-white">
                            {t('seller:createListing.preview.banner', 'Preview Mode')}
                        </span>
                        <span className="hidden sm:inline text-white/60 text-sm">
                            — {t('seller:createListing.preview.bannerHint', 'Review your listing before publishing')}
                        </span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                        <Button
                            variant="glass"
                            size="sm"
                            onClick={onBack}
                            className="font-semibold rounded-xl"
                        >
                            {t('seller:createListing.preview.editListing', 'Edit Listing')}
                        </Button>
                        <Button
                            variant="cool"
                            size="sm"
                            onClick={handlePublishClick}
                            disabled={isSubmitting}
                            className="font-bold rounded-xl"
                        >
                            {isSubmitting
                                ? t('seller:createListing.buttons.saving', 'Saving...')
                                : isEditing
                                    ? t('seller:createListing.buttons.updateListing', 'Update Listing')
                                    : wantToPromote
                                        ? t('seller:createListing.buttons.continueToPayment', 'Continue to Payment')
                                        : t('seller:createListing.buttons.publishListing', 'Publish Listing')
                            }
                        </Button>
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
                <div className="sticky bottom-0 left-0 right-0 mt-8 -mx-3 sm:-mx-4 md:-mx-6 lg:-mx-8 px-3 sm:px-4 md:px-6 lg:px-8 py-3 sm:py-4" style={{ background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderTop: '1px solid rgba(0,0,0,0.06)' }}>
                    <div className="max-w-screen-xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
                        <p className="text-sm text-gray-500 text-center sm:text-left">
                            {t('seller:createListing.preview.satisfied', 'Satisfied with your listing?')}
                        </p>
                        <div className="flex items-center gap-3 w-full sm:w-auto">
                            <Button
                                variant="glass"
                                onClick={onBack}
                                className="flex-1 sm:flex-none font-semibold rounded-xl"
                            >
                                {t('seller:createListing.preview.goBackEdit', 'Go Back & Edit')}
                            </Button>
                            <Button
                                variant="cool"
                                onClick={handlePublishClick}
                                disabled={isSubmitting}
                                className="flex-1 sm:flex-none font-bold rounded-xl"
                            >
                                {isSubmitting
                                    ? t('seller:createListing.buttons.saving', 'Saving...')
                                    : isEditing
                                        ? t('seller:createListing.buttons.updateListing', 'Update Listing')
                                        : wantToPromote
                                            ? t('seller:createListing.buttons.continueToPayment', 'Continue to Payment')
                                            : t('seller:createListing.buttons.publishListing', 'Publish Listing')
                                }
                            </Button>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default ListingPreview;
