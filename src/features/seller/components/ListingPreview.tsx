import React, { useState, useMemo, useCallback, memo } from 'react';
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
import { formatPrice } from '@/utils/currency';

interface ListingPreviewProps {
    property: Property;
    isSubmitting: boolean;
    wantToPromote: boolean;
    isEditing: boolean;
    onBack: () => void;
    onPublish: (e: React.FormEvent) => void;
}

/** Checklist item type for the listing summary */
interface ChecklistItem {
    label: string;
    value: string | number | boolean | undefined;
    status: 'complete' | 'missing' | 'optional';
}

/** Memoized details checklist to avoid re-computing on every render */
const ListingDetailsChecklist = memo<{
    property: Property;
    t: (key: string, defaultValue?: string | Record<string, unknown>, options?: Record<string, unknown>) => string;
}>(({ property, t }) => {
    const items = useMemo((): ChecklistItem[] => {
        const isRental = property.listingType === 'rent';
        const isLand = property.propertyType === 'land';

        const list: ChecklistItem[] = [
            {
                label: t('seller:createListing.preview.checklist.title', 'Listing Title'),
                value: property.title,
                status: property.title ? 'complete' : 'optional',
            },
            {
                label: t('seller:createListing.preview.checklist.price', 'Price'),
                value: property.price > 0 ? formatPrice(property.price, property.country) : undefined,
                status: property.price > 0 ? 'complete' : 'missing',
            },
            {
                label: t('seller:createListing.preview.checklist.location', 'Location'),
                value: property.city && property.country ? `${property.city}, ${property.country}` : undefined,
                status: property.city && property.country ? 'complete' : 'missing',
            },
            {
                label: t('seller:createListing.preview.checklist.address', 'Street Address'),
                value: property.address,
                status: property.address ? 'complete' : 'optional',
            },
            {
                label: t('seller:createListing.preview.checklist.propertyType', 'Property Type'),
                value: property.propertyType ? t(`seller:propertyTypes.${property.propertyType}`, property.propertyType) : undefined,
                status: property.propertyType ? 'complete' : 'missing',
            },
            {
                label: t('seller:createListing.preview.checklist.images', 'Photos'),
                value: (property.images?.length || 0) > 0 ? `${(property.images?.length || 0) + (property.imageUrl ? 1 : 0)}` : undefined,
                status: (property.images?.length || 0) > 0 || property.imageUrl ? 'complete' : 'missing',
            },
        ];

        if (!isLand) {
            list.push(
                {
                    label: t('seller:createListing.preview.checklist.bedrooms', 'Bedrooms'),
                    value: property.beds > 0 ? String(property.beds) : undefined,
                    status: property.beds > 0 ? 'complete' : 'missing',
                },
                {
                    label: t('seller:createListing.preview.checklist.bathrooms', 'Bathrooms'),
                    value: property.baths > 0 ? String(property.baths) : undefined,
                    status: property.baths > 0 ? 'complete' : 'missing',
                },
            );
        }

        list.push({
            label: t('seller:createListing.preview.checklist.area', 'Area (m\u00B2)'),
            value: property.sqft > 0 ? `${property.sqft} m\u00B2` : undefined,
            status: property.sqft > 0 ? 'complete' : 'missing',
        });

        list.push({
            label: t('seller:createListing.preview.checklist.description', 'Description'),
            value: property.description ? `${property.description.length} chars` : undefined,
            status: property.description && property.description.length > 20 ? 'complete' : property.description ? 'optional' : 'missing',
        });

        list.push({
            label: t('seller:createListing.preview.checklist.mapPin', 'Map Location'),
            value: property.lat !== 0 && property.lng !== 0 ? 'Set' : undefined,
            status: property.lat !== 0 && property.lng !== 0 ? 'complete' : 'optional',
        });

        list.push({
            label: t('seller:createListing.preview.checklist.floorplan', 'Floor Plan'),
            value: property.floorplanUrl ? 'Uploaded' : undefined,
            status: property.floorplanUrl ? 'complete' : 'optional',
        });

        list.push({
            label: t('seller:createListing.preview.checklist.virtualTour', '360\u00B0 Tour'),
            value: property.virtualTour360Url || undefined,
            status: property.virtualTour360Url ? 'complete' : 'optional',
        });

        if (isRental) {
            list.push(
                {
                    label: t('seller:createListing.preview.checklist.securityDeposit', 'Security Deposit'),
                    value: property.securityDeposit ? formatPrice(property.securityDeposit, property.country) : undefined,
                    status: property.securityDeposit ? 'complete' : 'optional',
                },
                {
                    label: t('seller:createListing.preview.checklist.availableFrom', 'Available From'),
                    value: property.availableFrom ? new Date(property.availableFrom).toLocaleDateString() : undefined,
                    status: property.availableFrom ? 'complete' : 'optional',
                },
            );
        }

        return list;
    }, [property, t]);

    const completedCount = items.filter(i => i.status === 'complete').length;
    const missingCount = items.filter(i => i.status === 'missing').length;
    const totalRequired = items.filter(i => i.status !== 'optional' || i.value).length;

    return (
        <section
            className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden"
            aria-labelledby="preview-checklist-heading"
        >
            <div className="p-4 sm:p-5 border-b border-neutral-100 bg-neutral-50/50">
                <h2 id="preview-checklist-heading" className="text-base font-bold text-neutral-800 flex items-center gap-2">
                    <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                    </svg>
                    {t('seller:createListing.preview.checklist.heading', 'Listing Details Summary')}
                </h2>
                <p className="text-sm text-neutral-500 mt-1">
                    {t('seller:createListing.preview.checklist.subtitle', '{{completed}} of {{total}} details filled', { completed: completedCount, total: totalRequired })}
                    {missingCount > 0 && (
                        <span className="text-amber-600 font-medium">
                            {' '}&mdash; {t('seller:createListing.preview.checklist.missingWarning', '{{count}} required field(s) missing', { count: missingCount })}
                        </span>
                    )}
                </p>
                {/* Progress bar */}
                <div
                    className="mt-3 w-full bg-neutral-200 rounded-full h-2"
                    role="progressbar"
                    aria-valuenow={completedCount}
                    aria-valuemin={0}
                    aria-valuemax={totalRequired}
                    aria-label={t('seller:createListing.preview.checklist.progress', 'Listing completeness: {{percent}}%', { percent: Math.round((completedCount / totalRequired) * 100) })}
                >
                    <div
                        className={`h-2 rounded-full transition-all duration-500 ${
                            missingCount > 0 ? 'bg-amber-500' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.round((completedCount / totalRequired) * 100)}%` }}
                    />
                </div>
            </div>

            <ul className="divide-y divide-neutral-100">
                {items.map((item, idx) => (
                    <li key={idx} className="flex items-center gap-3 px-4 sm:px-5 py-2.5 text-sm">
                        {/* Status icon */}
                        {item.status === 'complete' ? (
                            <svg className="w-4.5 h-4.5 text-emerald-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                        ) : item.status === 'missing' ? (
                            <svg className="w-4.5 h-4.5 text-red-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        ) : (
                            <svg className="w-4.5 h-4.5 text-neutral-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
                            </svg>
                        )}
                        <span className={`flex-1 ${item.status === 'missing' ? 'text-red-600 font-medium' : 'text-neutral-700'}`}>
                            {item.label}
                        </span>
                        <span className={`text-xs font-medium truncate max-w-[180px] ${
                            item.status === 'complete' ? 'text-neutral-500' : item.status === 'missing' ? 'text-red-400' : 'text-neutral-400'
                        }`}>
                            {item.value
                                ? (typeof item.value === 'string' && item.value.length > 30 ? item.value.slice(0, 30) + '...' : String(item.value))
                                : item.status === 'missing'
                                    ? t('seller:createListing.preview.checklist.required', 'Required')
                                    : t('seller:createListing.preview.checklist.notProvided', 'Not provided')
                            }
                        </span>
                    </li>
                ))}
            </ul>
        </section>
    );
});

