import React, { useMemo } from 'react';
import { Property } from '@/types';
import { useAppContext } from '@/context/AppContext';
import PropertyCard from '@/src/features/property-details/components/PropertyCard';
import { useTranslation } from 'react-i18next';

interface SimilarPropertiesProps {
  property: Property;
  maxItems?: number;
}

/**
 * SimilarProperties - Internal linking component for SEO
 *
 * Shows properties similar to the current listing based on:
 * 1. Same city (highest priority)
 * 2. Same country + property type
 * 3. Similar price range (±30%)
 *
 * Internal links between property pages are a critical SEO signal
 * that professional platforms like Zillow/Redfin use extensively.
 */
const SimilarProperties: React.FC<SimilarPropertiesProps> = ({ property, maxItems = 4 }) => {
  const { t } = useTranslation(['property']);
  const { state } = useAppContext();

  const similarProperties = useMemo(() => {
    if (!state.properties?.length) return [];

    const priceLow = property.price * 0.7;
    const priceHigh = property.price * 1.3;

    // Score each property for similarity
    const scored = state.properties
      .filter(p => p.id !== property.id && p.status === 'active')
      .map(p => {
        let score = 0;

        // Same city is the strongest signal
        if (p.city === property.city) score += 50;

        // Same country
        if (p.country === property.country) score += 20;

        // Same property type
        if (p.propertyType === property.propertyType) score += 15;

        // Same listing type (sale/rent)
        if (p.listingType === property.listingType) score += 10;

        // Similar price range
        if (p.price >= priceLow && p.price <= priceHigh) score += 10;

        // Similar size (±30%)
        if (property.beds > 0 && Math.abs(p.beds - property.beds) <= 1) score += 5;

        return { property: p, score };
      })
      .filter(s => s.score >= 30) // Minimum relevance threshold
      .sort((a, b) => b.score - a.score)
      .slice(0, maxItems)
      .map(s => s.property);

    return scored;
  }, [state.properties, property.id, property.city, property.country, property.propertyType, property.listingType, property.price, property.beds, maxItems]);

  if (similarProperties.length === 0) return null;

  const isRental = property.listingType === 'rent';

  return (
    <section aria-label="Similar properties">
      <h2 className="text-xl sm:text-2xl font-bold text-neutral-800 mb-3 sm:mb-4">
        {isRental
          ? t('property:similarProperties.titleRent', 'Similar Rentals in {{city}}', { city: property.city })
          : t('property:similarProperties.title', 'Similar Properties in {{city}}', { city: property.city })}
      </h2>
      <p className="text-sm text-neutral-500 mb-4">
        {t('property:similarProperties.subtitle', 'Browse more {{type}} for {{action}} in {{city}}, {{country}}', {
          type: property.propertyType || 'properties',
          action: isRental ? 'rent' : 'sale',
          city: property.city,
          country: property.country,
        })}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {similarProperties.map(p => (
          <PropertyCard key={p.id} property={p} />
        ))}
      </div>
    </section>
  );
};

export default SimilarProperties;
