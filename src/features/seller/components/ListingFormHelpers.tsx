import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { PropertyImageTag, FurnishingStatus, HeatingType, PropertyCondition, ViewType, EnergyRating, ListingType, RentPeriod, VisitAvailability } from '@/types';

// --- Types ---

export type Step = 'init' | 'loading' | 'form' | 'floorplan' | 'payment' | 'success';
export type Mode = 'ai' | 'manual';

export interface ListingData {
    title: string;
    listingType: ListingType;
    streetAddress: string;
    price: number;
    bedrooms: number;
    bathrooms: number;
    livingRooms: number;
    sq_meters: number;
    year_built: number;
    parking_spots: number;
    specialFeatures: string[];
    materials: string[];
    amenities: string[];
    description: string;
    image_tags: { index: number; tag: string; }[];
    tourUrl: string; // URL for video (YouTube, TikTok, Instagram, Vimeo, Facebook)
    virtualTour360Url: string; // URL for 360 virtual tour (Matterport, Kuula, etc.)
    propertyType: 'house' | 'apartment' | 'villa' | 'land' | 'other';
    floorNumber: number;
    totalFloors: number;
    lat: number;
    lng: number;
    // Mandatory amenities
    hasBalcony?: boolean;
    hasGarden?: boolean;
    hasElevator?: boolean;
    hasSecurity?: boolean;
    hasAirConditioning?: boolean;
    hasPool?: boolean;
    petsAllowed?: boolean;
    // Advanced property features
    furnishing: FurnishingStatus;
    heatingType: HeatingType;
    condition: PropertyCondition;
    viewType: ViewType;
    energyRating: EnergyRating;
    // Rental-specific fields
    rentPeriod: RentPeriod;
    securityDeposit: number;
    minimumLeaseDuration: number;
    maximumLeaseDuration: number;
    availableFrom: string; // ISO date string for form input
    utilitiesIncluded: boolean;
    internetIncluded: boolean;
    tenantRequirements: string[];
    maxOccupants: number;
    // Visit availability
    visitAvailability: VisitAvailability;
}

export interface ImageData {
    file: File | null;
    previewUrl: string;
}

export const initialListingData: ListingData = {
    title: '',
    listingType: 'sale',
    streetAddress: '',
    price: 0,
    bedrooms: 0,
    bathrooms: 0,
    livingRooms: 0,
    sq_meters: 0,
    year_built: new Date().getFullYear(),
    parking_spots: 0,
    specialFeatures: [],
    materials: [],
    amenities: [],
    description: '',
    image_tags: [],
    tourUrl: '',
    virtualTour360Url: '',
    propertyType: 'house',
    floorNumber: 1,
    totalFloors: 1,
    lat: 0,
    lng: 0,
    hasBalcony: undefined,
    hasGarden: undefined,
    hasElevator: undefined,
    hasSecurity: undefined,
    hasAirConditioning: undefined,
    hasPool: undefined,
    petsAllowed: undefined,
    // Advanced property features
    furnishing: 'any',
    heatingType: 'any',
    condition: 'any',
    viewType: 'any',
    energyRating: 'any',
    // Rental-specific fields
    rentPeriod: 'monthly',
    securityDeposit: 0,
    minimumLeaseDuration: 1,
    maximumLeaseDuration: 12,
    availableFrom: '',
    utilitiesIncluded: false,
    internetIncluded: false,
    tenantRequirements: [],
    maxOccupants: 1,
    // Visit availability
    visitAvailability: {
        enabled: false,
        days: [1, 2, 3, 4, 5], // Mon-Fri
        startTime: '09:00',
        endTime: '18:00',
        slotDurationMinutes: 30,
        notes: '',
    },
};

// Languages corresponding to supported countries: Kosovo, Albania, North Macedonia, Serbia, Bosnia and Herzegovina, Croatia, Montenegro, Greece, Bulgaria, Romania
export const LANGUAGES = [
    'English',
    'Albanian',
    'Macedonian',
    'Serbian',
    'Bosnian',
    'Croatian',
    'Montenegrin',
    'Greek',
    'Bulgarian',
    'Romanian'
];
export const ALL_VALID_TAGS: PropertyImageTag[] = ['exterior', 'living_room', 'kitchen', 'bedroom', 'bathroom', 'other'];

// --- CSS Class Constants ---

export const inputBaseClasses = "block w-full text-base bg-neutral-50 border border-neutral-300 rounded-lg text-neutral-900 shadow-sm px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors focus:bg-white";
export const floatingInputClasses = "block px-2.5 pb-2.5 pt-4 w-full text-base text-neutral-900 bg-white rounded-lg border appearance-none focus:outline-none focus:ring-0 peer";
export const floatingLabelClasses = "absolute text-base text-neutral-700 duration-300 transform -translate-y-4 scale-75 top-2 z-10 origin-[0] bg-white px-2 peer-focus:px-2 peer-focus:text-primary peer-placeholder-shown:scale-100 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:top-1/2 peer-focus:top-2 peer-focus:scale-75 peer-focus:-translate-y-4 start-1 peer-focus:text-primary";
export const floatingSelectLabelClasses = "absolute text-base text-neutral-700 duration-300 transform -translate-y-4 scale-75 top-2 z-10 origin-[0] bg-white px-2 start-1";

