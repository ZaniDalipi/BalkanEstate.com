import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { searchLocation } from '@/services/osmService';
import { NominatimResult } from '@/types';
import type { ValuationInput, PropertyType, PropertyCondition, ViewType, Furnishing } from '../types';

interface ValuationFormProps {
  onSubmit: (data: ValuationInput) => void;
  isLoading?: boolean;
}

// Property type icons
const PropertyTypeIcon: React.FC<{ type: PropertyType; className?: string }> = ({ type, className = 'w-6 h-6' }) => {
  const icons: Record<PropertyType, JSX.Element> = {
    apartment: (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
    house: (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
    villa: (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
      </svg>
    ),
    land: (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
      </svg>
    ),
    other: (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
  };
  return icons[type] || icons.other;
};

// Amenity icons
const AmenityIcon: React.FC<{ type: string; className?: string }> = ({ type, className = 'w-5 h-5' }) => {
  const icons: Record<string, JSX.Element> = {
    balcony: (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 6v8a2 2 0 002 2h12a2 2 0 002-2V6M4 6l2-4h12l2 4M8 16v4m8-4v4M6 20h12" />
      </svg>
    ),
    garden: (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
      </svg>
    ),
    elevator: (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7l4-4 4 4M8 17l4 4 4-4M3 12h18" />
      </svg>
    ),
    parking: (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7h4a4 4 0 110 8H8V7z M8 7v8" />
      </svg>
    ),
    pool: (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 15c2.483 0 4.345-1.5 5-2 .655.5 2.517 2 5 2s4.345-1.5 5-2c.655.5 2.517 2 5 2M3 19c2.483 0 4.345-1.5 5-2 .655.5 2.517 2 5 2s4.345-1.5 5-2c.655.5 2.517 2 5 2M12 3v8m-4-4l4 4 4-4" />
      </svg>
    ),
  };
  return icons[type] || <span />;
};

const ValuationForm: React.FC<ValuationFormProps> = ({ onSubmit, isLoading = false }) => {
  const { t, i18n } = useTranslation(['valuation', 'common']);

  // Form state
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [lat, setLat] = useState<number | undefined>();
  const [lng, setLng] = useState<number | undefined>();
  const [propertyType, setPropertyType] = useState<PropertyType>('apartment');
  const [sqft, setSqft] = useState<number>(80);
  const [beds, setBeds] = useState<number>(2);
  const [baths, setBaths] = useState<number>(1);
  const [yearBuilt, setYearBuilt] = useState<number | undefined>();
  const [condition, setCondition] = useState<PropertyCondition | undefined>();
  const [viewTypes, setViewTypes] = useState<ViewType[]>([]);
  const [furnishing, setFurnishing] = useState<Furnishing | undefined>();
  const [hasBalcony, setHasBalcony] = useState(false);
  const [hasGarden, setHasGarden] = useState(false);
  const [hasElevator, setHasElevator] = useState(false);
  const [hasParking, setHasParking] = useState(false);
  const [hasPool, setHasPool] = useState(false);
  const [floorNumber, setFloorNumber] = useState<number | undefined>();
  const [totalFloors, setTotalFloors] = useState<number | undefined>();

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<NominatimResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // Handle location search
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    setShowResults(true);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (query.trim().length < 3) {
      setSearchResults([]);
      return;
    }

    searchTimeoutRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await searchLocation(query);
        setSearchResults(results.slice(0, 6));
      } catch (error) {
        console.error('Search error:', error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 400);
  };

  // Handle result selection
  const handleResultSelect = (result: NominatimResult) => {
    const newLat = parseFloat(result.lat);
    const newLng = parseFloat(result.lon);

    setLat(newLat);
    setLng(newLng);
    setSearchQuery(result.display_name);
    setShowResults(false);
    setSearchResults([]);

    const parts = result.display_name.split(', ');
    if (parts.length >= 1) {
      setAddress(parts.slice(0, Math.min(3, parts.length)).join(', '));
    }

    if (parts.length >= 2) {
      setCountry(parts[parts.length - 1]);
    }
    if (parts.length >= 3) {
      const potentialCity = parts.slice(-4, -1).find(p =>
        !p.match(/^\d/) && p.length > 2 && !p.includes('Region') && !p.includes('District')
      );
      if (potentialCity) {
        setCity(potentialCity);
      } else {
        setCity(parts[parts.length - 3] || parts[parts.length - 2]);
      }
    }
  };

  // Handle form submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!address || !city || !country || !sqft) {
      return;
    }

    const data: ValuationInput = {
      address,
      city,
      country,
      lat,
      lng,
      propertyType,
      sqft,
      beds,
      baths,
      yearBuilt,
      condition,
      viewTypes: viewTypes.length > 0 ? viewTypes : undefined,
      furnishing,
      hasBalcony,
      hasGarden,
      hasElevator,
      hasParking,
      hasPool,
      floorNumber,
      totalFloors,
      language: i18n.language,
    };

    onSubmit(data);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (formRef.current && !formRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const propertyTypes: { value: PropertyType; label: string }[] = [
    { value: 'apartment', label: t('valuation:propertyTypes.apartment') },
    { value: 'house', label: t('valuation:propertyTypes.house') },
    { value: 'villa', label: t('valuation:propertyTypes.villa') },
    { value: 'land', label: t('valuation:propertyTypes.land') },
    { value: 'other', label: t('valuation:propertyTypes.other') },
  ];

  const conditions: { value: PropertyCondition; label: string }[] = [
    { value: 'new', label: t('valuation:conditions.new') },
    { value: 'excellent', label: t('valuation:conditions.excellent') },
    { value: 'good', label: t('valuation:conditions.good') },
    { value: 'fair', label: t('valuation:conditions.fair') },
    { value: 'needs-renovation', label: t('valuation:conditions.needsRenovation') },
  ];

  const views: { value: ViewType; label: string }[] = [
    { value: 'sea', label: t('valuation:views.sea') },
    { value: 'mountain', label: t('valuation:views.mountain') },
    { value: 'city', label: t('valuation:views.city') },
    { value: 'park', label: t('valuation:views.park') },
    { value: 'garden', label: t('valuation:views.garden') },
    { value: 'street', label: t('valuation:views.street') },
  ];

  const furnishings: { value: Furnishing; label: string }[] = [
    { value: 'furnished', label: t('valuation:furnishing.furnished') },
    { value: 'semi-furnished', label: t('valuation:furnishing.semiFurnished') },
    { value: 'unfurnished', label: t('valuation:furnishing.unfurnished') },
  ];

  const amenities = [
    { key: 'hasBalcony', value: hasBalcony, set: setHasBalcony, label: t('valuation:amenities.balcony'), icon: 'balcony' },
    { key: 'hasGarden', value: hasGarden, set: setHasGarden, label: t('valuation:amenities.garden'), icon: 'garden' },
    { key: 'hasElevator', value: hasElevator, set: setHasElevator, label: t('valuation:amenities.elevator'), icon: 'elevator' },
    { key: 'hasParking', value: hasParking, set: setHasParking, label: t('valuation:amenities.parking'), icon: 'parking' },
    { key: 'hasPool', value: hasPool, set: setHasPool, label: t('valuation:amenities.pool'), icon: 'pool' },
  ];

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-8">
      {/* Section 1: Location */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-neutral-800">{t('valuation:form.locationSection', 'Location')}</h3>
        </div>

        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={handleSearchChange}
            onFocus={() => searchResults.length > 0 && setShowResults(true)}
            placeholder={t('valuation:form.locationPlaceholder')}
            className="block w-full pl-12 pr-12 py-4 text-base border-2 border-neutral-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-neutral-50/50"
            autoComplete="off"
          />
          {isSearching && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2">
              <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {/* Search results dropdown */}
          <AnimatePresence>
            {showResults && searchResults.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute z-50 w-full mt-2 bg-white border border-neutral-200 rounded-2xl shadow-xl max-h-72 overflow-y-auto"
              >
                {searchResults.map((result) => (
                  <button
                    key={result.place_id}
                    type="button"
                    onClick={() => handleResultSelect(result)}
                    className="w-full text-left px-4 py-3 hover:bg-primary/5 border-b border-neutral-100 last:border-b-0 transition-colors first:rounded-t-2xl last:rounded-b-2xl"
                  >
                    <div className="flex items-start gap-3">
                      <svg className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-neutral-900 line-clamp-2">{result.display_name}</p>
                        <p className="text-xs text-neutral-500 mt-0.5 capitalize">{result.type?.replace('_', ' ')}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        {city && country && (
          <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 px-3 py-2 rounded-lg">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span className="font-medium">{city}, {country}</span>
          </div>
        )}
      </div>

      {/* Section 2: Property Type */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
            <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-neutral-800">{t('valuation:form.propertyType')}</h3>
        </div>

        <div className="grid grid-cols-5 gap-2">
          {propertyTypes.map((type) => (
            <button
              key={type.value}
              type="button"
              onClick={() => setPropertyType(type.value)}
              className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${
                propertyType === type.value
                  ? 'bg-primary/10 border-primary text-primary shadow-md'
                  : 'bg-white text-neutral-600 border-neutral-200 hover:border-primary/50 hover:bg-neutral-50'
              }`}
            >
              <PropertyTypeIcon type={type.value} className={`w-6 h-6 ${propertyType === type.value ? 'text-primary' : 'text-neutral-500'}`} />
              <span className="text-xs font-semibold">{type.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Section 3: Property Details */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
            <svg className="w-4 h-4 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-neutral-800">{t('valuation:form.detailsSection', 'Property Details')}</h3>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {/* Size */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-neutral-700">
              {t('valuation:form.size')} <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={sqft}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9]/g, '');
                  setSqft(val ? Math.max(1, parseInt(val)) : 0);
                }}
                placeholder="80"
                className="block w-full pl-4 pr-12 py-3 text-base border-2 border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-neutral-50/50"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-neutral-500 font-medium bg-neutral-100 px-2 py-0.5 rounded">m²</span>
            </div>
          </div>

          {/* Bedrooms */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-neutral-700">
              {t('valuation:form.bedrooms')}
            </label>
            <div className="flex items-center border-2 border-neutral-200 rounded-xl overflow-hidden bg-neutral-50/50">
              <button
                type="button"
                onClick={() => setBeds(Math.max(0, beds - 1))}
                className="px-3 py-3 text-neutral-600 hover:bg-neutral-100 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                </svg>
              </button>
              <span className="flex-1 text-center font-bold text-lg">{beds}</span>
              <button
                type="button"
                onClick={() => setBeds(Math.min(10, beds + 1))}
                className="px-3 py-3 text-neutral-600 hover:bg-neutral-100 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>
          </div>

          {/* Bathrooms */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-neutral-700">
              {t('valuation:form.bathrooms')}
            </label>
            <div className="flex items-center border-2 border-neutral-200 rounded-xl overflow-hidden bg-neutral-50/50">
              <button
                type="button"
                onClick={() => setBaths(Math.max(0, baths - 1))}
                className="px-3 py-3 text-neutral-600 hover:bg-neutral-100 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                </svg>
              </button>
              <span className="flex-1 text-center font-bold text-lg">{baths}</span>
              <button
                type="button"
                onClick={() => setBaths(Math.min(10, baths + 1))}
                className="px-3 py-3 text-neutral-600 hover:bg-neutral-100 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Section 4: Condition */}
      <div className="space-y-3">
        <label className="block text-sm font-semibold text-neutral-700">
          {t('valuation:form.condition')}
        </label>
        <div className="flex flex-wrap gap-2">
          {conditions.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => setCondition(condition === c.value ? undefined : c.value)}
              className={`px-4 py-2.5 text-sm font-medium rounded-full border-2 transition-all ${
                condition === c.value
                  ? 'bg-primary text-white border-primary shadow-md'
                  : 'bg-white text-neutral-600 border-neutral-200 hover:border-primary/50'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Advanced Options Toggle */}
      <button
        type="button"
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary/80 transition-colors group"
      >
        <div className={`w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center transition-transform ${showAdvanced ? 'rotate-180' : ''}`}>
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
        {showAdvanced ? t('valuation:form.hideAdvanced') : t('valuation:form.showAdvanced')}
      </button>

      {/* Advanced Options */}
      <AnimatePresence>
        {showAdvanced && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-6 overflow-hidden"
          >
            {/* Year Built */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-neutral-700">
                {t('valuation:form.yearBuilt')}
              </label>
              <input
                type="number"
                value={yearBuilt || ''}
                onChange={(e) => setYearBuilt(e.target.value ? parseInt(e.target.value) : undefined)}
                min={1800}
                max={new Date().getFullYear()}
                placeholder={t('valuation:form.yearBuiltPlaceholder')}
                className="block w-full py-3 px-4 text-base border-2 border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-neutral-50/50"
              />
            </div>

            {/* Floor Number (for apartments) */}
            {propertyType === 'apartment' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-neutral-700">
                    {t('valuation:form.floorNumber')}
                  </label>
                  <input
                    type="number"
                    value={floorNumber ?? ''}
                    onChange={(e) => setFloorNumber(e.target.value ? parseInt(e.target.value) : undefined)}
                    min={0}
                    max={100}
                    placeholder="e.g. 3"
                    className="block w-full py-3 px-4 text-base border-2 border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-neutral-50/50"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-neutral-700">
                    {t('valuation:form.totalFloors')}
                  </label>
                  <input
                    type="number"
                    value={totalFloors ?? ''}
                    onChange={(e) => setTotalFloors(e.target.value ? parseInt(e.target.value) : undefined)}
                    min={1}
                    max={100}
                    placeholder="e.g. 10"
                    className="block w-full py-3 px-4 text-base border-2 border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-neutral-50/50"
                  />
                </div>
              </div>
            )}

            {/* View Type (Multi-select) */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-neutral-700">
                {t('valuation:form.viewType')} <span className="text-xs text-neutral-400 font-normal ml-1">(multi-select)</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {views.map((v) => (
                  <button
                    key={v.value}
                    type="button"
                    onClick={() => setViewTypes(
                      viewTypes.includes(v.value)
                        ? viewTypes.filter(vt => vt !== v.value)
                        : [...viewTypes, v.value]
                    )}
                    className={`px-4 py-2.5 text-sm font-medium rounded-full border-2 transition-all ${
                      viewTypes.includes(v.value)
                        ? 'bg-primary text-white border-primary shadow-md'
                        : 'bg-white text-neutral-600 border-neutral-200 hover:border-primary/50'
                    }`}
                  >
                    {v.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Furnishing */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-neutral-700">
                {t('valuation:form.furnishing')}
              </label>
              <div className="grid grid-cols-3 gap-2">
                {furnishings.map((f) => (
                  <button
                    key={f.value}
                    type="button"
                    onClick={() => setFurnishing(furnishing === f.value ? undefined : f.value)}
                    className={`px-4 py-3 text-sm font-medium rounded-xl border-2 transition-all ${
                      furnishing === f.value
                        ? 'bg-primary text-white border-primary shadow-md'
                        : 'bg-white text-neutral-600 border-neutral-200 hover:border-primary/50'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Amenities */}
            <div className="space-y-3">
              <label className="block text-sm font-semibold text-neutral-700">
                {t('valuation:form.amenities')}
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {amenities.map((amenity) => (
                  <button
                    key={amenity.key}
                    type="button"
                    onClick={() => amenity.set(!amenity.value)}
                    className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${
                      amenity.value
                        ? 'bg-primary/10 border-primary text-primary shadow-md'
                        : 'bg-white text-neutral-600 border-neutral-200 hover:border-primary/50'
                    }`}
                  >
                    <AmenityIcon type={amenity.icon} className={`w-5 h-5 ${amenity.value ? 'text-primary' : 'text-neutral-500'}`} />
                    <span className="text-xs font-semibold">{amenity.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isLoading || !address || !city || !country || !sqft}
        className="w-full py-4 px-6 bg-gradient-to-r from-primary to-primary/90 text-white font-bold text-lg rounded-2xl shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 hover:from-primary/95 hover:to-primary/85 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none transition-all flex items-center justify-center gap-3 relative overflow-hidden group"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700" />
        {isLoading ? (
          <>
            <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin" />
            <span>{t('valuation:form.calculating')}</span>
          </>
        ) : (
          <>
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            <span>{t('valuation:form.getValuation')}</span>
          </>
        )}
      </button>

      {/* Disclaimer */}
      <p className="text-center text-xs text-neutral-400">
        {t('valuation:form.disclaimer')}
      </p>
    </form>
  );
};

export default ValuationForm;