ListingDetailsChecklist.displayName = 'ListingDetailsChecklist';

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

    const publishButtonLabel = isSubmitting
        ? t('seller:createListing.buttons.saving', 'Saving...')
        : isEditing
            ? t('seller:createListing.buttons.updateListing', 'Update Listing')
            : wantToPromote
                ? t('seller:createListing.buttons.continueToPayment', 'Continue to Payment')
                : t('seller:createListing.buttons.publishListing', 'Publish Listing');

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
            <div
                className="sticky top-0 z-20 bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg"
                role="banner"
                aria-label={t('seller:createListing.preview.banner', 'Preview Mode')}
            >
                <div className="max-w-screen-xl mx-auto px-3 sm:px-4 md:px-6 py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                        <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
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
                            className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold bg-white/20 hover:bg-white/30 rounded-lg transition-colors backdrop-blur-sm min-h-[44px] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
                        >
                            {t('seller:createListing.preview.editListing', 'Edit Listing')}
                        </button>
                        <button
                            type="button"
                            onClick={handlePublishClick}
                            disabled={isSubmitting}
                            className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-bold bg-white text-amber-600 hover:bg-amber-50 rounded-lg transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-600/50"
                        >
                            {publishButtonLabel}
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Preview Content */}
            <main className="max-w-screen-xl mx-auto p-3 sm:p-4 md:p-6 lg:p-8" id="preview-content">
                <div className="space-y-6 sm:space-y-8 lg:space-y-10">
                    {/* Listing Details Checklist */}
                    <ListingDetailsChecklist property={property} t={t} />

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
                <div
                    className="sticky bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-neutral-200 mt-8 -mx-3 sm:-mx-4 md:-mx-6 lg:-mx-8 px-3 sm:px-4 md:px-6 lg:px-8 py-3 sm:py-4 shadow-[0_-4px_12px_rgba(0,0,0,0.08)]"
                    role="toolbar"
                    aria-label={t('seller:createListing.preview.actions', 'Listing actions')}
                >
                    <div className="max-w-screen-xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
                        <p className="text-sm text-neutral-500 text-center sm:text-left">
                            {t('seller:createListing.preview.satisfied', 'Satisfied with your listing?')}
                        </p>
                        <div className="flex items-center gap-3 w-full sm:w-auto">
                            <button
                                type="button"
                                onClick={onBack}
                                className="flex-1 sm:flex-none px-5 py-2.5 text-sm font-semibold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-colors border border-neutral-300 min-h-[44px] focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400/50"
                            >
                                {t('seller:createListing.preview.goBackEdit', 'Go Back & Edit')}
                            </button>
                            <button
                                type="button"
                                onClick={handlePublishClick}
                                disabled={isSubmitting}
                                className="flex-1 sm:flex-none px-5 py-2.5 text-sm font-bold text-white bg-primary hover:bg-primary-dark rounded-lg transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                            >
                                {publishButtonLabel}
                            </button>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default memo(ListingPreview);
