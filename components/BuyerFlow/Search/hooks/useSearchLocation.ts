import { useState, useEffect, useRef } from 'react';
import { searchLocation } from '../../../../services/osmService';
import { NominatimResult } from '../../../../types';

export const useSearchLocation = (query: string, isFocused: boolean) => {
    const [suggestions, setSuggestions] = useState<NominatimResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const debounceTimer = useRef<number | null>(null);

    useEffect(() => {
        if (debounceTimer.current) {
            clearTimeout(debounceTimer.current);
        }
        
        if (isFocused && query.trim().length > 2) {
            setIsSearching(true);
            debounceTimer.current = window.setTimeout(async () => {
                const results = await searchLocation(query);
                setSuggestions(results);
                setIsSearching(false);
            }, 500);
        } else {
            setSuggestions([]);
        }

        return () => {
            if (debounceTimer.current) {
                clearTimeout(debounceTimer.current);
            }
        };
    }, [query, isFocused]);

    return { suggestions, isSearching, setSuggestions };
};