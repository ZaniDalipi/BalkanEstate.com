import React, { useState, useRef, useEffect, memo } from 'react';
import { useTranslation } from 'react-i18next';
import type { PropertyImageTag, FurnishingStatus, HeatingType, PropertyCondition, ViewType, EnergyRating, Orientation, ListingType, RentPeriod, VisitAvailability } from '@/types';
import { LAND_TYPES, UNIT_IN_BLOCK_TYPES, STANDALONE_BUILDING_TYPES, type PropertyTypeValue } from '@/constants/propertyTypes';
import { Button } from '@/components/ui/liquid-glass-button';

// --- Types ---

export type Step = 'init' | 'loading' | 'form' | 'preview' | 'floorplan' | 'payment' | 'success';
export type Mode = 'ai' | 'manual';

export interface ListingData {
    propertyId: string;
    title: string;
    listingType: ListingType;
    streetAddress: string;
    price: number;
    isNegotiable: boolean;
    bedrooms: number;
    bathrooms: number;
    livingRooms: number;
    kitchens: number;
    diningRooms: number;
    toilets: number;
    storageRooms: number;
    offices: number;
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
    propertyType: PropertyTypeValue;
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
    orientation: Orientation;
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
    // Daily rental fields (short-stay / luxury villa)
    checkInTime: string;
    checkOutTime: string;
    cleaningFee: number;
    cancellationPolicy: 'flexible' | 'moderate' | 'strict' | 'non-refundable' | '';
    breakfastIncluded: boolean;
    towelsIncluded: boolean;
    parkingIncluded: boolean;
    // Visit availability
    visitAvailability: VisitAvailability;
}

export interface ImageData {
    file: File | null;
    previewUrl: string;
}

