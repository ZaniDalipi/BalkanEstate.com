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
  const [viewType, setViewType] = useState<ViewType | undefined>();
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

    // Parse address components from display_name
    const parts = result.display_name.split(', ');
    if (parts.length >= 1) {
      setAddress(parts.slice(0, Math.min(3, parts.length)).join(', '));
    }

    // Try to extract city and country from display_name
    // The last part is usually the country, and the second-to-last might be the region or city
    if (parts.length >= 2) {
      setCountry(parts[parts.length - 1]);
    }
    if (parts.length >= 3) {
      // Look for a city-like entry (usually 2-4 from the end)
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
      viewType,
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

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
      {/* Location Search */}
      <div className="space-y-2">
        <label className="block text-sm font-semibold text-neutral-700">
          {t('valuation:form.location')} <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={handleSearchChange}
            onFocus={() => searchResults.length > 0 && setShowResults(true)}
            placeholder={t('valuation:form.locationPlaceholder')}
            className="block w-full pl-10 pr-10 py-3 text-sm border-2 border-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
            autoComplete="off"
          />
          {isSearching && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
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
                className="absolute z-50 w-full mt-2 bg-white border border-neutral-200 rounded-xl shadow-lg max-h-72 overflow-y-auto"
              >
                {searchResults.map((result) => (
                  <button
                    key={result.place_id}
                    type="button"
                    onClick={() => handleResultSelect(result)}
                    className="w-full text-left px-4 py-3 hover:bg-primary/5 border-b border-neutral-100 last:border-b-0 transition-colors"
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
          <p className="text-xs text-neutral-500 mt-1">
            {city}, {country}
          </p>
        )}
      </div>

      {/* Property Type */}
      <div className="space-y-2">
        <label className="block text-sm font-semibold text-neutral-700">
          {t('valuation:form.propertyType')} <span className="text-red-500">*</span>
        </label>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          {propertyTypes.map((type) => (
            <button
              key={type.value}
              type="button"
              onClick={() => setPropertyType(type.value)}
              className={`px-3 py-2 text-sm font-medium rounded-lg border-2 transition-all ${
                propertyType === type.value
                  ? 'bg-primary text-white border-primary shadow-md'
                  : 'bg-white text-neutral-700 border-neutral-300 hover:border-primary/50'
              }`}
            >
              {type.label}
            </button>
          ))}
        </div>
      </div>

      {/* Size and Rooms */}
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-neutral-700">
            {t('valuation:form.size')} <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              type="number"
              value={sqft}
              onChange={(e) => setSqft(Math.max(1, parseInt(e.target.value) || 0))}
              min={1}
              max={10000}
              className="block w-full pr-12 py-3 text-sm border-2 border-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-neutral-500 font-medium">m²</span>
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-semibold text-neutral-700">
            {t('valuation:form.bedrooms')} <span className="text-red-500">*</span>
          </label>
          <select
            value={beds}
            onChange={(e) => setBeds(parseInt(e.target.value))}
            className="block w-full py-3 px-3 text-sm border-2 border-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
          >
            {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-semibold text-neutral-700">
            {t('valuation:form.bathrooms')} <span className="text-red-500">*</span>
          </label>
          <select
            value={baths}
            onChange={(e) => setBaths(parseInt(e.target.value))}
            className="block w-full py-3 px-3 text-sm border-2 border-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
          >
            {[0, 1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Condition */}
      <div className="space-y-2">
        <label className="block text-sm font-semibold text-neutral-700">
          {t('valuation:form.condition')}
        </label>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          {conditions.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => setCondition(condition === c.value ? undefined : c.value)}
              className={`px-3 py-2 text-xs sm:text-sm font-medium rounded-lg border-2 transition-all ${
                condition === c.value
                  ? 'bg-primary text-white border-primary shadow-md'
                  : 'bg-white text-neutral-700 border-neutral-300 hover:border-primary/50'
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
        className="flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
      >
        <svg
          className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
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
                className="block w-full py-3 px-4 text-sm border-2 border-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
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
                    className="block w-full py-3 px-4 text-sm border-2 border-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
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
                    className="block w-full py-3 px-4 text-sm border-2 border-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                </div>
              </div>
            )}

            {/* View Type */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-neutral-700">
                {t('valuation:form.viewType')}
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {views.map((v) => (
                  <button
                    key={v.value}
                    type="button"
                    onClick={() => setViewType(viewType === v.value ? undefined : v.value)}
                    className={`px-3 py-2 text-xs sm:text-sm font-medium rounded-lg border-2 transition-all ${
                      viewType === v.value
                        ? 'bg-primary text-white border-primary shadow-md'
                        : 'bg-white text-neutral-700 border-neutral-300 hover:border-primary/50'
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
                    className={`px-3 py-2 text-sm font-medium rounded-lg border-2 transition-all ${
                      furnishing === f.value
                        ? 'bg-primary text-white border-primary shadow-md'
                        : 'bg-white text-neutral-700 border-neutral-300 hover:border-primary/50'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Amenities */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-neutral-700">
                {t('valuation:form.amenities')}
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {[
                  { key: 'hasBalcony', value: hasBalcony, set: setHasBalcony, label: t('valuation:amenities.balcony') },
                  { key: 'hasGarden', value: hasGarden, set: setHasGarden, label: t('valuation:amenities.garden') },
                  { key: 'hasElevator', value: hasElevator, set: setHasElevator, label: t('valuation:amenities.elevator') },
                  { key: 'hasParking', value: hasParking, set: setHasParking, label: t('valuation:amenities.parking') },
                  { key: 'hasPool', value: hasPool, set: setHasPool, label: t('valuation:amenities.pool') },
                ].map((amenity) => (
                  <button
                    key={amenity.key}
                    type="button"
                    onClick={() => amenity.set(!amenity.value)}
                    className={`px-3 py-2 text-sm font-medium rounded-lg border-2 transition-all ${
                      amenity.value
                        ? 'bg-primary text-white border-primary shadow-md'
                        : 'bg-white text-neutral-700 border-neutral-300 hover:border-primary/50'
                    }`}
                  >
                    {amenity.label}
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
        className="w-full py-4 px-6 bg-gradient-to-r from-primary to-primary/90 text-white font-bold text-lg rounded-xl shadow-lg hover:shadow-xl hover:from-primary/95 hover:to-primary/85 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-3"
      >
        {isLoading ? (
          <>
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            {t('valuation:form.calculating')}
          </>
        ) : (
          <>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            {t('valuation:form.getValuation')}
          </>
        )}
      </button>

      {/* Disclaimer */}
      <p className="text-center text-xs text-neutral-500">
        {t('valuation:form.disclaimer')}
      </p>
    </form>
  );
};

export default ValuationForm;
