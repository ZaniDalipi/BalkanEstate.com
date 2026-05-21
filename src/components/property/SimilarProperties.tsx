import React, { useMemo } from 'react';
import { Property } from '@/types';
import { useAppContext } from '@/context/AppContext';
import PropertyCard from '@/src/features/property-details/components/PropertyCard';
import { useTranslation } from 'react-i18next';

interface SimilarPropertiesProps {
  property: Property;
  maxItems?: number;
}

const SimilarProperties: React.FC<SimilarPropertiesProps> = ({ property, maxItems = 4 }) => {
  const { t } = useTranslation(['property']);
  const { state } = useAppContext();

  const hasAgency = !!(
    property?.seller?.type === 'agent' &&
    (property.seller.agencyId || property.seller.agencyName)
  );

  // Agency listings: other active properties listed by the same agency
  const agencyProperties = useMemo(() => {
    if (!hasAgency || !state.properties?.length) return [];

    try {
      return state.properties
        .filter(p => {
          if (!p?.id || p.id === property.id) return false;
          if (p.status !== 'active') return false;
          if (p.seller?.type !== 'agent') return false;
          // Match by agencyId first, fall back to agencyName
          if (property.seller.agencyId && p.seller?.agencyId) {
            return p.seller.agencyId === property.seller.agencyId;
          }
          if (property.seller.agencyName && p.seller?.agencyName) {
            return p.seller.agencyName === property.seller.agencyName;
          }
          return false;
        })
        .slice(0, maxItems);
    } catch (err) {
      console.error('SimilarProperties: error computing agency listings', err);
      return [];
    }
  }, [hasAgency, state.properties, property.id, property.seller?.agencyId, property.seller?.agencyName, maxItems]);

  // Fallback: score-based similar properties
  const similarProperties = useMemo(() => {
    if (!state.properties?.length) return [];

    try {
      const priceLow = property.price * 0.7;
      const priceHigh = property.price * 1.3;

      return state.properties
        .filter(p => p.id !== property.id && p.status === 'active')
        .map(p => {
          let score = 0;
          if (p.city === property.city) score += 50;
          if (p.country === property.country) score += 20;
          if (p.propertyType === property.propertyType) score += 15;
          if (p.listingType === property.listingType) score += 10;
          if (p.price >= priceLow && p.price <= priceHigh) score += 10;
          if (property.beds > 0 && Math.abs(p.beds - property.beds) <= 1) score += 5;
          return { property: p, score };
        })
        .filter(s => s.score >= 30)
        .sort((a, b) => b.score - a.score)
        .slice(0, maxItems)
        .map(s => s.property);
    } catch (err) {
      console.error('SimilarProperties: error computing similar listings', err);
      return [];
    }
  }, [state.properties, property.id, property.city, property.country, property.propertyType, property.listingType, property.price, property.beds, maxItems]);

  const displayProperties = hasAgency && agencyProperties.length > 0 ? agencyProperties : similarProperties;

  if (displayProperties.length === 0) return null;

  const isRental = property.listingType === 'rent';
  const agencyName = property.seller?.agencyName;

  const heading = hasAgency && agencyProperties.length > 0
    ? t('property:similarProperties.agencyTitle', 'More from {{agency}}', { agency: agencyName || 'this agency' })
    : isRental
      ? t('property:similarProperties.titleRent', 'Similar Rentals in {{city}}', { city: property.city })
      : t('property:similarProperties.title', 'Similar Properties in {{city}}', { city: property.city });

  const subtitle = hasAgency && agencyProperties.length > 0
    ? t('property:similarProperties.agencySubtitle', 'Other listings from {{agency}}', { agency: agencyName || 'this agency' })
    : t('property:similarProperties.subtitle', 'Browse more {{type}} for {{action}} in {{city}}, {{country}}', {
        type: property.propertyType || 'properties',
        action: isRental ? 'rent' : 'sale',
        city: property.city,
        country: property.country,
      });

  return (
    <section aria-label={hasAgency && agencyProperties.length > 0 ? 'Agency listings' : 'Similar properties'}>
      <h2 className="text-xl sm:text-2xl font-bold text-neutral-800 mb-3 sm:mb-4">
        {heading}
      </h2>
      <p className="text-sm text-neutral-500 mb-4">
        {subtitle}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {displayProperties.map(p => (
          <PropertyCard key={p.id} property={p} />
        ))}
      </div>
    </section>
  );
};

export default SimilarProperties;
