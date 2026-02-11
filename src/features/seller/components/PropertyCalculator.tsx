import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { formatPrice } from '@/utils/currency';
import { NominatimResult } from '@/types';
import { searchLocation } from '@/services/osmService';
import { MapPinIcon, SpinnerIcon } from '@/constants';
import { Button } from '@/components/ui/liquid-glass-button';
import { getCityMarketData } from '@/src/features/cities/api/cityApi';
import { API_URL } from '@/src/shared/api/config';

const PropertyCalculator: React.FC = () => {
  const { t } = useTranslation(['calculators']);
  const [result, setResult] = useState<{value: number, valueLow: number, valueHigh: number, country: string, avgPricePerSqm: number} | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Location Search State
  const [locationSearch, setLocationSearch] = useState('');
  const [suggestions, setSuggestions] = useState<NominatimResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<NominatimResult | null>(null);
  const debounceTimer = useRef<number | null>(null);
  const locationContainerRef = useRef<HTMLDivElement>(null);


  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    if (locationSearch.trim().length > 2) {
      setIsSearching(true);
      debounceTimer.current = window.setTimeout(async () => {
        const results = await searchLocation(locationSearch);
        setSuggestions(results);
        setIsSearching(false);
      }, 500);
    } else {
      setSuggestions([]);
    }
  }, [locationSearch]);
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (locationContainerRef.current && !locationContainerRef.current.contains(event.target as Node)) {
            setSuggestions([]);
        }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLocationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocationSearch(e.target.value);
    setSelectedLocation(null);
  };
  
  const handleSuggestionClick = (suggestion: NominatimResult) => {
    setSelectedLocation(suggestion);
    setLocationSearch(suggestion.display_name);
    setSuggestions([]);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    setError(null);

    if (!selectedLocation) {
        setError(t('property.errors.selectLocation'));
        setLoading(false);
        return;
    }

    const form = e.currentTarget;
    const formData = new FormData(form);
    const sqft = Math.max(0, Number(formData.get('sqft')));
    const city = selectedLocation.address?.city || selectedLocation.address?.town || selectedLocation.address?.village || '';
    const country = selectedLocation.address?.country || '';

    if (!city || !country) {
        setError(t('property.errors.locationNotDetermined'));
        setLoading(false);
        return;
    }

    try {
        // Try to get city market data first
        let avgPricePerSqm: number | null = null;
        let dataSource: 'cityData' | 'properties' | 'fallback' = 'fallback';

        // Try city market data API
        try {
            const cityData = await getCityMarketData(city, country);
            if (cityData && cityData.avgPricePerSqm > 0) {
                avgPricePerSqm = cityData.avgPricePerSqm;
                dataSource = 'cityData';
            }
        } catch {
            // City market data not available, try properties
        }

        // If no city data, try to fetch properties from API
        if (!avgPricePerSqm) {
            try {
                const response = await fetch(`${API_URL}/properties?city=${encodeURIComponent(city)}&limit=50`);
                if (response.ok) {
                    const data = await response.json();
                    const properties = data.properties || [];
                    if (properties.length >= 3) {
                        const totalSqft = properties.reduce((sum: number, p: { sqft: number }) => sum + (p.sqft || 0), 0);
                        const totalPrice = properties.reduce((sum: number, p: { price: number }) => sum + (p.price || 0), 0);
                        if (totalSqft > 0) {
                            avgPricePerSqm = totalPrice / totalSqft;
                            dataSource = 'properties';
                        }
                    }
                }
            } catch {
                // Properties API failed
            }
        }

        // Fallback: Use regional average prices based on country
        if (!avgPricePerSqm) {
            const regionalAverages: Record<string, number> = {
                'Albania': 1200,
                'Serbia': 1500,
                'North Macedonia': 1100,
                'Macedonia': 1100,
                'Kosovo': 1000,
                'Montenegro': 2000,
                'Bosnia and Herzegovina': 1300,
                'Croatia': 2500,
                'Bulgaria': 1400,
                'Romania': 1600,
                'Greece': 2200,
            };
            avgPricePerSqm = regionalAverages[country] || 1500;
        }

        // Calculate estimated value with some variance for realism
        const baseValue = avgPricePerSqm * sqft;
        const variance = 0.1; // 10% variance
        const valueLow = Math.round((baseValue * (1 - variance)) / 100) * 100;
        const valueHigh = Math.round((baseValue * (1 + variance)) / 100) * 100;
        const estimatedValue = Math.round(baseValue / 100) * 100;

        setResult({
            value: estimatedValue,
            valueLow,
            valueHigh,
            country: country,
            avgPricePerSqm: Math.round(avgPricePerSqm)
        });
    } catch (err) {
        setError(t('property.errors.calculationFailed') || 'Failed to calculate property value. Please try again.');
    } finally {
        setLoading(false);
    }
  };
  
  const calcFloatingInputClasses = "glass-input block px-2.5 pb-2.5 pt-4 w-full text-base appearance-none peer";
  const calcFloatingLabelClasses = "absolute text-base text-gray-400 duration-300 transform -translate-y-4 scale-75 top-2 z-10 origin-[0] px-2 peer-focus:px-2 peer-focus:text-amber-600 peer-placeholder-shown:scale-100 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:top-1/2 peer-focus:top-2 peer-focus:scale-75 peer-focus:-translate-y-4 start-1";

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <div className="space-y-8">
           <div className="relative" ref={locationContainerRef}>
                <input type="text" name="location" id="location" className={calcFloatingInputClasses} placeholder=" " required value={locationSearch} onChange={handleLocationChange} autoComplete="off" />
                <label htmlFor="location" className={calcFloatingLabelClasses}>{t('property.fields.location')}</label>
                {isSearching && <div className="absolute inset-y-0 right-0 flex items-center pr-3"><SpinnerIcon className="h-5 w-5 text-amber-600" /></div>}
                {suggestions.length > 0 && (
                     <ul className="absolute z-20 w-full mt-1 glass-panel-light max-h-60 overflow-y-auto glass-scrollbar">
                        {suggestions.map((suggestion) => (
                            <li key={suggestion.place_id} onMouseDown={() => handleSuggestionClick(suggestion)} className="px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer flex items-center gap-2 transition-colors">
                                <MapPinIcon className="w-4 h-4 text-gray-300 flex-shrink-0" />
                                <span>{suggestion.display_name}</span>
                            </li>
                        ))}
                    </ul>
                )}
          </div>
          <div className="relative">
             <input type="number" name="sqft" id="sqft" min="0" defaultValue="100" className={calcFloatingInputClasses} placeholder=" " required />
             <label htmlFor="sqft" className={calcFloatingLabelClasses}>{t('property.fields.area')}</label>
          </div>
           <Button type="submit" variant="accent" size="lg" disabled={loading} className="w-full font-bold rounded-xl">
            {loading ? t('property.calculating') : t('common.calculate')}
          </Button>
        </div>
      </form>

      {error && (
        <div className="mt-6 glass-fieldset border-red-200 p-4 text-center" role="alert">
            <p className="text-sm font-medium text-red-600">{error}</p>
        </div>
      )}

      {result && !error && (
        <div className="mt-6 glass-fieldset border-amber-200 p-4" aria-live="polite">
            <div className="text-center mb-3">
                <p className="text-sm font-medium text-amber-500">{t('property.results.estimatedValue')}</p>
                <p className="text-3xl font-bold text-amber-600 text-glow-amber">{formatPrice(result.value, result.country)}</p>
            </div>
            <div className="flex justify-between text-sm text-amber-500 border-t border-gray-200 pt-3">
                <div className="text-center flex-1">
                    <p className="text-xs text-gray-400">{t('property.results.lowEstimate') || 'Low'}</p>
                    <p className="font-semibold text-gray-700">{formatPrice(result.valueLow, result.country)}</p>
                </div>
                <div className="text-center flex-1 border-x border-gray-200">
                    <p className="text-xs text-gray-400">{t('property.results.pricePerSqm') || 'Price/m²'}</p>
                    <p className="font-semibold text-gray-700">{formatPrice(result.avgPricePerSqm, result.country)}</p>
                </div>
                <div className="text-center flex-1">
                    <p className="text-xs text-gray-400">{t('property.results.highEstimate') || 'High'}</p>
                    <p className="font-semibold text-gray-700">{formatPrice(result.valueHigh, result.country)}</p>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default PropertyCalculator;