import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from '@/components/shared/Modal';
import { Property } from '@/types';
import { formatPrice } from '@/utils/currency';
import {
  BuildingOfficeIcon,
  MapPinIcon,
  HomeIcon,
  CalendarIcon,
  BedIcon,
  BathIcon,
  SqftIcon,
  ParkingIcon,
  FireIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@/constants';

interface ComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  properties: Property[];
}

// Property image component with proper aspect ratio
const PropertyImage: React.FC<{ property: Property; size?: 'sm' | 'md' | 'lg' }> = ({ property, size = 'md' }) => {
  const [error, setError] = useState(false);
  useEffect(() => { setError(false); }, [property.imageUrl]);

  const sizeClasses = {
    sm: 'h-28 sm:h-32',
    md: 'h-36 sm:h-44',
    lg: 'h-48 sm:h-56'
  };

  return (
    <div className={`relative ${sizeClasses[size]} w-full rounded-xl overflow-hidden bg-neutral-100`}>
      {error ? (
        <div className="w-full h-full bg-gradient-to-br from-neutral-200 to-neutral-300 flex items-center justify-center">
          <BuildingOfficeIcon className="w-10 h-10 sm:w-12 sm:h-12 text-neutral-400" />
        </div>
      ) : (
        <img
          src={property.imageUrl}
          alt={property.title || property.address}
          className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
          onError={() => setError(true)}
        />
      )}
      {/* Urgent badge */}
      {property.hasUrgentBadge && (
        <div className="absolute top-2 left-2 bg-gradient-to-r from-red-500 to-orange-500 text-white text-[10px] sm:text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1 animate-pulse">
          <FireIcon className="w-3 h-3" />
          <span className="hidden sm:inline">Urgent</span>
        </div>
      )}
      {/* Property type badge */}
      <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-sm text-white text-[10px] sm:text-xs font-medium px-2 py-1 rounded-full capitalize">
        {property.propertyType}
      </div>
    </div>
  );
};

