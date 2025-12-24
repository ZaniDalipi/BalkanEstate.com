import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Property } from '../../../types';
import HighlightedPropertyCard from './HighlightedPropertyCard';

interface HighlightedPropertiesSectionProps {
  properties: Property[];
  showToast?: (message: string, type: 'success' | 'error') => void;
}

// Priority scores for sorting
const TIER_PRIORITY: Record<string, number> = {
  premium: 100,
  highlight: 70,
  featured: 40,
  standard: 10,
};

const HighlightedPropertiesSection: React.FC<HighlightedPropertiesSectionProps> = ({
  properties,
  showToast,
}) => {
  const { t } = useTranslation(['property']);

  // Filter and sort highlighted properties
  const highlightedProperties = useMemo(() => {
    const now = Date.now();
    const currentHour = new Date().getHours();

    // Filter only actively promoted properties
    const promoted = properties.filter(p =>
      p.isPromoted &&
      p.promotionEndDate &&
      p.promotionEndDate > now
    );

    // Sort by tier priority, then by rotation based on hour
    return promoted
      .sort((a, b) => {
        const tierA = a.promotionTier || 'standard';
        const tierB = b.promotionTier || 'standard';
        const priorityA = TIER_PRIORITY[tierA] || 0;
        const priorityB = TIER_PRIORITY[tierB] || 0;

        // Primary sort: by tier priority (descending)
        if (priorityA !== priorityB) {
          return priorityB - priorityA;
        }

        // Secondary sort: hourly rotation within same tier
        // Use property creation time + current hour to create rotation
        const rotationA = ((a.createdAt || 0) + currentHour) % 1000;
        const rotationB = ((b.createdAt || 0) + currentHour) % 1000;
        return rotationA - rotationB;
      })
      .slice(0, 5); // Show max 5 highlighted properties
  }, [properties]);

  if (highlightedProperties.length === 0) {
    return null;
  }

  return (
    <section className="mb-8">
      {/* Section Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex items-center gap-2">
          <span className="text-2xl">✨</span>
          <h2 className="text-xl md:text-2xl font-bold text-neutral-800">
            {t('property:sections.highlighted', 'Featured Properties')}
          </h2>
        </div>
        <div className="flex-1 h-px bg-gradient-to-r from-primary/30 to-transparent" />
        <span className="text-sm text-neutral-500 bg-primary/5 px-3 py-1 rounded-full">
          {highlightedProperties.length} {t('property:sections.highlightedCount', 'premium listings')}
        </span>
      </div>

      {/* Highlighted Properties Grid */}
      <div className="space-y-4">
        {highlightedProperties.map((property) => (
          <HighlightedPropertyCard
            key={property.id}
            property={property}
            showToast={showToast}
          />
        ))}
      </div>

      {/* Divider */}
      <div className="mt-8 mb-6 flex items-center gap-4">
        <div className="flex-1 h-px bg-neutral-200" />
        <span className="text-sm text-neutral-500 font-medium">
          {t('property:sections.moreListings', 'More Listings')}
        </span>
        <div className="flex-1 h-px bg-neutral-200" />
      </div>
    </section>
  );
};

export default HighlightedPropertiesSection;
