import React, { useRef, useEffect } from 'react';
import { SearchIcon, XMarkIcon, MapPinIcon, SpinnerIcon } from '../../../../../constants';
import { NominatimResult } from '../../../../../types';

interface SearchInputProps {
    value: string;
    onChange: (value: string) => void;
    onSearch: () => void;
    onClear: () => void;
    onFocusChange: (focused: boolean) => void;
    placeholder?: string;
    isMobile?: boolean;
    suggestions?: NominatimResult[];
    onSuggestionClick: (suggestion: NominatimResult) => void;
    isSearching?: boolean;
}

const SearchInput: React.FC<SearchInputProps> = ({
    value,
    onChange,
    onSearch,
    onClear,
    onFocusChange,
    placeholder = "Search city, address...",
    isMobile = false,
    suggestions = [],
    onSuggestionClick,
    isSearching = false
}) => {
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                onFocusChange(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onFocusChange]);

    return (
        <div className="relative flex-grow" ref={wrapperRef}>
            {!isMobile && (
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <SearchIcon className="h-4 w-4 text-neutral-400" />
                </div>
            )}
            {isMobile && (
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2">
                    <SearchIcon className="h-5 w-5 text-neutral-500" />
                </div>
            )}
            <input
                type="text"
                name="query"
                placeholder={placeholder}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && onSearch()}
                onFocus={() => onFocusChange(true)}
                className={isMobile
                    ? "block w-full text-base bg-transparent border-none text-neutral-900 px-9 py-1 focus:outline-none focus:ring-0"
                    : "block w-full bg-white border border-neutral-300 rounded-xl text-neutral-900 text-sm px-3 py-2 pl-9 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all placeholder:text-neutral-400"
                }
            />
            {value && !isSearching && (
                <div className="absolute inset-y-0 right-0 flex items-center pr-2">
                    <button onClick={onClear} className="text-neutral-400 hover:text-neutral-800">
                        <XMarkIcon className="h-5 w-5" />
                    </button>
                </div>
            )}
            {isSearching && (
                <div className="absolute inset-y-0 right-0 flex items-center pr-2">
                    <SpinnerIcon className="h-5 w-5 text-primary" />
                </div>
            )}
            {suggestions.length > 0 && (
                <ul className="absolute z-20 w-full mt-1 bg-white border border-neutral-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {suggestions.map((suggestion) => (
                        <li 
                            key={suggestion.place_id} 
                            onMouseDown={() => onSuggestionClick(suggestion)} 
                            className="px-4 py-3 text-sm text-neutral-700 hover:bg-neutral-100 cursor-pointer flex items-center gap-2"
                        >
                            <MapPinIcon className="w-4 h-4 text-neutral-400 flex-shrink-0" />
                            <span>{suggestion.display_name}</span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default SearchInput;