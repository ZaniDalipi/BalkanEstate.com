import React, { useCallback, useMemo, useState } from 'react';
import type { Property, PropertyImageTag } from '@/types';
import {
  PropertyGallery,
  PropertyInfo,
  PropertyMapLink,
  PropertyPhotos,
} from '@/src/components/property';
import RentalTermsSection from '@/src/features/rental/components/RentalTermsSection';
import ImageViewerModal from '@/src/features/property-details/components/ImageViewerModal';

interface DraftListingPreviewProps {
  property: Property;
}

/**
 * The draft rendered with the shared property components — the same gallery,
 * details and map a buyer gets on the published listing (mirrors the seller
 * flow's `ListingPreview`). What the owner sees here is what they publish.
 */
const DraftListingPreview: React.FC<DraftListingPreviewProps> = ({ property }) => {
  const [activeCategory, setActiveCategory] = useState<PropertyImageTag | 'all'>('all');
  const [imageIndex, setImageIndex] = useState(0);
  const [viewerOpen, setViewerOpen] = useState(false);

  const allImages = useMemo(() => {
    const combined = [
      ...(property.imageUrl ? [{ url: property.imageUrl, tag: 'other' as PropertyImageTag }] : []),
      ...(property.images ?? []),
    ];
    return combined.filter((img, i, arr) => arr.findIndex((o) => o.url === img.url) === i);
  }, [property.imageUrl, property.images]);

  const visibleImages = useMemo(
    () => (activeCategory === 'all' ? allImages : allImages.filter((img) => img.tag === activeCategory)),
    [activeCategory, allImages]
  );

  const selectCategory = useCallback((tag: PropertyImageTag | 'all') => {
    setActiveCategory(tag);
    setImageIndex(0);
  }, []);

  // Removing photos in the editor can leave the index past the end.
  const safeIndex = imageIndex < visibleImages.length ? imageIndex : 0;

  return (
    <div className="space-y-6 sm:space-y-8">
      {viewerOpen && (
        <ImageViewerModal images={visibleImages} startIndex={safeIndex} onClose={() => setViewerOpen(false)} />
      )}

      {allImages.length > 0 && (
        <PropertyGallery
          property={property}
          onOpenEditor={() => {}}
          onOpenViewer={() => setViewerOpen(true)}
          activeCategory={activeCategory}
          currentImageIndex={safeIndex}
          onCategoryChange={selectCategory}
          onImageIndexChange={setImageIndex}
        />
      )}
      {allImages.length > 1 && (
        <PropertyPhotos
          property={property}
          activeCategory={activeCategory}
          currentImageIndex={safeIndex}
          onCategorySelect={selectCategory}
          onImageSelect={setImageIndex}
        />
      )}

      <PropertyInfo property={property} onOpenFloorPlan={() => {}} />

      {property.listingType === 'rent' && <RentalTermsSection property={property} />}

      {property.lat !== 0 && property.lng !== 0 && (
        <PropertyMapLink property={property} onNavigateToMap={() => {}} />
      )}
    </div>
  );
};

export default DraftListingPreview;
