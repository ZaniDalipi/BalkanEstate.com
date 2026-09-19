// PropertyPhotos Component
// Photo gallery with category filters and thumbnails

import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Property, PropertyImageTag } from '../../../types';
import { PhotoThumbnail } from './PhotoThumbnail';

/**
 * Tile sizing for the grid below: 3 columns on a phone, 4 from `sm`, 5 from
 * `lg`, inside a padded card. The candidates are 1x/2x/3x of the widest a tile
 * gets, so a high-DPR phone is not handed a file it has to stretch.
 */
const TILE_MAX_WIDTH = 220;
const TILE_WIDTHS = [TILE_MAX_WIDTH, TILE_MAX_WIDTH * 2, TILE_MAX_WIDTH * 3];
const TILE_SIZES = `(max-width: 640px) 30vw, (max-width: 1024px) 23vw, ${TILE_MAX_WIDTH}px`;

// Category emoji map
const categoryEmojis: Record<string, string> = {
  all: '📷',
  exterior: '🏠',
  interior: '🛋️',
  bedroom: '🛏️',
  bathroom: '🚿',
  kitchen: '🍳',
  living_room: '🛋️',
  garden: '🌳',
  pool: '🏊',
  view: '🌅',
  other: '📸',
};

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
  const { t } = useTranslation(['property']);

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

  // Track which image is being hovered
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  return (
    <div className="relative bg-white/80 backdrop-blur-xl p-4 sm:p-6 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.08)] border border-white/60 overflow-hidden">
      {/* Glass effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-transparent to-transparent pointer-events-none" />
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/80 to-transparent" />

      <div className="relative">
        {/* Header with title and image count */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg sm:text-xl font-bold text-neutral-800">{t('photos.title')}</h3>
          <span className="text-xs font-medium text-neutral-500 bg-neutral-100 px-2 py-1 rounded-full">
            {imagesForCurrentCategory.length} {t('photos.images', { count: imagesForCurrentCategory.length })}
          </span>
        </div>

        {/* Category Filters - Horizontal scroll on mobile */}
        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 pb-2 scrollbar-hide">
          <div className="flex gap-2 border-b border-neutral-200/50 pb-4 mb-4 min-w-max sm:flex-wrap sm:min-w-0">
            <button
              onClick={() => onCategorySelect('all')}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-semibold rounded-full transition-all duration-200 whitespace-nowrap ${
                activeCategory === 'all'
                  ? 'bg-primary text-white shadow-md shadow-primary/25 scale-105'
                  : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200 hover:scale-102'
              }`}
            >
              <span>{categoryEmojis.all}</span>
              <span>{t('photos.all')}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                activeCategory === 'all' ? 'bg-white/20' : 'bg-neutral-200'
              }`}>
                {allImages.length}
              </span>
            </button>
            {Object.keys(categorizedImages).map((tag) => (
              <button
                key={tag}
                onClick={() => onCategorySelect(tag as PropertyImageTag)}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-semibold rounded-full transition-all duration-200 whitespace-nowrap ${
                  activeCategory === tag
                    ? 'bg-primary text-white shadow-md shadow-primary/25 scale-105'
                    : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200 hover:scale-102'
                }`}
              >
                <span>{categoryEmojis[tag] || '📷'}</span>
                <span>{t(`photos.categories.${tag}`, { defaultValue: tag.replace('_', ' ') })}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                  activeCategory === tag ? 'bg-white/20' : 'bg-neutral-200'
                }`}>
                  {categorizedImages[tag as PropertyImageTag]?.length || 0}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Thumbnail Grid - Enhanced with hover effects */}
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3">
          {imagesForCurrentCategory.map((img, index) => (
            <button
              // A listing with a blank `imageUrl` keeps its slot so the indices
              // stay aligned with the gallery it drives — but it has no URL to
              // key on, and two blanks would collide.
              key={img.url || `blank-${index}`}
              onClick={() => onImageSelect(index)}
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
              // 4:3, not square: it is the shape `THUMB_FRAME_ASPECT` describes
              // and the one most listing photos already arrive in, so it is what
              // leaves the fewest of them with bars to fill.
              className={`group relative aspect-[4/3] bg-neutral-900 rounded-xl overflow-hidden transition-all duration-300 ${
                index === currentImageIndex
                  ? 'ring-2 ring-primary ring-offset-2 scale-[1.02] shadow-lg z-10'
                  : hoveredIndex === index
                    ? 'ring-2 ring-primary/50 scale-[1.02] shadow-md'
                    : 'opacity-80 hover:opacity-100'
              }`}
            >
              {/* No hover zoom on the photo itself: the card is clipped, so
                  scaling the photo inside it would crop away the edges this
                  grid exists to show. The card's own ring and lift carry the
                  hover feedback instead. */}
              <PhotoThumbnail
                url={img.url}
                alt={`${property.propertyType ? property.propertyType.charAt(0).toUpperCase() + property.propertyType.slice(1) : 'Property'} ${img.tag || 'photo'} - ${property.city}, ${property.country}`}
                sizes={TILE_SIZES}
                widths={TILE_WIDTHS}
                fallbackWidth={TILE_MAX_WIDTH * 2}
                // The first two rows are on screen without scrolling.
                eager={index < 9}
              />

              {/* Active indicator overlay */}
              {index === currentImageIndex && (
                <div className="absolute inset-0 bg-primary/10 pointer-events-none">
                  <div className="absolute bottom-1 right-1 bg-primary text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                    ✓
                  </div>
                </div>
              )}

              {/* Hover overlay with "View" hint */}
              <div className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity duration-200 ${
                hoveredIndex === index && index !== currentImageIndex ? 'opacity-100' : 'opacity-0'
              }`}>
                <span className="text-white text-xs font-semibold bg-white/20 backdrop-blur-sm px-2 py-1 rounded-full">
                  👁️ {t('photos.view', 'View')}
                </span>
              </div>

              {/* Image number badge */}
              <div className="absolute top-1 left-1 bg-black/50 backdrop-blur-sm text-white text-[9px] font-medium px-1.5 py-0.5 rounded-full">
                {index + 1}
              </div>
            </button>
          ))}
        </div>

        {/* Hint text on mobile */}
        <p className="text-[10px] text-neutral-400 text-center mt-3 sm:hidden">
          {t('photos.tapToView', 'Tap to view in gallery')}
        </p>
      </div>
    </div>
  );
};
