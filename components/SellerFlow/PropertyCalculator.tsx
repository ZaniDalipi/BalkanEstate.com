import React, { useState, useMemo, useRef, useEffect } from 'react';
import { formatPrice } from '../../utils/currency';
import { allProperties as dummyProperties } from '../../services/apiService';
import { NominatimResult } from '../../types';
import { searchLocation } from '../../services/osmService';
import { MapPinIcon, SpinnerIcon } from '../../constants';

const PropertyCalculator: React.FC = () => {
  const [result, setResult] = useState<{value: number, country: string} | null>(null);
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

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    setError(null);
    
    if (!selectedLocation) {
        setError('Please select a valid location from the suggestions.');
        setLoading(false);
        return;
    }

    const form = e.currentTarget;
    const formData = new FormData(form);
    const sqft = Math.max(0, Number(formData.get('sqft')));
    const city = selectedLocation.address?.city || selectedLocation.address?.town || selectedLocation.address?.village || '';
    const country = selectedLocation.address?.country || '';

    if (!city || !country) {
        setError('Could not determine city and country from selected location.');
        setLoading(false);
        return;
    }
    
    setTimeout(() => {
        const propertiesInCity = dummyProperties.filter(p => p.city.toLowerCase() === city.toLowerCase());

        if (propertiesInCity.length < 3) {
            setError(`Sorry, we don't have enough data for ${city} to provide a reliable estimate.`);
            setLoading(false);
            return;
        }

        const totalSqft = propertiesInCity.reduce((sum, p) => sum + p.sqft, 0);
        const totalPrice = propertiesInCity.reduce((sum, p) => sum + p.price, 0);
        const avgPricePerSqft = totalPrice / totalSqft;

        const estimatedValue = avgPricePerSqft * sqft * (Math.random() * 0.2 + 0.9);

        setResult({
            value: Math.round(estimatedValue / 100) * 100,
            country: country
        });
        setLoading(false);
    }, 1000);
  };
  
  const floatingInputClasses = "block px-2.5 pb-2.5 pt-4 w-full text-base text-neutral-900 bg-white rounded-lg border border-neutral-300 appearance-none focus:outline-none focus:ring-0 focus:border-primary peer";
  const floatingLabelClasses = "absolute text-base text-neutral-700 duration-300 transform -translate-y-4 scale-75 top-2 z-10 origin-[0] bg-white px-2 peer-focus:px-2 peer-focus:text-primary peer-placeholder-shown:scale-100 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:top-1/2 peer-focus:top-2 peer-focus:scale-75 peer-focus:-translate-y-4 start-1";

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <div className="space-y-8">
           <div className="relative" ref={locationContainerRef}>
                <input type="text" name="location" id="location" className={floatingInputClasses} placeholder=" " required value={locationSearch} onChange={handleLocationChange} autoComplete="off" />
                <label htmlFor="location" className={floatingLabelClasses}>Location</label>
                {isSearching && <div className="absolute inset-y-0 right-0 flex items-center pr-3"><SpinnerIcon className="h-5 w-5 text-primary" /></div>}
                {suggestions.length > 0 && (
                     <ul className="absolute z-20 w-full mt-1 bg-white border border-neutral-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        {suggestions.map((suggestion) => (
                            <li key={suggestion.place_id} onMouseDown={() => handleSuggestionClick(suggestion)} className="px-4 py-3 text-sm text-neutral-700 hover:bg-neutral-100 cursor-pointer flex items-center gap-2">
                                <MapPinIcon className="w-4 h-4 text-neutral-400 flex-shrink-0" />
                                <span>{suggestion.display_name}</span>
                            </li>
                        ))}
                    </ul>
                )}
          </div>
          <div className="relative">
             <input type="number" name="sqft" id="sqft" min="0" defaultValue="100" className={floatingInputClasses} placeholder=" " required />
             <label htmlFor="sqft" className={floatingLabelClasses}>Area (m²)</label>
          </div>
           <button type="submit" disabled={loading} className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-secondary hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-secondary disabled:bg-opacity-50">
            {loading ? 'Calculating...' : 'Calculate'}
          </button>
        </div>
      </form>

      {error && (
        <div className="mt-6 bg-red-100 p-4 rounded-lg text-center">
            <p className="text-sm font-medium text-red-800">{error}</p>
        </div>
      )}

      {result && !error && (
        <div className="mt-6 bg-secondary/10 p-4 rounded-lg text-center">
            <p className="text-sm font-medium text-secondary/80">Estimated Value</p>
            <p className="text-3xl font-bold text-secondary">{formatPrice(result.value, result.country)}</p>
        </div>
      )}
    </div>
  );
};

export default PropertyCalculator;