export const initialListingData: ListingData = {
    propertyId: '',
    title: '',
    listingType: 'sale',
    streetAddress: '',
    price: 0,
    isNegotiable: false,
    bedrooms: 0,
    bathrooms: 0,
    livingRooms: 0,
    kitchens: 0,
    diningRooms: 0,
    toilets: 0,
    storageRooms: 0,
    offices: 0,
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
    orientation: 'any',
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
    // Daily rental fields (short-stay / luxury villa)
    checkInTime: '14:00',
    checkOutTime: '11:00',
    cleaningFee: 0,
    cancellationPolicy: '',
    breakfastIncluded: false,
    towelsIncluded: false,
    parkingIncluded: false,
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

// --- CSS Class Constants (Liquid Glass Design) ---

export const inputBaseClasses = "glass-input block w-full text-base px-4 py-2.5 transition-all";
export const labelClasses = "block text-sm font-medium text-gray-500 mb-1.5";
export const selectClasses = "glass-input block w-full text-base px-4 py-2.5 pr-10 appearance-none transition-all cursor-pointer";

// --- Inline Validation ---

/** Validation messages for the listing form, keyed by field name. */
export type FieldErrors = Record<string, string>;

/**
 * Order used to decide which invalid field the form scrolls to first.
 * Matches the top-to-bottom order of the fields in the form.
 */
export const FIELD_ERROR_ORDER = [
    'country', 'city', 'title', 'price',
    'totalFloors', 'floorNumber', 'hasElevator',
    'description', 'images',
] as const;

/** Anchor id used to scroll a field into view when validation fails. */
export const fieldAnchorId = (field: string) => `field-${field}`;

/** Minimal translate signature: `(key, fallback) => string`. */
type Translate = (key: string, fallback?: string) => string;

/**
 * Checks every mandatory field of a listing and returns a message per invalid
 * field. An empty result means the listing can be published.
 */
export const validateListing = (
    params: {
        listingData: ListingData;
        imageCount: number;
        selectedCountry: string;
        selectedCity: string;
    },
    t: Translate,
): FieldErrors => {
    const { listingData, imageCount, selectedCountry, selectedCity } = params;
    const errors: FieldErrors = {};

    if (!selectedCountry) {
        errors.country = t('newListing:validation.selectCountry', 'Please select a country');
    }
    if (!selectedCity) {
        errors.city = t('newListing:validation.selectCity', 'Please select a city');
    } else if (!listingData.lat || !listingData.lng) {
        errors.city = t('newListing:validation.setLocation', 'Please set the property location on the map');
    }

    if (!listingData.title.trim()) {
        errors.title = t('newListing:validation.titleRequired', 'Please enter a listing title');
    }

    if (!listingData.isNegotiable && (!listingData.price || listingData.price <= 0)) {
        errors.price = t('newListing:validation.invalidPrice', 'Please enter a valid price');
    }

    if (!listingData.description.trim()) {
        errors.description = t('newListing:validation.descriptionRequired', 'Please add a description of the property');
    }

    // At least one photo is mandatory - a listing without images cannot be published
    if (imageCount === 0) {
        errors.images = t('newListing:validation.imagesRequired', 'Please upload at least one image.');
    }

    // Floor details - not applicable to land
    if (!LAND_TYPES.includes(listingData.propertyType)) {
        if (UNIT_IN_BLOCK_TYPES.includes(listingData.propertyType)) {
            if (!listingData.floorNumber || listingData.floorNumber < 0) {
                errors.floorNumber = t('newListing:validation.apartmentFloorNumber', 'For apartments, please enter a valid floor number (1 or greater).');
            } else if (listingData.totalFloors && listingData.floorNumber > listingData.totalFloors) {
                errors.floorNumber = t('newListing:validation.floorExceedsTotal', 'Floor number cannot exceed the total number of floors.');
            }
            if (!listingData.totalFloors || listingData.totalFloors < 1) {
                errors.totalFloors = t('newListing:validation.apartmentTotalFloors', 'For apartments, please enter the total number of floors (1 or greater).');
            }
            if (listingData.hasElevator === undefined) {
                errors.hasElevator = t('newListing:validation.apartmentElevator', 'For apartments, please specify whether there is a lift/elevator (Yes or No).');
            }
        }
        if (STANDALONE_BUILDING_TYPES.includes(listingData.propertyType)
            && (!listingData.totalFloors || listingData.totalFloors < 1)) {
            errors.totalFloors = t('newListing:validation.houseTotalFloors', 'For houses and villas, please enter the total number of floors (1 or greater).');
        }
    }

    return errors;
};

/** Red ring/border applied to an invalid input. */
export const errorFieldClasses = "!border-red-500 !ring-1 !ring-red-500 focus:!border-red-500 focus:!ring-red-500";

/** Marks a label of a required field that is currently missing. */
export const errorLabelClasses = "!text-red-600";

/** Inline red message shown underneath an invalid field. */
export const FieldError: React.FC<{ message?: string; className?: string }> = ({ message, className = '' }) => {
    if (!message) return null;
    return (
        <p role="alert" className={`mt-1 flex items-center gap-1 text-xs font-medium text-red-600 ${className}`}>
            <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
            {message}
        </p>
    );
};

/** Red asterisk marking a required field. */
export const RequiredMark: React.FC = () => (
    <span className="text-red-500 ml-0.5" aria-hidden="true">*</span>
);

// Legacy floating label classes (kept for backward compatibility)
export const floatingInputClasses = "glass-input block px-2.5 pb-2.5 pt-4 w-full text-base appearance-none peer";
export const floatingLabelClasses = "absolute text-base text-gray-400 duration-300 transform -translate-y-4 scale-75 top-2 z-10 origin-[0] bg-white px-2 peer-focus:px-2 peer-focus:text-blue-600 peer-placeholder-shown:scale-100 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:top-1/2 peer-placeholder-shown:bg-transparent peer-focus:top-2 peer-focus:scale-75 peer-focus:-translate-y-4 peer-focus:bg-white start-1 peer-focus:text-blue-600";
export const floatingSelectLabelClasses = "absolute text-base text-gray-400 duration-300 transform -translate-y-4 scale-75 top-2 z-10 origin-[0] bg-white px-2 start-1";

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
}> = memo(({ value, options, onChange }) => {
    const { t } = useTranslation(['seller']);
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

    const getTagLabel = (tag: string) => {
        const tagMap: Record<string, string> = {
            'exterior': t('seller:createListing.imageTags.exterior', 'Exterior'),
            'living_room': t('seller:createListing.imageTags.livingRoom', 'Living Room'),
            'kitchen': t('seller:createListing.imageTags.kitchen', 'Kitchen'),
            'bedroom': t('seller:createListing.imageTags.bedroom', 'Bedroom'),
            'bathroom': t('seller:createListing.imageTags.bathroom', 'Bathroom'),
            'other': t('seller:createListing.imageTags.other', 'Other'),
        };
        return tagMap[tag] || tag.replace(/_/g, ' ');
    };

    const selectedLabel = value ? getTagLabel(value) : t('seller:createListing.imageTags.selectTag', 'Select Tag');

    return (
        <div className="relative" ref={containerRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full glass-input px-3 py-2 text-sm font-semibold flex justify-between items-center"
            >
                {selectedLabel}
                <svg className={`w-4 h-4 ml-2 transition-transform text-gray-400 ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
            </button>
            {isOpen && (
                <ul className="absolute z-50 w-full mt-1 glass-panel-light max-h-40 overflow-y-auto shadow-lg">
                    {options.map(tag => (
                        <li
                            key={tag}
                            onClick={() => handleSelect(tag)}
                            className="px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer transition-colors"
                        >
                            {getTagLabel(tag)}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
});


export const TagListInput: React.FC<{
    tags: string[];
    setTags: (tags: string[]) => void;
    label: string;
}> = memo(({ tags, setTags, label }) => {
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
             <label htmlFor={inputId} className="block text-sm font-medium text-gray-500 mb-1">{label}</label>
            <div
                className={`${inputBaseClasses} flex flex-wrap items-center gap-2 h-auto py-1 cursor-text`}
                onClick={() => document.getElementById(inputId)?.focus()}
            >
                {tags.map(tag => (
                    <div key={tag} className="flex items-center gap-1 glass-badge text-sm font-semibold px-2.5 py-1 text-blue-600">
                        <span>{tag}</span>
                        <button type="button" onClick={(e) => { e.stopPropagation(); removeTag(tag); }} className="text-gray-400 hover:text-gray-600 transition-colors" aria-label={`Remove ${tag}`}>&times;</button>
                    </div>
                ))}
                <input
                    id={inputId}
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={tags.length === 0 ? t('seller:createListing.fields.addTags') : ""}
                    className="flex-grow bg-transparent outline-none text-base h-8 text-gray-900 placeholder:text-gray-300"
                />
            </div>
        </div>
    );
});

// Tri-State Checkbox Component (No/Any/Yes)
export const TriStateCheckbox: React.FC<{
    label: string;
    value: boolean | undefined;
    onChange: (value: boolean | undefined) => void;
    /** Validation message - renders the control in red with the message underneath. */
    error?: string;
    /** Optional id on the wrapper, used to scroll the field into view on validation errors. */
    anchorId?: string;
}> = memo(({ label, value, onChange, error, anchorId }) => {
    const { t } = useTranslation(['seller']);
    const handleClick = () => {
        if (value === undefined) {
            onChange(true); // undefined -> Yes (true)
        } else if (value === true) {
            onChange(false); // Yes -> No (false)
        } else {
            onChange(undefined); // No -> Any (undefined)
        }
    };

    return (
        <div className="flex flex-col gap-2" id={anchorId}>
            <label className={`block text-sm font-medium ${error ? 'text-red-600' : 'text-gray-500'}`}>{label}</label>
            <div className={`flex gap-2 ${error ? 'rounded-lg ring-1 ring-red-500 p-1 -m-1' : ''}`}>
                <Button
                    type="button"
                    variant={value === false ? 'cool' : 'glass'}
                    size="sm"
                    onClick={() => onChange(false)}
                    className="text-xs font-medium rounded-lg"
                >
                    {t('seller:createListing.triState.no', 'No')}
                </Button>
                <Button
                    type="button"
                    variant={value === undefined ? 'cool' : 'glass'}
                    size="sm"
                    onClick={() => onChange(undefined)}
                    className="text-xs font-medium rounded-lg"
                >
                    {t('seller:createListing.triState.any', 'Any')}
                </Button>
                <Button
                    type="button"
                    variant={value === true ? 'cool' : 'glass'}
                    size="sm"
                    onClick={() => onChange(true)}
                    className="text-xs font-medium rounded-lg"
                >
                    {t('seller:createListing.triState.yes', 'Yes')}
                </Button>
            </div>
            <FieldError message={error} className="!mt-0" />
        </div>
    );
});