// Property Card for header
const PropertyCard: React.FC<{ property: Property; isMobile?: boolean }> = ({ property, isMobile }) => {
  return (
    <div className={`bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-sm ${isMobile ? 'w-[200px] flex-shrink-0' : 'min-w-[180px]'}`}>
      <PropertyImage property={property} size={isMobile ? 'sm' : 'md'} />
      <div className="p-2.5 sm:p-3">
        <h3 className="font-bold text-xs sm:text-sm text-neutral-900 line-clamp-1 mb-1">
          {property.title || property.address}
        </h3>
        <div className="flex items-center gap-1 text-[10px] sm:text-xs text-neutral-500">
          <MapPinIcon className="w-3 h-3 flex-shrink-0" />
          <span className="line-clamp-1">{property.city}, {property.country}</span>
        </div>
        <div className="mt-1.5 sm:mt-2 text-base sm:text-lg font-bold text-primary">
          {formatPrice(property.price, property.country)}
        </div>
        {/* Quick stats */}
        <div className="flex items-center gap-2 sm:gap-3 mt-1.5 sm:mt-2 text-[10px] sm:text-xs text-neutral-600">
          {property.beds && (
            <span className="flex items-center gap-0.5 sm:gap-1">
              <BedIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              {property.beds}
            </span>
          )}
          {property.baths && (
            <span className="flex items-center gap-0.5 sm:gap-1">
              <BathIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              {property.baths}
            </span>
          )}
          {property.sqft && (
            <span className="flex items-center gap-0.5 sm:gap-1">
              <SqftIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              {property.sqft}m²
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

// Mobile comparison card
const MobileComparisonCard: React.FC<{
  property: Property;
  rows: Array<{ label: string; key: string; format: (p: Property) => any; bestValue?: number | null }>;
}> = ({ property, rows }) => {
  return (
    <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-sm">
      <PropertyImage property={property} size="md" />
      <div className="p-4">
        <h3 className="font-bold text-base text-neutral-900 mb-1">
          {property.title || property.address}
        </h3>
        <div className="flex items-center gap-1 text-sm text-neutral-500 mb-3">
          <MapPinIcon className="w-4 h-4 flex-shrink-0" />
          <span className="line-clamp-1">{property.city}, {property.country}</span>
        </div>
        <div className="text-2xl font-bold text-primary mb-4">
          {formatPrice(property.price, property.country)}
        </div>

        {/* Property details */}
        <div className="space-y-2.5">
          {rows.map(row => {
            const value = property[row.key as keyof Property];
            const displayValue = row.format(property);
            const isBest = row.bestValue !== undefined && row.bestValue !== null && value === row.bestValue;

            if (displayValue === undefined || displayValue === null || displayValue === '-') return null;

            return (
              <div key={row.key} className={`flex justify-between items-center py-2 px-3 rounded-lg ${isBest ? 'bg-green-50' : 'bg-neutral-50'}`}>
                <span className="text-sm text-neutral-600">{row.label}</span>
                <span className={`text-sm font-semibold ${isBest ? 'text-green-700' : 'text-neutral-900'}`}>
                  {Array.isArray(displayValue)
                    ? (displayValue.length > 0 ? displayValue.slice(0, 3).join(', ') + (displayValue.length > 3 ? '...' : '') : '-')
                    : displayValue
                  }
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const ComparisonModal: React.FC<ComparisonModalProps> = ({ isOpen, onClose, properties }) => {
  const { t } = useTranslation(['property']);
  const [activeTab, setActiveTab] = useState<'overview' | 'features'>('overview');
  const [isMobile, setIsMobile] = useState(false);

  // Check for mobile viewport
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  if (properties.length === 0) return null;

  // Find best values for highlighting
  const findBestValue = (key: keyof Property, direction: 'min' | 'max') => {
    const values = properties.map(p => p[key]).filter(v => typeof v === 'number') as number[];
    if (values.length === 0) return null;
    return direction === 'min' ? Math.min(...values) : Math.max(...values);
  };

  const findBestIndex = (key: keyof Property, direction: 'min' | 'max') => {
    const values = properties.map(p => p[key]).filter(v => typeof v === 'number') as number[];
    if (values.length === 0) return undefined;
    const best = direction === 'min' ? Math.min(...values) : Math.max(...values);
    return properties.findIndex(p => p[key] === best);
  };

  // Check if values are different across properties
  const hasDifference = (key: keyof Property) => {
    const values = properties.map(p => p[key]);
    return new Set(values.filter(v => v !== undefined && v !== null)).size > 1;
  };

  const bestPrice = findBestValue('price', 'min');
  const bestBeds = findBestValue('beds', 'max');
  const bestBaths = findBestValue('baths', 'max');
  const bestSqft = findBestValue('sqft', 'max');
  const bestYear = findBestValue('yearBuilt', 'max');
  const bestParking = findBestValue('parking', 'max');

  const bestPriceIdx = findBestIndex('price', 'min');
  const bestBedsIdx = findBestIndex('beds', 'max');
  const bestBathsIdx = findBestIndex('baths', 'max');
  const bestSqftIdx = findBestIndex('sqft', 'max');
  const bestYearIdx = findBestIndex('yearBuilt', 'max');
  const bestParkingIdx = findBestIndex('parking', 'max');

  // Rows for comparison
  const overviewRows = [
    { label: t('property:comparison.price', 'Price'), key: 'price', bestValue: bestPrice, format: (p: Property) => formatPrice(p.price, p.country) },
    { label: t('property:comparison.propertyType', 'Type'), key: 'propertyType', format: (p: Property) => p.propertyType || '-' },
    { label: t('property:comparison.beds', 'Bedrooms'), key: 'beds', bestValue: bestBeds, format: (p: Property) => p.beds },
    { label: t('property:comparison.baths', 'Bathrooms'), key: 'baths', bestValue: bestBaths, format: (p: Property) => p.baths },
    { label: t('property:comparison.livingRooms', 'Living Rooms'), key: 'livingRooms', format: (p: Property) => p.livingRooms },
    { label: t('property:comparison.area', 'Area'), key: 'sqft', bestValue: bestSqft, format: (p: Property) => p.sqft ? `${p.sqft} m²` : '-' },
    { label: t('property:comparison.yearBuilt', 'Year Built'), key: 'yearBuilt', bestValue: bestYear, format: (p: Property) => p.yearBuilt },
    { label: t('property:comparison.parking', 'Parking'), key: 'parking', bestValue: bestParking, format: (p: Property) => p.parking },
    { label: t('property:comparison.specialFeatures', 'Features'), key: 'specialFeatures', format: (p: Property) => p.specialFeatures },
    { label: t('property:comparison.materials', 'Materials'), key: 'materials', format: (p: Property) => p.materials },
  ];

  // Get all unique features for feature comparison
  const getAllFeatures = (key: 'specialFeatures' | 'materials' | 'amenities') => {
    const set = new Set<string>();
    properties.forEach(p => {
      const features = p[key] as string[] | undefined;
      features?.forEach(item => set.add(item));
    });
    return Array.from(set);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="6xl"
      title=""
    >
      <div className="max-h-[90vh] sm:max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex-shrink-0 px-4 sm:px-6 py-3 sm:py-4 border-b border-neutral-200 bg-gradient-to-r from-neutral-50 to-white">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-neutral-900">
                {t('property:comparison.title', 'Compare Properties')}
              </h2>
              <p className="text-xs sm:text-sm text-neutral-500 mt-0.5 sm:mt-1">
                {t('property:comparison.subtitle', 'Comparing {{count}} properties', { count: properties.length })}
              </p>
            </div>
            {/* View Toggle - Only on tablet/desktop */}
            <div className="hidden sm:flex bg-neutral-100 rounded-lg p-1">
              <button
                onClick={() => setActiveTab('overview')}
                className={`px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-md transition-all ${
                  activeTab === 'overview'
                    ? 'bg-white text-neutral-900 shadow-sm'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                {t('property:comparison.overview', 'Overview')}
              </button>
              <button
                onClick={() => setActiveTab('features')}
                className={`px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-md transition-all ${
                  activeTab === 'features'
                    ? 'bg-white text-neutral-900 shadow-sm'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                {t('property:comparison.features', 'Features')}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Layout - Vertical Cards */}
        {isMobile ? (
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-neutral-50">
            {properties.map(p => (
              <MobileComparisonCard key={p.id} property={p} rows={overviewRows} />
            ))}
          </div>
        ) : (
          <>
            {/* Desktop/Tablet - Horizontal Scrollable Table */}
            <div className="flex-1 overflow-auto">
              <div className="min-w-max">
                {/* Property Cards Row - Sticky */}
                <div className="sticky top-0 z-10 bg-white border-b border-neutral-200 px-4 sm:px-6 py-3">
                  <div className="flex gap-4">
                    <div className="w-32 sm:w-40 flex-shrink-0 flex items-end pb-2">
                      <span className="text-xs font-medium text-neutral-400 uppercase tracking-wide">
                        {t('property:comparison.feature', 'Feature')}
                      </span>
                    </div>
                    {properties.map(p => (
                      <PropertyCard key={p.id} property={p} />
                    ))}
                  </div>
                </div>

                {activeTab === 'overview' ? (
                  <div className="px-4 sm:px-6">
                    {/* Pricing Section */}
                    <div className="py-2 bg-neutral-50/80 -mx-4 sm:-mx-6 px-4 sm:px-6 border-b border-neutral-100">
                      <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wide">
                        {t('property:comparison.pricing', 'Pricing')}
                      </span>
                    </div>

                    {/* Price Row */}
                    <div className={`flex gap-4 py-3 border-b border-neutral-100 ${hasDifference('price') ? 'bg-amber-50/30' : ''}`}>
                      <div className="w-32 sm:w-40 flex-shrink-0 flex items-center gap-2 text-sm font-medium text-neutral-600">
                        {t('property:comparison.price', 'Price')}
                      </div>
                      {properties.map((p, idx) => (
                        <div key={p.id} className={`min-w-[180px] flex-1 text-center ${bestPriceIdx === idx ? 'bg-green-100 rounded-lg py-1 text-green-700 font-bold' : ''}`}>
                          <span className="text-sm font-medium">{formatPrice(p.price, p.country)}</span>
                        </div>
                      ))}
                    </div>

                    {/* Price per sqm */}
                    <div className="flex gap-4 py-3 border-b border-neutral-100 bg-amber-50/30">
                      <div className="w-32 sm:w-40 flex-shrink-0 flex items-center gap-2 text-sm font-medium text-neutral-600">
                        {t('property:comparison.pricePerSqm', 'Price/m²')}
                      </div>
                      {properties.map((p) => (
                        <div key={p.id} className="min-w-[180px] flex-1 text-center">
                          <span className="text-sm font-medium">{p.sqft ? `€${Math.round(p.price / p.sqft)}` : '-'}</span>
                        </div>
                      ))}
                    </div>

                    {/* Property Details Section */}
                    <div className="py-2 bg-neutral-50/80 -mx-4 sm:-mx-6 px-4 sm:px-6 border-b border-neutral-100 mt-2">
                      <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wide">
                        {t('property:comparison.details', 'Property Details')}
                      </span>
                    </div>

                    {/* Type Row */}
                    <div className={`flex gap-4 py-3 border-b border-neutral-100 ${hasDifference('propertyType') ? 'bg-amber-50/30' : ''}`}>
                      <div className="w-32 sm:w-40 flex-shrink-0 flex items-center gap-2 text-sm font-medium text-neutral-600">
                        <HomeIcon className="w-4 h-4 text-neutral-400" />
                        {t('property:comparison.propertyType', 'Type')}
                      </div>
                      {properties.map((p) => (
                        <div key={p.id} className="min-w-[180px] flex-1 text-center">
                          <span className="text-sm font-medium capitalize">{p.propertyType || '-'}</span>
                        </div>
                      ))}
                    </div>

                    {/* Beds Row */}
                    <div className={`flex gap-4 py-3 border-b border-neutral-100 ${hasDifference('beds') ? 'bg-amber-50/30' : ''}`}>
                      <div className="w-32 sm:w-40 flex-shrink-0 flex items-center gap-2 text-sm font-medium text-neutral-600">
                        <BedIcon className="w-4 h-4 text-neutral-400" />
                        {t('property:comparison.beds', 'Bedrooms')}
                      </div>
                      {properties.map((p, idx) => (
                        <div key={p.id} className={`min-w-[180px] flex-1 text-center ${bestBedsIdx === idx ? 'bg-green-100 rounded-lg py-1 text-green-700 font-bold' : ''}`}>
                          <span className="text-sm font-medium">{p.beds ?? '-'}</span>
                        </div>
                      ))}
                    </div>

                    {/* Baths Row */}
                    <div className={`flex gap-4 py-3 border-b border-neutral-100 ${hasDifference('baths') ? 'bg-amber-50/30' : ''}`}>
                      <div className="w-32 sm:w-40 flex-shrink-0 flex items-center gap-2 text-sm font-medium text-neutral-600">
                        <BathIcon className="w-4 h-4 text-neutral-400" />
                        {t('property:comparison.baths', 'Bathrooms')}
                      </div>
                      {properties.map((p, idx) => (
                        <div key={p.id} className={`min-w-[180px] flex-1 text-center ${bestBathsIdx === idx ? 'bg-green-100 rounded-lg py-1 text-green-700 font-bold' : ''}`}>
                          <span className="text-sm font-medium">{p.baths ?? '-'}</span>
                        </div>
                      ))}
                    </div>

                    {/* Area Row */}
                    <div className={`flex gap-4 py-3 border-b border-neutral-100 ${hasDifference('sqft') ? 'bg-amber-50/30' : ''}`}>
                      <div className="w-32 sm:w-40 flex-shrink-0 flex items-center gap-2 text-sm font-medium text-neutral-600">
                        <SqftIcon className="w-4 h-4 text-neutral-400" />
                        {t('property:comparison.area', 'Area')}
                      </div>
                      {properties.map((p, idx) => (
                        <div key={p.id} className={`min-w-[180px] flex-1 text-center ${bestSqftIdx === idx ? 'bg-green-100 rounded-lg py-1 text-green-700 font-bold' : ''}`}>
                          <span className="text-sm font-medium">{p.sqft ? `${p.sqft} m²` : '-'}</span>
                        </div>
                      ))}
                    </div>

                    {/* Year Built Row */}
                    <div className={`flex gap-4 py-3 border-b border-neutral-100 ${hasDifference('yearBuilt') ? 'bg-amber-50/30' : ''}`}>
                      <div className="w-32 sm:w-40 flex-shrink-0 flex items-center gap-2 text-sm font-medium text-neutral-600">
                        <CalendarIcon className="w-4 h-4 text-neutral-400" />
                        {t('property:comparison.yearBuilt', 'Year Built')}
                      </div>
                      {properties.map((p, idx) => (
                        <div key={p.id} className={`min-w-[180px] flex-1 text-center ${bestYearIdx === idx ? 'bg-green-100 rounded-lg py-1 text-green-700 font-bold' : ''}`}>
                          <span className="text-sm font-medium">{p.yearBuilt ?? '-'}</span>
                        </div>
                      ))}
                    </div>

                    {/* Parking Row */}
                    <div className={`flex gap-4 py-3 border-b border-neutral-100 ${hasDifference('parking') ? 'bg-amber-50/30' : ''}`}>
                      <div className="w-32 sm:w-40 flex-shrink-0 flex items-center gap-2 text-sm font-medium text-neutral-600">
                        <ParkingIcon className="w-4 h-4 text-neutral-400" />
                        {t('property:comparison.parking', 'Parking')}
                      </div>
                      {properties.map((p, idx) => (
                        <div key={p.id} className={`min-w-[180px] flex-1 text-center ${bestParkingIdx === idx ? 'bg-green-100 rounded-lg py-1 text-green-700 font-bold' : ''}`}>
                          <span className="text-sm font-medium">{p.parking ?? '-'}</span>
                        </div>
                      ))}
                    </div>

                    {/* Location Section */}
                    <div className="py-2 bg-neutral-50/80 -mx-4 sm:-mx-6 px-4 sm:px-6 border-b border-neutral-100 mt-2">
                      <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wide">
                        {t('property:comparison.location', 'Location')}
                      </span>
                    </div>

                    {/* City Row */}
                    <div className={`flex gap-4 py-3 border-b border-neutral-100 ${hasDifference('city') ? 'bg-amber-50/30' : ''}`}>
                      <div className="w-32 sm:w-40 flex-shrink-0 flex items-center gap-2 text-sm font-medium text-neutral-600">
                        <MapPinIcon className="w-4 h-4 text-neutral-400" />
                        {t('property:comparison.city', 'City')}
                      </div>
                      {properties.map((p) => (
                        <div key={p.id} className="min-w-[180px] flex-1 text-center">
                          <span className="text-sm font-medium">{p.city ?? '-'}</span>
                        </div>
                      ))}
                    </div>

                    {/* Country Row */}
                    <div className={`flex gap-4 py-3 border-b border-neutral-100 ${hasDifference('country') ? 'bg-amber-50/30' : ''}`}>
                      <div className="w-32 sm:w-40 flex-shrink-0 flex items-center gap-2 text-sm font-medium text-neutral-600">
                        {t('property:comparison.country', 'Country')}
                      </div>
                      {properties.map((p) => (
                        <div key={p.id} className="min-w-[180px] flex-1 text-center">
                          <span className="text-sm font-medium">{p.country ?? '-'}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="px-4 sm:px-6">
                    {/* Features Tab */}
                    {['specialFeatures', 'materials', 'amenities'].map(featureKey => {
                      const allFeatures = getAllFeatures(featureKey as any);
                      if (allFeatures.length === 0) return null;

                      const labelMap: Record<string, string> = {
                        specialFeatures: t('property:comparison.specialFeatures', 'Special Features'),
                        materials: t('property:comparison.materials', 'Building Materials'),
                        amenities: t('property:comparison.amenities', 'Amenities'),
                      };

                      return (
                        <div key={featureKey}>
                          <div className="py-2 bg-neutral-50/80 -mx-4 sm:-mx-6 px-4 sm:px-6 border-b border-neutral-100 mt-2">
                            <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wide">
                              {labelMap[featureKey]}
                            </span>
                          </div>
                          {allFeatures.map((feature, idx) => (
                            <div key={idx} className="flex gap-4 py-2.5 border-b border-neutral-50">
                              <div className="w-32 sm:w-40 flex-shrink-0 text-xs sm:text-sm text-neutral-600 truncate pr-2">
                                {feature}
                              </div>
                              {properties.map((p) => {
                                const features = p[featureKey as keyof Property] as string[] | undefined;
                                const hasFeature = features?.includes(feature);
                                return (
                                  <div key={p.id} className="min-w-[180px] flex-1 flex justify-center">
                                    {hasFeature ? (
                                      <CheckCircleIcon className="w-5 h-5 text-green-500" />
                                    ) : (
                                      <XCircleIcon className="w-5 h-5 text-neutral-300" />
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Footer */}
        <div className="flex-shrink-0 px-4 sm:px-6 py-3 sm:py-4 border-t border-neutral-200 bg-neutral-50">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-500">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3 h-3 bg-green-100 rounded border border-green-200"></span>
                {t('property:comparison.bestValue', 'Best value')}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3 h-3 bg-amber-50 rounded border border-amber-200"></span>
                {t('property:comparison.different', 'Different values')}
              </span>
            </div>
            <button
              onClick={onClose}
              className="px-5 py-2.5 text-sm font-medium text-neutral-700 bg-white border border-neutral-300 rounded-lg hover:bg-neutral-50 transition-colors w-full sm:w-auto"
            >
              {t('property:comparison.close', 'Close')}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default ComparisonModal;