// --- Helper Icons ---

export const UploadIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
);
export const CheckCircleIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);
export const InfoIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

// --- Sub-components ---

export const ImageTagSelector: React.FC<{
    value: string;
    options: string[];
    onChange: (tag: string) => void;
}> = ({ value, options, onChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const handleSelect = (tag: string) => {
        onChange(tag);
        setIsOpen(false);
    };

    useEffect(() => {
        const handleOutsideClick = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleOutsideClick);
        return () => {
            document.removeEventListener('mousedown', handleOutsideClick);
        };
    }, []);

    const selectedLabel = value ? value.replace(/_/g, ' ') : 'Select Tag';

    return (
        <div className="relative" ref={containerRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full bg-white border border-neutral-300 rounded-lg px-3 py-2 text-sm font-semibold text-neutral-700 flex justify-between items-center capitalize"
            >
                {selectedLabel}
                <svg className={`w-4 h-4 ml-2 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
            </button>
            {isOpen && (
                <ul className="absolute z-10 w-full mt-1 bg-white border border-neutral-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                    {options.map(tag => (
                        <li
                            key={tag}
                            onClick={() => handleSelect(tag)}
                            className="px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-100 cursor-pointer capitalize"
                        >
                            {tag.replace(/_/g, ' ')}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};


export const TagListInput: React.FC<{
    tags: string[];
    setTags: (tags: string[]) => void;
    label: string;
}> = ({ tags, setTags, label }) => {
    const { t } = useTranslation(['seller']);
    const [inputValue, setInputValue] = useState('');
    const inputId = `tag-input-${label.toLowerCase().replace(/\s+/g, '-')}`;

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            const newTag = inputValue.trim();
            if (newTag && !tags.includes(newTag)) {
                setTags([...tags, newTag]);
            }
            setInputValue('');
        }
    };

    const removeTag = (tagToRemove: string) => {
        setTags(tags.filter(tag => tag !== tagToRemove));
    };

    return (
        <div>
             <label htmlFor={inputId} className="block text-sm font-medium text-neutral-700 mb-1">{label}</label>
            <div
                className={`${inputBaseClasses} flex flex-wrap items-center gap-2 h-auto py-1 cursor-text`}
                onClick={() => document.getElementById(inputId)?.focus()}
            >
                {tags.map(tag => (
                    <div key={tag} className="flex items-center gap-1 bg-primary-light text-primary-dark text-sm font-semibold px-2 py-1 rounded">
                        <span>{tag}</span>
                        <button type="button" onClick={(e) => { e.stopPropagation(); removeTag(tag); }} className="text-primary-dark/70 hover:text-primary-dark">&times;</button>
                    </div>
                ))}
                <input
                    id={inputId}
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={tags.length === 0 ? t('seller:createListing.fields.addTags') : ""}
                    className="flex-grow bg-transparent outline-none text-base h-8 placeholder:text-neutral-700"
                />
            </div>
        </div>
    );
};

// Tri-State Checkbox Component (No/Any/Yes)
export const TriStateCheckbox: React.FC<{
    label: string;
    value: boolean | undefined;
    onChange: (value: boolean | undefined) => void;
}> = ({ label, value, onChange }) => {
    const handleClick = () => {
        if (value === undefined) {
            onChange(true); // undefined -> Yes (true)
        } else if (value === true) {
            onChange(false); // Yes -> No (false)
        } else {
            onChange(undefined); // No -> Any (undefined)
        }
    };

    const getButtonStyle = (state: 'no' | 'any' | 'yes') => {
        let isActive = false;
        if (state === 'no') isActive = value === false;
        if (state === 'any') isActive = value === undefined;
        if (state === 'yes') isActive = value === true;

        return `px-3 py-1.5 text-xs font-medium rounded transition-colors ${
            isActive
                ? 'bg-primary-dark text-white'
                : 'bg-neutral-200 text-neutral-600 hover:bg-neutral-300'
        }`;
    };

    return (
        <div className="flex flex-col gap-2">
            <label className="block text-sm font-medium text-neutral-700">{label}</label>
            <div className="flex gap-2">
                <button
                    type="button"
                    onClick={() => onChange(false)}
                    className={getButtonStyle('no')}
                >
                    No
                </button>
                <button
                    type="button"
                    onClick={() => onChange(undefined)}
                    className={getButtonStyle('any')}
                >
                    Any
                </button>
                <button
                    type="button"
                    onClick={() => onChange(true)}
                    className={getButtonStyle('yes')}
                >
                    Yes
                </button>
            </div>
        </div>
    );
};
