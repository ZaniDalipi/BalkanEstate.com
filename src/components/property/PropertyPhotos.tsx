// PropertyPhotos Component
// Photo gallery with category filters and thumbnails

import React, { useMemo } from 'react';
import { Property, PropertyImageTag } from '../../../types';
import { Thumbnail } from './PropertyCommon';

interface PropertyPhotosProps {
  property: Property;
  activeCategory: PropertyImageTag | 'all';
  currentImageIndex: number;
  onCategorySelect: (tag: PropertyImageTag | 'all') => void;
  onImageSelect: (index: number) => void;
}

/**
 * PropertyPhotos Component
 *
 * Photo gallery section with:
 * - Category filter buttons (All, Exterior, Interior, etc.)
 * - Thumbnail grid
 * - Active image highlighting
 *
 * Usage:
 * ```tsx
 * <PropertyPhotos
 *   property={property}
 *   activeCategory={activeCategory}
 *   currentImageIndex={currentIndex}
 *   onCategorySelect={setActiveCategory}
 *   onImageSelect={setCurrentIndex}
 * />
 * ```
 */
export const PropertyPhotos: React.FC<PropertyPhotosProps> = ({
  property,
  activeCategory,
  currentImageIndex,
  onCategorySelect,
  onImageSelect,
}) => {
  // Combine all images with main image
  const allImages = useMemo(() => {
    const images = property.images || [];
    const mainImage = { url: property.imageUrl, tag: 'exterior' as PropertyImageTag };
    const combined = [mainImage, ...images];
    return combined.filter((v, i, a) => a.findIndex((t) => t.url === v.url) === i);
  }, [property.imageUrl, property.images]);

  // Categorize images by tag
  const categorizedImages = useMemo(() => {
    return allImages.reduce((acc, img) => {
      const tag = img.tag || 'other';
      if (!acc[tag]) {
        acc[tag] = [];
      }
      acc[tag].push(img);
      return acc;
    }, {} as Record<PropertyImageTag, { url: string; tag: PropertyImageTag }[]>);
  }, [allImages]);

  // Get images for current category
  const imagesForCurrentCategory = useMemo(() => {
    if (activeCategory === 'all') {
      return allImages;
    }
    return categorizedImages[activeCategory] || [];
  }, [activeCategory, allImages, categorizedImages]);

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg border border-neutral-200">
      <h3 className="text-lg sm:text-xl font-bold text-neutral-800 mb-4">Photos</h3>

      {/* Category Filters */}
      <div className="flex flex-wrap gap-2 border-b border-neutral-200 pb-4 mb-4">
        <button
          onClick={() => onCategorySelect('all')}
          className={`px-4 py-2 text-sm font-semibold rounded-full transition-colors ${
            activeCategory === 'all'
              ? 'bg-primary text-white'
              : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
          }`}
        >
          All
        </button>
        {Object.keys(categorizedImages).map((tag) => (
          <button
            key={tag}
            onClick={() => onCategorySelect(tag as PropertyImageTag)}
            className={`capitalize px-4 py-2 text-sm font-semibold rounded-full transition-colors ${
              activeCategory === tag
                ? 'bg-primary text-white'
                : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
            }`}
          >
            {tag.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Thumbnail Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {imagesForCurrentCategory.map((img, index) => (
          <Thumbnail
            key={img.url}
            src={img.url}
            alt={`${property.address} - ${img.tag} ${index + 1}`}
            isActive={index === currentImageIndex}
            onClick={() => onImageSelect(index)}
          />
        ))}
      </div>
    </div>
  );
};
