import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Property } from '@/types';
import { XMarkIcon, MapPinIcon } from '@/constants';
import { formatPrice } from '@/utils/currency';
import { generatePropertySlug } from '@/utils/slug';
import { buildLocalizedPath } from '@/src/utils/languageRouting';
import { optimizeCloudinaryUrl } from '@/config/cloudinaryConfig';

interface SimilarPropertiesInterestDialogProps {
  isOpen: boolean;
  onClose: () => void;
  property: Property;
  similarProperties?: Property[];
  onPropertyClick?: (property: Property) => void;
}

const SimilarPropertiesInterestDialog: React.FC<SimilarPropertiesInterestDialogProps> = ({
  isOpen,
  onClose,
  property,
  similarProperties = [],
  onPropertyClick,
}) => {
  const { t } = useTranslation(['property', 'common']);
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());

  // Validate and filter similar properties
  const validSimilarProperties = useMemo(() => {
    if (!Array.isArray(similarProperties)) {
      console.warn('SimilarPropertiesInterestDialog: similarProperties is not an array');
      return [];
    }
    return similarProperties.filter(p => p?.id && p?.imageUrl && p.id !== property?.id).slice(0, 3);
  }, [similarProperties, property?.id]);

  if (!isOpen || validSimilarProperties.length === 0) return null;

  const handlePropertyClick = (similarProperty: Property) => {
    if (!similarProperty?.id) {
      console.error('SimilarPropertiesInterestDialog: Invalid property for navigation');
      return;
    }

    try {
      const propertyUrl = buildLocalizedPath(`/property/${generatePropertySlug(similarProperty)}`);
      if (!propertyUrl) {
        console.error('SimilarPropertiesInterestDialog: Failed to generate URL for property', similarProperty.id);
        return;
      }

      // Call callback if provided
      onPropertyClick?.(similarProperty);

      // Open in new tab
      window.open(propertyUrl, '_blank', 'noopener,noreferrer');
    } catch (error) {
      console.error('SimilarPropertiesInterestDialog: Error opening property', error);
    }
  };

  const handleImageError = (propertyId: string) => {
    setImageErrors(prev => new Set(prev).add(propertyId));
  };

  const propertyTypeLabel = t(`property:types.${property.propertyType}`, { defaultValue: t('property:property') });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-[9998] flex justify-center items-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full relative overflow-hidden max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-600 transition-colors z-10"
          aria-label="Close"
        >
          <XMarkIcon className="w-6 h-6" />
        </button>

        {/* Content */}
        <div className="p-6 sm:p-8">
          {/* Header */}
          <div className="mb-6">
            <h2 className="text-2xl sm:text-3xl font-bold text-neutral-900 mb-2">
              {t('property:interestedIn', 'Interested in similar properties?')}
            </h2>
            <p className="text-neutral-600">
              {t('property:similiarPropertiesMessage', 'We found other properties that match your interests')}
            </p>
          </div>

          {/* Similar Properties Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {validSimilarProperties.map((similarProperty) => {
              const hasImageError = imageErrors.has(similarProperty.id);
              const isRental = (similarProperty.listingType || 'sale') === 'rent';

              return (
                <div
                  key={similarProperty.id}
                  className="group bg-white rounded-xl border border-neutral-200 overflow-hidden hover:shadow-lg hover:border-primary/30 transition-all duration-300 cursor-pointer flex flex-col"
                  onClick={() => handlePropertyClick(similarProperty)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handlePropertyClick(similarProperty);
                    }
                  }}
                >
                  {/* Image */}
                  <div className="relative overflow-hidden bg-neutral-200 aspect-[4/3]">
                    {hasImageError ? (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-neutral-100 to-neutral-200">
                        <svg className="w-8 h-8 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    ) : (
                      <img
                        src={optimizeCloudinaryUrl(similarProperty.imageUrl, { width: 400, height: 300, quality: 'auto', crop: 'fill' })}
                        alt={similarProperty.title || propertyTypeLabel}
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={() => handleImageError(similarProperty.id)}
                      />
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-4 flex flex-col flex-grow">
                    {/* Price */}
                    <div className="mb-2">
                      <p className="text-primary font-bold text-lg">
                        {formatPrice(similarProperty.price, similarProperty.country)}
                        {isRental && <span className="text-xs font-normal text-neutral-500">/{t('common:mo', 'mo')}</span>}
                      </p>
                    </div>

                    {/* Title */}
                    {similarProperty.title && (
                      <h3 className="text-sm font-semibold text-neutral-900 mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                        {similarProperty.title}
                      </h3>
                    )}

                    {/* Location */}
                    <div className="flex items-center gap-1 mb-3 text-xs text-neutral-600">
                      <MapPinIcon className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                      <span className="truncate">{similarProperty.city}, {similarProperty.country}</span>
                    </div>

                    {/* Features */}
                    <div className="flex gap-2 text-xs text-neutral-600 flex-wrap">
                      {similarProperty.beds > 0 && (
                        <span className="bg-neutral-100 px-2 py-1 rounded">
                          {similarProperty.beds} {t('property:features.bedrooms')}
                        </span>
                      )}
                      {similarProperty.baths > 0 && (
                        <span className="bg-neutral-100 px-2 py-1 rounded">
                          {similarProperty.baths} {t('property:features.bathrooms')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={onClose}
              className="px-6 py-3 rounded-lg bg-neutral-100 text-neutral-800 font-semibold hover:bg-neutral-200 transition-colors duration-200"
            >
              {t('common:close', 'Close')}
            </button>
            <button
              onClick={() => {
                if (validSimilarProperties.length > 0) {
                  handlePropertyClick(validSimilarProperties[0]);
                  onClose();
                }
              }}
              className="px-6 py-3 rounded-lg bg-primary text-white font-semibold hover:bg-primary-dark transition-colors duration-200"
            >
              {t('property:viewFirstProperty', 'View First Property')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SimilarPropertiesInterestDialog;
