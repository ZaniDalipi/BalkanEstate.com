import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { Property, PropertyImage, PropertyImageTag, Seller, UserRole, NominatimResult, FurnishingStatus, HeatingType, PropertyCondition, ViewType, EnergyRating } from '../../types';
import { generateDescriptionFromImages, PropertyAnalysisResult, calculatePropertyDistances } from '../../services/geminiService';
import { searchLocation } from '../../services/osmService';
import { SparklesIcon, MapPinIcon, SpinnerIcon } from '../../constants';
import { getCurrencySymbol } from '../../utils/currency';
import { useAppContext } from '../../context/AppContext';
import { useAlert } from '../../context/AlertContext';
import MarketInsightsAnimation from './MarketInsightsAnimation';
import NumberInputWithSteppers from '../shared/NumberInputWithSteppers';
import MapLocationPicker from './MapLocationPicker';
import { BALKAN_LOCATIONS, CityData } from '../../utils/balkanLocations';
import * as api from '../../services/apiService';
import imageCompression from 'browser-image-compression';
import PromotionSelector from '../promotions/PromotionSelector';
import RoleSelector from './RoleSelector';

type Step = 'init' | 'loading' | 'form' | 'floorplan' | 'payment' | 'success';
type Mode = 'ai' | 'manual';

interface ListingData {
    title: string;
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
    tourUrl: string;
    virtualTour360Url: string; // URL for 360 virtual tour (Matterport, Kuula, etc.)
    propertyType: 'house' | 'apartment' | 'villa' | 'other';
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
}

interface ImageData {
    file: File | null;
    previewUrl: string;
}

const initialListingData: ListingData = {
    title: '',
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
};

// Languages corresponding to supported countries: Kosovo, Albania, North Macedonia, Serbia, Bosnia and Herzegovina, Croatia, Montenegro, Greece, Bulgaria, Romania
const LANGUAGES = [
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
const ALL_VALID_TAGS: PropertyImageTag[] = ['exterior', 'living_room', 'kitchen', 'bedroom', 'bathroom', 'other'];


// --- Helper Icons ---
const UploadIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
);
const CheckCircleIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);
const InfoIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);


const inputBaseClasses = "block w-full text-base bg-neutral-50 border border-neutral-300 rounded-lg text-neutral-900 shadow-sm px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors focus:bg-white";
const floatingInputClasses = "block px-2.5 pb-2.5 pt-4 w-full text-base text-neutral-900 bg-white rounded-lg border appearance-none focus:outline-none focus:ring-0 peer";
const floatingLabelClasses = "absolute text-base text-neutral-700 duration-300 transform -translate-y-4 scale-75 top-2 z-10 origin-[0] bg-white px-2 peer-focus:px-2 peer-focus:text-primary peer-placeholder-shown:scale-100 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:top-1/2 peer-focus:top-2 peer-focus:scale-75 peer-focus:-translate-y-4 start-1 peer-focus:text-primary";
const floatingSelectLabelClasses = "absolute text-base text-neutral-700 duration-300 transform -translate-y-4 scale-75 top-2 z-10 origin-[0] bg-white px-2 start-1";

// --- Sub-components ---
const ImageTagSelector: React.FC<{
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


const TagListInput: React.FC<{
    tags: string[];
    setTags: (tags: string[]) => void;
    label: string;
}> = ({ tags, setTags, label }) => {
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
                    placeholder={tags.length === 0 ? "Add tags..." : ""}
                    className="flex-grow bg-transparent outline-none text-base h-8 placeholder:text-neutral-700"
                />
            </div>
        </div>
    );
};

// Tri-State Checkbox Component (No/Any/Yes)
const TriStateCheckbox: React.FC<{
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

// --- Main Component ---
const GeminiDescriptionGenerator: React.FC<{ propertyToEdit: Property | null }> = ({ propertyToEdit }) => {
    const { state, dispatch, updateUser, createListing, updateListing } = useAppContext();
    const { currentUser, properties, isPricingModalOpen, pendingProperty } = state;
    const { showError, showWarning, showSuccess, showInfo } = useAlert();
    const [mode, setMode] = useState<Mode>('ai');
    const [step, setStep] = useState<Step>('init');
    const [images, setImages] = useState<ImageData[]>([]);
    const [floorplanImage, setFloorplanImage] = useState<ImageData>({ file: null, previewUrl: '' });
    const [listingData, setListingData] = useState<ListingData>(initialListingData);
    const [language, setLanguage] = useState('English');
    const [aiPropertyType, setAiPropertyType] = useState<'house' | 'apartment' | 'villa' | 'other'>('house');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [wantToPromote, setWantToPromote] = useState(false);
    const [pendingPropertyData, setPendingPropertyData] = useState<Property | null>(null);

    // Smart role selection: If user is buyer, default to private_seller (buyers can't create listings)
    // If user has agent in availableRoles, prefer agent. Otherwise use private_seller.
    const getInitialRole = (): UserRole => {
        const currentRole = currentUser?.activeRole || currentUser?.role;

        // If current role is buyer, choose a valid seller role
        if (currentRole === 'buyer' || currentRole === UserRole.BUYER) {
            // Prefer agent if available, otherwise private_seller
            if (currentUser?.availableRoles?.includes('agent')) {
                return UserRole.AGENT;
            }
            return UserRole.PRIVATE_SELLER;
        }

        // Use current role if it's already a seller role
        return currentRole as UserRole || UserRole.PRIVATE_SELLER;
    };

    const [selectedRole, setSelectedRole] = useState<UserRole>(getInitialRole());

    // Upload Progress State
    const [uploadProgress, setUploadProgress] = useState<number>(0);
    const [isCompressing, setIsCompressing] = useState(false);
    const [isUploading, setIsUploading] = useState(false);

    // Drag & Drop State
    const dragItem = useRef<number | null>(null);
    const dragOverItem = useRef<number | null>(null);

    // Location State
    const [selectedCountry, setSelectedCountry] = useState('');
    const [selectedCity, setSelectedCity] = useState('');
    const [availableCities, setAvailableCities] = useState<CityData[]>([]);

    // Track modal state to react to it closing
    const wasModalOpen = useRef(isPricingModalOpen);
    useEffect(() => {
        if (wasModalOpen.current && !isPricingModalOpen && pendingProperty) {
            const listingsLimit = currentUser?.subscription?.listingsLimit || 3;
            const tierName = currentUser?.subscription?.tier === 'pro' ? 'Pro' : 'Free';
            showError('Listing Limit Reached', `You've reached your ${tierName} listing limit of ${listingsLimit}. ${tierName === 'Free' ? 'Please subscribe to publish more properties.' : ''}`);
            dispatch({ type: 'SET_PENDING_PROPERTY', payload: null });
        }
        wasModalOpen.current = isPricingModalOpen;
    }, [isPricingModalOpen, pendingProperty, currentUser?.subscription, dispatch, showError]);

    // Populate form if editing
    useEffect(() => {
        if (propertyToEdit) {
            setMode('manual');
            setStep('form');

            const hashString = `${propertyToEdit.address}`;
            let hash = 0;
            for (let i = 0; i < hashString.length; i++) {
                const char = hashString.charCodeAt(i);
                hash = ((hash << 5) - hash) + char;
                hash |= 0;
            }
            const latOffset = Math.sin(hash) * 0.005;
            const lngOffset = Math.cos(hash) * 0.005;

            const originalLat = propertyToEdit.lat - latOffset;
            const originalLng = propertyToEdit.lng - lngOffset;

            setListingData({
                title: propertyToEdit.address || '',
                streetAddress: propertyToEdit.address,
                price: propertyToEdit.price,
                bedrooms: propertyToEdit.beds,
                bathrooms: propertyToEdit.baths,
                livingRooms: propertyToEdit.livingRooms,
                sq_meters: propertyToEdit.sqft,
                year_built: propertyToEdit.yearBuilt,
                parking_spots: propertyToEdit.parking,
                specialFeatures: propertyToEdit.specialFeatures,
                materials: propertyToEdit.materials,
                amenities: propertyToEdit.amenities || [],
                description: propertyToEdit.description,
                tourUrl: propertyToEdit.tourUrl || '',
                virtualTour360Url: propertyToEdit.virtualTour360Url || '',
                propertyType: propertyToEdit.propertyType || 'house',
                floorNumber: propertyToEdit.floorNumber || 0,
                totalFloors: propertyToEdit.totalFloors || 0,
                image_tags: (propertyToEdit.images || []).map((img, index) => ({ index, tag: img.tag })),
                lat: originalLat,
                lng: originalLng,
                hasBalcony: propertyToEdit.hasBalcony,
                hasGarden: propertyToEdit.hasGarden,
                hasElevator: propertyToEdit.hasElevator,
                hasSecurity: propertyToEdit.hasSecurity,
                hasAirConditioning: propertyToEdit.hasAirConditioning,
                hasPool: propertyToEdit.hasPool,
                petsAllowed: propertyToEdit.petsAllowed,
                // Advanced property features
                furnishing: propertyToEdit.furnishing || 'any',
                heatingType: propertyToEdit.heatingType || 'any',
                condition: propertyToEdit.condition || 'any',
                viewType: propertyToEdit.viewType || 'any',
                energyRating: propertyToEdit.energyRating || 'any',
            });

            // Set country and city from property
            setSelectedCountry(propertyToEdit.country);
            setSelectedCity(propertyToEdit.city);

            // Load cities for the country
            const country = BALKAN_LOCATIONS.find(c => c.name === propertyToEdit.country);
            if (country) {
                setAvailableCities(country.cities);
            }

            const existingImages: ImageData[] = (propertyToEdit.images || []).map(img => ({ file: null, previewUrl: img.url }));
            setImages(existingImages);
            if (propertyToEdit.floorplanUrl) {
                setFloorplanImage({ file: null, previewUrl: propertyToEdit.floorplanUrl });
            }
        }
    }, [propertyToEdit]);
    
    // Handle country selection
    const handleCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const countryName = e.target.value;
        setSelectedCountry(countryName);
        setSelectedCity(''); // Reset city when country changes

        const country = BALKAN_LOCATIONS.find(c => c.name === countryName);
        if (country) {
            setAvailableCities(country.cities);
            // Reset coordinates when country changes
            setListingData(prev => ({ ...prev, lat: 0, lng: 0 }));
        } else {
            setAvailableCities([]);
        }
    };

    // Handle city selection
    const handleCityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const cityName = e.target.value;
        setSelectedCity(cityName);

        const city = availableCities.find(c => c.name === cityName);
        if (city) {
            // Set coordinates to city center
            setListingData(prev => ({
                ...prev,
                lat: city.lat,
                lng: city.lng,
            }));
        }
    };

    // Zoom level - moderate zoom to allow easy navigation and exploration
    const getZoomLevel = useMemo(() => {
        return listingData.streetAddress.trim() ? 16 : 13;
    }, [listingData.streetAddress]);

    // Memoize city data calculation to avoid IIFE in JSX (fixes hooks render error)
    const cityData = useMemo(() => {
        if (!selectedCountry || !selectedCity) return null;
        const countryData = BALKAN_LOCATIONS.find(c => c.name === selectedCountry);
        return countryData?.cities.find(c => c.name === selectedCity) || null;
    }, [selectedCountry, selectedCity]);

    const handleMapLocationChange = (newLat: number, newLng: number) => {
        console.log('📍 PIN DRAGGED TO EXACT COORDINATES:', { lat: newLat, lng: newLng });
        setListingData(prev => ({
            ...prev,
            lat: newLat,
            lng: newLng,
        }));
    };

    const handleMapAddressChange = (searchedLocation: string) => {
        // Update the street address field with the searched location
        setListingData(prev => ({
            ...prev,
            streetAddress: searchedLocation,
        }));
    };

    const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        // Handle case when user cancels file picker - don't clear existing images
        if (!e.target.files || e.target.files.length === 0) {
            // Reset the input so the same file can be selected again
            e.target.value = '';
            return;
        }

        const files = Array.from(e.target.files);

        // Check image count limits - always append to existing images
        const currentImageCount = images.length;
        const totalCount = currentImageCount + files.length;
        let filesToProcess = files;

        if (totalCount > 30) {
            const availableSlots = 30 - currentImageCount;
            if (availableSlots <= 0) {
                alert('Maximum 30 images allowed. Please remove some images before adding more.');
                e.target.value = '';
                return;
            }
            alert(`Maximum 30 images allowed. Only ${availableSlots} more image(s) can be added.`);
            filesToProcess = files.slice(0, availableSlots);
        }

        // Compress images on the client side for faster uploads
        setIsCompressing(true);

        try {
            const compressionOptions = {
                maxSizeMB: 1, // Maximum file size in MB
                maxWidthOrHeight: 1920, // Max dimension
                useWebWorker: true, // Use web worker for better performance
                fileType: 'image/jpeg', // Convert to JPEG for better compression
                initialQuality: 0.8, // Good quality while reducing size
            };

            const compressedImages: ImageData[] = [];

            // Process images in batches for better performance
            for (let i = 0; i < filesToProcess.length; i++) {
                const file = filesToProcess[i];
                try {
                    console.log(`🗜️ Compressing image ${i + 1}/${filesToProcess.length}: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);

                    const compressedFile = await imageCompression(file, compressionOptions);

                    console.log(`✅ Compressed: ${compressedFile.name} (${(compressedFile.size / 1024 / 1024).toFixed(2)}MB) - ${((1 - compressedFile.size / file.size) * 100).toFixed(0)}% reduction`);

                    compressedImages.push({
                        file: compressedFile,
                        previewUrl: URL.createObjectURL(compressedFile)
                    });
                } catch (compressionError) {
                    console.error(`Failed to compress ${file.name}, using original:`, compressionError);
                    // Fallback to original file if compression fails
                    compressedImages.push({
                        file,
                        previewUrl: URL.createObjectURL(file)
                    });
                }
            }

            // Always append new images to existing ones
            setImages(prev => {
                const newImages = [...prev, ...compressedImages];
                // Update image tags for new images
                const newStartIndex = prev.length;
                setListingData(prevData => ({
                    ...prevData,
                    image_tags: [
                        ...prevData.image_tags,
                        ...compressedImages.map((_, i) => ({ index: newStartIndex + i, tag: 'other' }))
                    ]
                }));
                return newImages;
            });

            console.log(`🎉 Successfully processed ${compressedImages.length} images`);
        } catch (error) {
            console.error('Image compression error:', error);
            showError('Image Processing Failed', 'Failed to process images. Please try again.');
        } finally {
            setIsCompressing(false);
            // Reset input so the same files can be selected again if needed
            e.target.value = '';
        }
    };

    const handleFloorplanImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];

            // Compress floorplan image
            setIsCompressing(true);
            try {
                const compressionOptions = {
                    maxSizeMB: 0.5,
                    maxWidthOrHeight: 1920,
                    useWebWorker: true,
                    fileType: 'image/jpeg',
                    initialQuality: 0.8,
                };

                console.log(`🗜️ Compressing floorplan: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);
                const compressedFile = await imageCompression(file, compressionOptions);
                console.log(`✅ Compressed floorplan: ${compressedFile.name} (${(compressedFile.size / 1024 / 1024).toFixed(2)}MB)`);

                setFloorplanImage({ file: compressedFile, previewUrl: URL.createObjectURL(compressedFile) });
            } catch (error) {
                console.error('Floorplan compression error:', error);
                // Fallback to original
                setFloorplanImage({ file, previewUrl: URL.createObjectURL(file) });
            } finally {
                setIsCompressing(false);
            }
        }
    };
    
    const removeImage = (indexToRemove: number) => {
        setImages(prevImages => prevImages.filter((_, index) => index !== indexToRemove));
        setListingData(prev => {
            const newTags = prev.image_tags
                .filter(tag => tag.index !== indexToRemove)
                .map(tag => (tag.index > indexToRemove ? { ...tag, index: tag.index - 1 } : tag));
            return { ...prev, image_tags: newTags };
        });
    };
    
    // --- Drag & Drop Handlers ---
    const handleDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
        dragItem.current = index;
        e.currentTarget.style.opacity = '0.5';
    };

    const handleDragEnter = (_e: React.DragEvent<HTMLDivElement>, index: number) => {
        dragOverItem.current = index;
    };

    const handleDrop = useCallback(() => {
        if (dragItem.current === null || dragOverItem.current === null || dragItem.current === dragOverItem.current) {
            return;
        }

        const currentTagsMap = new Map(listingData.image_tags.map(t => [t.index, t.tag]));

        const urlToTagMap = new Map<string, string>();
        images.forEach((img, index) => {
            const tag = currentTagsMap.get(index);
            if (tag) {
                urlToTagMap.set(img.previewUrl, tag);
            }
        });
        
        const reorderedImages = [...images];
        const draggedImage = reorderedImages.splice(dragItem.current, 1)[0];
        reorderedImages.splice(dragOverItem.current, 0, draggedImage);
        
        const newImageTags = reorderedImages.map((img, newIndex) => {
            const tag = urlToTagMap.get(img.previewUrl) || 'other';
            return { index: newIndex, tag: tag as PropertyImageTag };
        });

        setImages(reorderedImages);
        setListingData(prev => ({ ...prev, image_tags: newImageTags }));

    }, [images, listingData.image_tags]);


    const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
        e.currentTarget.style.opacity = '1';
        dragItem.current = null;
        dragOverItem.current = null;
    };


    const handleGenerate = async () => {
        if (images.length === 0) {
            showError('Images Required', 'Please upload at least one image.');
            return;
        }
        setStep('loading');
        try {
            const imageFiles = images.map(img => img.file).filter((f): f is File => f !== null);
            if (imageFiles.length === 0) {
                if (images.some(img => img.previewUrl)) {
                    setStep('form');
                    return;
                }
                showError('No New Images', 'No new images were uploaded to analyze. Please add new image files.');
                setStep('init');
                return;
            }

            const result = await generateDescriptionFromImages(imageFiles, language, aiPropertyType);
            
            const validTags = result.image_tags
                .filter(tagInfo => ALL_VALID_TAGS.includes(tagInfo.tag as PropertyImageTag))
                .map(tagInfo => ({
                    ...tagInfo,
                    tag: tagInfo.tag as PropertyImageTag,
                }));

            setListingData(prev => ({
                ...prev,
                bedrooms: result.bedrooms,
                bathrooms: result.bathrooms,
                livingRooms: result.living_rooms,
                sq_meters: result.sq_meters,
                year_built: result.year_built,
                parking_spots: result.parking_spots,
                specialFeatures: [...new Set([...result.amenities, ...result.key_features])],
                materials: result.materials,
                description: result.description,
                image_tags: validTags,
                propertyType: result.property_type,
                floorNumber: result.floor_number || 0,
                totalFloors: result.total_floors || 0,
            }));
            setStep('form');
        } catch (e) {
            console.error('⚠️ AI description generation failed:', e);
            if (e instanceof Error) {
                showWarning('AI Generation Failed', `${e.message}. You can continue with manual entry instead.`);
            } else {
                showWarning('AI Temporarily Unavailable', 'AI generation is temporarily unavailable. You can continue with manual entry instead.');
            }
            // Allow user to continue with manual entry by going back to init
            setStep('init');
        }
    };
    
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        const isNumeric = type === 'number';
        setListingData(prev => ({
            ...prev,
            [name]: isNumeric ? (value === '' ? '' : Number(value)) : value
        }));
    };

    const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const rawValue = e.target.value;
        const numericString = rawValue.replace(/[^0-9]/g, '');
        const numberValue = numericString === '' ? 0 : Number(numericString);
        
        setListingData(prev => ({
            ...prev,
            price: numberValue
        }));
    };
    
    const handleImageTagChange = (index: number, tag: string) => {
        const newImageTags = [...listingData.image_tags];
        const existingTagIndex = newImageTags.findIndex(t => t.index === index);
        if (existingTagIndex > -1) {
            newImageTags[existingTagIndex].tag = tag;
        } else {
            newImageTags.push({ index, tag });
        }
        setListingData(prev => ({ ...prev, image_tags: newImageTags }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentUser) {
            showError('Authentication Required', "You must be logged in to create a listing.");
            dispatch({ type: 'TOGGLE_AUTH_MODAL', payload: { isOpen: true, view: 'signup' } });
            return;
        }
        setIsSubmitting(true);

        // Validation
        if (!selectedCountry || !selectedCity) {
            showError('Location Required', "Please select both country and city.");
            setIsSubmitting(false);
            return;
        }

        if (listingData.lat === 0 || listingData.lng === 0) {
            showError('Location Required', "Please select a valid city to set the location.");
            setIsSubmitting(false);
            return;
        }

        if (listingData.propertyType === 'apartment' && (!listingData.floorNumber || listingData.floorNumber < 1)) {
            showError('Invalid Floor Number', "For apartments, please enter a valid floor number (1 or greater).");
            setIsSubmitting(false);
            return;
        }
        if ((listingData.propertyType === 'house' || listingData.propertyType === 'villa') && (!listingData.totalFloors || listingData.totalFloors < 1)) {
            showError('Invalid Floor Count', "For houses and villas, please enter the total number of floors (1 or greater).");
            setIsSubmitting(false);
            return;
        }

        try {
            // Step 1: Upload images to Cloudinary before creating the property
            let imageUrls: PropertyImage[] = [];

            // Get all image files that need to be uploaded (new images with file objects)
            const imagesToUpload = images
                .map((img, index) => ({ img, index }))
                .filter(({ img }) => img.file !== null);

            // Check if we have new images to upload
            if (imagesToUpload.length > 0) {
                try {
                    setIsUploading(true);
                    setUploadProgress(0);
                    console.log(`📤 Uploading ${imagesToUpload.length} compressed images to Cloudinary...`);

                    // Extract just the files (already compressed from handleImageChange)
                    const imageFiles = imagesToUpload.map(({ img }) => img.file!);

                    // Calculate total size for progress tracking
                    const totalSize = imageFiles.reduce((sum, file) => sum + file.size, 0);
                    console.log(`📊 Total upload size: ${(totalSize / 1024 / 1024).toFixed(2)}MB`);

                    // Upload to Cloudinary (without propertyId first, we'll get temp URLs)
                    const uploadedImages = await api.uploadPropertyImages(imageFiles);

                    setUploadProgress(100);
                    setIsUploading(false);
                    console.log(`✅ Successfully uploaded ${uploadedImages.length} images to Cloudinary`);

                    // Map the uploaded Cloudinary URLs back to our image array with proper tags
                    let uploadIndex = 0;
                    imageUrls = images.map((img, index) => {
                        const tagInfo = listingData.image_tags.find(t => t.index === index);
                        const tag = (tagInfo?.tag as PropertyImageTag) || 'other';

                        if (img.file !== null) {
                            // This is a new image that was just uploaded
                            const cloudinaryData = uploadedImages[uploadIndex++];
                            return {
                                url: cloudinaryData.url,
                                publicId: cloudinaryData.publicId,
                                tag,
                            };
                        } else {
                            // This is an existing image (when editing), keep the existing URL
                            return {
                                url: img.previewUrl,
                                tag,
                            };
                        }
                    });
                } catch (uploadError: any) {
                    console.error('❌ Failed to upload images to Cloudinary:', uploadError);
                    showError('Upload Failed', `Failed to upload images: ${uploadError.message || 'Unknown error'}. Please try again.`);
                    setIsSubmitting(false);
                    return;
                }
            } else if (images.length > 0) {
                // All images are existing (editing mode), just use the preview URLs
                imageUrls = images.map((img, index) => {
                    const tagInfo = listingData.image_tags.find(t => t.index === index);
                    return {
                        url: img.previewUrl,
                        tag: (tagInfo?.tag as PropertyImageTag) || 'other',
                    };
                });
            }

            const { lat, lng } = listingData;
            console.log('💾 SAVING PROPERTY WITH EXACT COORDINATES:', { lat, lng });

            // Use the address from Property Location (map search) - do not duplicate city/country
            const finalAddress = listingData.streetAddress.trim();

            // Calculate distances using Gemini AI (optional - won't block listing creation)
            let distances = {
                distanceToCenter: undefined,
                distanceToSea: undefined,
                distanceToSchool: undefined,
                distanceToHospital: undefined,
            };

            try {
                console.log('📍 Calculating property distances using Gemini AI...');
                const calculatedDistances = await calculatePropertyDistances(
                    finalAddress,
                    selectedCity,
                    selectedCountry,
                    lat,
                    lng
                );
                distances = {
                    distanceToCenter: calculatedDistances.distanceToCenter < 999 ? calculatedDistances.distanceToCenter : undefined,
                    distanceToSea: calculatedDistances.distanceToSea < 999 ? calculatedDistances.distanceToSea : undefined,
                    distanceToSchool: calculatedDistances.distanceToSchool < 999 ? calculatedDistances.distanceToSchool : undefined,
                    distanceToHospital: calculatedDistances.distanceToHospital < 999 ? calculatedDistances.distanceToHospital : undefined,
                };
                console.log('✅ Distances calculated:', distances);
            } catch (error) {
                console.warn('⚠️ Failed to calculate distances with Gemini AI. Listing will be created without distance information.');
                console.error('Distance calculation error details:', error);
                // Continue without distances - they will be undefined
                // This is intentional - we don't want to block listing creation if Gemini API fails
            }

            console.log('✅ FINAL COORDINATES BEING SAVED TO PROPERTY:', { lat, lng });

            const newProperty: Property = {
                id: propertyToEdit ? propertyToEdit.id : `prop-${Date.now()}`,
                sellerId: currentUser.id,
                status: 'active',
                title: listingData.title.trim() || undefined,
                price: Number(listingData.price),
                address: finalAddress,
                city: selectedCity,
                country: selectedCountry,
                beds: Number(listingData.bedrooms),
                baths: Number(listingData.bathrooms),
                livingRooms: Number(listingData.livingRooms),
                sqft: Number(listingData.sq_meters),
                yearBuilt: Number(listingData.year_built),
                parking: Number(listingData.parking_spots),
                description: listingData.description,
                specialFeatures: listingData.specialFeatures,
                materials: listingData.materials,
                amenities: listingData.amenities,
                tourUrl: listingData.tourUrl,
                virtualTour360Url: listingData.virtualTour360Url || undefined,
                hasVirtualTour360: !!listingData.virtualTour360Url,
                imageUrl: imageUrls.length > 0 ? imageUrls[0].url : 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=500',
                images: imageUrls,
                lat: lat,
                lng: lng,
                seller: {
                    type: selectedRole === UserRole.AGENT ? 'agent' : 'private',
                    name: currentUser.name,
                    phone: currentUser.phone,
                    avatarUrl: currentUser.avatarUrl,
                },
                propertyType: listingData.propertyType,
                floorNumber: Number(listingData.floorNumber) || undefined,
                totalFloors: Number(listingData.totalFloors) || undefined,
                floorplanUrl: floorplanImage.previewUrl || undefined,
                createdAt: propertyToEdit ? propertyToEdit.createdAt : Date.now(),
                lastRenewed: Date.now(),
                views: propertyToEdit?.views || 0,
                saves: propertyToEdit?.saves || 0,
                inquiries: propertyToEdit?.inquiries || 0,
                // Dual-role system: Pass the selected role to backend
                createdAsRole: selectedRole,
                // Mandatory amenities
                hasBalcony: listingData.hasBalcony,
                hasGarden: listingData.hasGarden,
                hasElevator: listingData.hasElevator,
                hasSecurity: listingData.hasSecurity,
                hasAirConditioning: listingData.hasAirConditioning,
                hasPool: listingData.hasPool,
                petsAllowed: listingData.petsAllowed,
                // Advanced property features
                furnishing: listingData.furnishing !== 'any' ? listingData.furnishing : undefined,
                heatingType: listingData.heatingType !== 'any' ? listingData.heatingType : undefined,
                condition: listingData.condition !== 'any' ? listingData.condition : undefined,
                viewType: listingData.viewType !== 'any' ? listingData.viewType : undefined,
                energyRating: listingData.energyRating !== 'any' ? listingData.energyRating : undefined,
                // Calculated distances
                distanceToCenter: distances.distanceToCenter,
                distanceToSea: distances.distanceToSea,
                distanceToSchool: distances.distanceToSchool,
                distanceToHospital: distances.distanceToHospital,
            };

            // Check if user has reached their listing limit (from database subscription)
            if (!propertyToEdit) {
                const userListings = properties.filter(p => p.sellerId === currentUser.id);
                const listingsLimit = currentUser.subscription?.listingsLimit || 3; // Default to 3 if not set

                if (userListings.length >= listingsLimit) {
                    dispatch({ type: 'SET_PENDING_PROPERTY', payload: newProperty });
                    dispatch({ type: 'TOGGLE_LISTING_LIMIT_WARNING', payload: true });
                    setIsSubmitting(false);
                    return;
                }
            }

            if (propertyToEdit) {
                await updateListing(newProperty);
                // For edits, go directly to success
                setStep('success');
                setTimeout(() => {
                    dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'account' });
                }, 3000);
            } else {
                // For new properties, check if user wants to promote
                if (wantToPromote) {
                    // Store property data and go to payment step WITHOUT creating listing yet
                    setPendingPropertyData(newProperty);
                    setStep('payment');
                } else {
                    // Create listing immediately without promotion
                    await createListing(newProperty);
                    if (currentUser.role === UserRole.BUYER) {
                        await updateUser({ role: UserRole.PRIVATE_SELLER });
                    }
                    setStep('success');
                    setTimeout(() => {
                        dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'account' });
                    }, 3000);
                }
            }
        } catch (err: any) {
            const errorCode = err.code;
            const errorMessage = err.message || "Failed to submit listing.";

            // Handle specific backend error codes with professional dialogs
            if (errorCode === 'FREE_LISTING_LIMIT_REACHED') {
                showWarning(
                    'Free Listing Limit Reached',
                    'You have reached your free limit of 3 active listings. Subscribe to Pro for 25 active listings!',
                    [
                        {
                            label: 'Subscribe to Pro',
                            onClick: () => {
                                dispatch({ type: 'TOGGLE_LISTING_LIMIT_WARNING', payload: true });
                            },
                            variant: 'primary',
                        },
                        {
                            label: 'Cancel',
                            onClick: () => {},
                            variant: 'secondary',
                        },
                    ]
                );
            } else if (errorCode === 'PRO_LISTING_LIMIT_REACHED') {
                showError(
                    'Pro Listing Limit Reached',
                    errorMessage,
                    [
                        {
                            label: 'View My Listings',
                            onClick: () => {
                                dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'account' });
                            },
                            variant: 'primary',
                        },
                        {
                            label: 'Close',
                            onClick: () => {},
                            variant: 'secondary',
                        },
                    ]
                );
            } else if (errorCode === 'AGENT_PRO_REQUIRED') {
                showWarning(
                    'Pro Subscription Required',
                    'Agents must have an active Pro subscription to post listings. Subscribe now to get 25 active listings!',
                    [
                        {
                            label: 'Subscribe to Pro',
                            onClick: () => {
                                dispatch({ type: 'TOGGLE_LISTING_LIMIT_WARNING', payload: true });
                            },
                            variant: 'primary',
                        },
                        {
                            label: 'Cancel',
                            onClick: () => {},
                            variant: 'secondary',
                        },
                    ]
                );
            } else if (errorCode === 'BUYER_CANNOT_CREATE_LISTING') {
                showInfo(
                    'Switch Role Required',
                    'Buyers cannot create property listings. Please switch to Private Seller or Agent role to create listings.',
                    [
                        {
                            label: 'Switch Role',
                            onClick: () => {
                                // User can switch roles in their account
                                dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'account' });
                            },
                            variant: 'primary',
                        },
                        {
                            label: 'Close',
                            onClick: () => {},
                            variant: 'secondary',
                        },
                    ]
                );
            } else {
                // Generic error handling
                showError(
                    'Failed to Submit Listing',
                    errorMessage,
                    [
                        {
                            label: 'Try Again',
                            onClick: () => {},
                            variant: 'primary',
                        },
                        {
                            label: 'Close',
                            onClick: () => {},
                            variant: 'secondary',
                        },
                    ]
                );
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    // Handler for when promotion payment succeeds
    const handlePromotionPaymentSuccess = async (promotionData: { tier: string; duration: number; hasUrgent: boolean }) => {
        if (!pendingPropertyData || !currentUser) return;

        try {
            setIsSubmitting(true);
            // Create listing first
            const createdProperty = await createListing(pendingPropertyData);

            if (currentUser.role === UserRole.BUYER) {
                await updateUser({ role: UserRole.PRIVATE_SELLER });
            }

            // Now apply promotion to the created property
            const token = localStorage.getItem('balkan_estate_token');
            const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

            const response = await fetch(`${API_URL}/promotions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                    propertyId: createdProperty.id,
                    promotionTier: promotionData.tier,
                    duration: promotionData.duration,
                    hasUrgentBadge: promotionData.hasUrgent,
                }),
            });

            if (!response.ok) {
                console.error('Failed to apply promotion, but listing was created');
            }

            setPendingPropertyData(null);
            setStep('success');
            setTimeout(() => {
                dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'account' });
            }, 3000);
        } catch (err) {
            console.error('Error creating listing with promotion:', err);
            showError('Failed to Create Listing', 'Failed to create listing. Please try again.');
            setStep('form');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Handler for when user skips promotion or payment fails
    const handlePostWithoutPromotion = async () => {
        if (!pendingPropertyData || !currentUser) return;

        try {
            setIsSubmitting(true);
            await createListing(pendingPropertyData);

            if (currentUser.role === UserRole.BUYER) {
                await updateUser({ role: UserRole.PRIVATE_SELLER });
            }

            setPendingPropertyData(null);
            setStep('success');
            setTimeout(() => {
                dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'account' });
            }, 3000);
        } catch (err) {
            console.error('Error creating listing:', err);
            showError('Failed to Create Listing', 'Failed to create listing. Please try again.');
            setStep('form');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (step === 'payment' && pendingPropertyData) {
        return (
            <PromotionSelector
                pendingPropertyData={pendingPropertyData}
                onPaymentSuccess={handlePromotionPaymentSuccess}
                onSkip={handlePostWithoutPromotion}
                onBack={() => setStep('form')}
                isSubmitting={isSubmitting}
            />
        );
    }

    if (step === 'success') {
        return (
            <div className="text-center py-12 flex flex-col items-center">
                <CheckCircleIcon className="w-16 h-16 text-green-500 mb-4" />
                <h3 className="text-2xl font-bold text-neutral-800">Listing {propertyToEdit ? 'Updated' : 'Published'} Successfully!</h3>
                <p className="text-neutral-600 mt-2">Redirecting you to your dashboard...</p>
            </div>
        )
    }

    if (step === 'loading') {
        return (
             <div className="text-center py-12 flex flex-col items-center">
                <MarketInsightsAnimation
                    city={selectedCity?.name}
                    country={selectedCountry || 'Serbia'}
                    propertyType={listingData.propertyType}
                />
            </div>
        );
    }

    return (
        <>
        <form onSubmit={handleSubmit}>
            <div className="bg-primary-light text-primary-dark/90 text-sm p-4 rounded-lg mb-6 border border-primary/20">
                <p><strong>Photo Tips:</strong> For best results, include well-lit, high-resolution photos of the exterior, kitchen, living rooms, bedrooms, and bathrooms. The more details you show, the better your AI-generated listing will be!</p>
            </div>
            <div className="flex justify-center mb-6">
                 <div className="bg-neutral-100 p-1 rounded-full flex items-center space-x-1 border border-neutral-200 shadow-sm max-w-sm">
                    <button type="button" onClick={() => setMode('ai')} className={`w-1/2 px-4 py-2 rounded-full text-sm font-semibold transition-all duration-300 flex items-center justify-center gap-2 whitespace-nowrap ${mode === 'ai' ? 'bg-white text-primary shadow' : 'text-neutral-600 hover:bg-neutral-200'}`}><SparklesIcon className="w-4 h-4" /> AI Creator</button>
                    <button type="button" onClick={() => setMode('manual')} className={`w-1/2 px-4 py-2 rounded-full text-sm font-semibold transition-all duration-300 flex items-center justify-center gap-2 whitespace-nowrap ${mode === 'manual' ? 'bg-white text-primary shadow' : 'text-neutral-600 hover:bg-neutral-200'}`}>Manual Entry</button>
                </div>
            </div>

            {/* Role Selector - only show if user has multiple roles */}
            {currentUser && !propertyToEdit && (
                <RoleSelector
                    currentUser={currentUser}
                    selectedRole={selectedRole}
                    onRoleSelect={setSelectedRole}
                />
            )}

            {mode === 'ai' && step === 'init' && (
                <div className="animate-fade-in">
                    <div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                            <div className="relative">
                                <select id="language" value={language} onChange={(e) => setLanguage(e.target.value)} className={`${floatingInputClasses} border-neutral-300`}>
                                    {LANGUAGES.map(lang => <option key={lang} value={lang}>{lang}</option>)}
                                </select>
                                <label htmlFor="language" className={floatingSelectLabelClasses}>Description Language</label>
                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-neutral-500"><svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg></div>
                            </div>
                            <div className="relative">
                                <select id="aiPropertyType" value={aiPropertyType} onChange={(e) => setAiPropertyType(e.target.value as any)} className={`${floatingInputClasses} border-neutral-300`}>
                                    <option value="house">House</option>
                                    <option value="apartment">Apartment</option>
                                    <option value="villa">Villa</option>
                                    <option value="other">Other</option>
                                </select>
                                <label htmlFor="aiPropertyType" className={floatingSelectLabelClasses}>Property Type</label>
                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-neutral-500"><svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg></div>
                            </div>
                        </div>
                        <label htmlFor="image-upload" className="flex flex-col items-center justify-center w-full h-48 border-2 border-neutral-300 border-dashed rounded-lg cursor-pointer bg-neutral-50 hover:bg-neutral-100">
                            <div className="flex flex-col items-center justify-center pt-5 pb-6"><UploadIcon className="w-10 h-10 mb-3 text-neutral-400" /><p className="mb-2 text-sm text-neutral-500"><span className="font-semibold">Click to upload photos</span></p><p className="text-xs text-neutral-500">PNG, JPG or WEBP</p></div>
                            <input id="image-upload" type="file" multiple accept="image/*" className="hidden" onChange={handleImageChange} />
                        </label>
                        {images.length > 0 && (
                            <div className="mt-4"><p className="font-semibold text-sm mb-2">{images.length} image(s) selected:</p><div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">{images.map((img, index) => (<div key={index} className="relative group"><img src={img.previewUrl} alt={`preview ${index}`} className="w-full h-24 object-cover rounded-md" /><button type="button" onClick={() => removeImage(index)} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity">&times;</button></div>))}</div></div>
                        )}
                         <button type="button" onClick={handleGenerate} className="w-full mt-6 py-3 text-lg font-bold text-white bg-primary rounded-lg shadow-md hover:bg-primary-dark transition-colors flex items-center justify-center gap-2" disabled={images.length === 0}><SparklesIcon className="w-6 h-6"/>Generate Listing</button>
                    </div>
                </div>
            )}

            {(mode === 'manual' || (mode === 'ai' && step === 'form')) && (
                 <div className="space-y-8 animate-fade-in">
                    <fieldset className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Country Dropdown */}
                        <div className="relative">
                            <select
                                id="country"
                                value={selectedCountry}
                                onChange={handleCountryChange}
                                className={`${floatingInputClasses} border-neutral-300`}
                                required
                            >
                                <option value="">Select Country</option>
                                {BALKAN_LOCATIONS.map(country => (
                                    <option key={country.code} value={country.name}>
                                        {country.name}
                                    </option>
                                ))}
                            </select>
                            <label htmlFor="country" className={floatingSelectLabelClasses}>Country</label>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-neutral-500">
                                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                                    <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
                                </svg>
                            </div>
                        </div>

                        {/* City Dropdown */}
                        <div className="relative">
                            <select
                                id="city"
                                value={selectedCity}
                                onChange={handleCityChange}
                                className={`${floatingInputClasses} border-neutral-300`}
                                required
                                disabled={!selectedCountry}
                            >
                                <option value="">Select City</option>
                                {availableCities.map(city => (
                                    <option key={city.name} value={city.name}>
                                        {city.name}
                                    </option>
                                ))}
                            </select>
                            <label htmlFor="city" className={floatingSelectLabelClasses}>City</label>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-neutral-500">
                                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                                    <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
                                </svg>
                            </div>
                        </div>

                        {/* Show interactive map when city is selected */}
                        {selectedCity && listingData.lat !== 0 && listingData.lng !== 0 && (
                            <div className="md:col-span-2">
                                <MapLocationPicker
                                    lat={listingData.lat}
                                    lng={listingData.lng}
                                    address={listingData.streetAddress || `${selectedCity}, ${selectedCountry}`}
                                    zoom={getZoomLevel}
                                    country={selectedCountry}
                                    city={selectedCity}
                                    cityLat={cityData?.lat}
                                    cityLng={cityData?.lng}
                                    onLocationChange={handleMapLocationChange}
                                    onAddressChange={handleMapAddressChange}
                                />
                            </div>
                        )}

                        <div className="relative md:col-span-2 cursor-text" onClick={() => document.getElementById('title')?.focus()}>
                            <input type="text" id="title" name="title" value={listingData.title} onChange={handleInputChange} className={`${floatingInputClasses} border-neutral-300`} placeholder=" " required maxLength={50} />
                            <label htmlFor="title" className={floatingLabelClasses}>Listing Title</label>
                            <div className="flex justify-between items-center mt-1">
                                <p className="text-xs text-neutral-500">
                                    Short, catchy title (e.g., "Luxury Sea View Villa", "Cozy Studio Downtown")
                                </p>
                                <span className={`text-xs ${listingData.title.length > 40 ? 'text-amber-600' : 'text-neutral-400'}`}>
                                    {listingData.title.length}/50
                                </span>
                            </div>
                        </div>

                        <div className="relative md:col-span-2 cursor-text" onClick={() => document.getElementById('streetAddress')?.focus()}>
                            <input type="text" id="streetAddress" name="streetAddress" value={listingData.streetAddress} onChange={handleInputChange} className={`${floatingInputClasses} border-neutral-300`} placeholder=" " />
                            <label htmlFor="streetAddress" className={floatingLabelClasses}>Address</label>
                            <p className="mt-1 text-xs text-neutral-500">
                                This will be auto-filled from the Property Location you select on the map
                                <br />
                                <span className="text-neutral-400">Examples: Rr. Muharrem Fejza 23 • Bulevar Kralja Aleksandra 45 • Ul. Makedonija 12 • Trg Krešimira Ćosića 7</span>
                            </p>
                        </div>

                        <div className="relative md:col-span-2 cursor-text" onClick={() => document.getElementById('price')?.focus()}>
                            <input type="text" id="price" inputMode="numeric" name="price" value={listingData.price > 0 ? new Intl.NumberFormat('de-DE').format(listingData.price) : ''} onChange={handlePriceChange} className={`${floatingInputClasses} border-neutral-300 pl-8`} placeholder=" " required />
                            <label htmlFor="price" className={floatingLabelClasses}>Price</label>
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500">{getCurrencySymbol(selectedCountry)}</span>
                        </div>
                    </fieldset>

                    <fieldset className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"><NumberInputWithSteppers label="Bedrooms" value={listingData.bedrooms} onChange={(val) => setListingData(p => ({ ...p, bedrooms: val }))} /><NumberInputWithSteppers label="Bathrooms" value={listingData.bathrooms} onChange={(val) => setListingData(p => ({ ...p, bathrooms: val }))} /><NumberInputWithSteppers label="Living Rooms" value={listingData.livingRooms} onChange={(val) => setListingData(p => ({ ...p, livingRooms: val }))} /><NumberInputWithSteppers label="Area (m²)" value={listingData.sq_meters} step={5} onChange={(val) => setListingData(p => ({ ...p, sq_meters: val }))} /><NumberInputWithSteppers label="Year Built" value={listingData.year_built} max={new Date().getFullYear()} onChange={(val) => setListingData(p => ({ ...p, year_built: val }))} /><NumberInputWithSteppers label="Parking Spots" value={listingData.parking_spots} onChange={(val) => setListingData(p => ({ ...p, parking_spots: val }))} /></fieldset>
                    <fieldset className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end"><div className="relative"><select name="propertyType" id="propertyType" value={listingData.propertyType} onChange={handleInputChange} className={`${floatingInputClasses} border-neutral-300`}><option value="house">House</option><option value="apartment">Apartment</option><option value="villa">Villa</option><option value="other">Other</option></select><label htmlFor="propertyType" className={floatingSelectLabelClasses}>Property Type</label></div>{listingData.propertyType === 'apartment' && (<NumberInputWithSteppers label="Floor Number" value={listingData.floorNumber} onChange={(val) => setListingData(p => ({ ...p, floorNumber: val }))} min={1} />)}{(listingData.propertyType === 'house' || listingData.propertyType === 'villa') && (<NumberInputWithSteppers label="Total Floors" value={listingData.totalFloors} min={1} onChange={(val) => setListingData(p => ({ ...p, totalFloors: val }))} />)}</fieldset>
                    <fieldset><TagListInput label="Special Features" tags={listingData.specialFeatures} setTags={(tags) => setListingData(p => ({ ...p, specialFeatures: tags }))} /></fieldset>
                    <fieldset><TagListInput label="Materials" tags={listingData.materials} setTags={(tags) => setListingData(p => ({ ...p, materials: tags }))} /></fieldset>
                    <fieldset>
                        <TagListInput
                            label="Amenities (e.g., #gym, #pool, #parking, #wifi)"
                            tags={listingData.amenities}
                            setTags={(tags) => setListingData(p => ({ ...p, amenities: tags }))}
                        />
                        <p className="text-xs text-neutral-500 mt-1">Add hashtag-style amenities that buyers can search for</p>
                    </fieldset>

                    {/* Mandatory Amenities Section */}
                    <fieldset className="space-y-4 p-4 bg-neutral-50 rounded-lg border border-neutral-200">
                        <h3 className="text-base font-semibold text-neutral-800 mb-3">Property Features</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            <TriStateCheckbox
                                label="Balcony/Terrace"
                                value={listingData.hasBalcony}
                                onChange={(val) => setListingData(p => ({ ...p, hasBalcony: val }))}
                            />
                            <TriStateCheckbox
                                label="Garden/Yard"
                                value={listingData.hasGarden}
                                onChange={(val) => setListingData(p => ({ ...p, hasGarden: val }))}
                            />
                            <TriStateCheckbox
                                label="Elevator"
                                value={listingData.hasElevator}
                                onChange={(val) => setListingData(p => ({ ...p, hasElevator: val }))}
                            />
                            <TriStateCheckbox
                                label="Security System"
                                value={listingData.hasSecurity}
                                onChange={(val) => setListingData(p => ({ ...p, hasSecurity: val }))}
                            />
                            <TriStateCheckbox
                                label="Air Conditioning"
                                value={listingData.hasAirConditioning}
                                onChange={(val) => setListingData(p => ({ ...p, hasAirConditioning: val }))}
                            />
                            <TriStateCheckbox
                                label="Swimming Pool"
                                value={listingData.hasPool}
                                onChange={(val) => setListingData(p => ({ ...p, hasPool: val }))}
                            />
                            <TriStateCheckbox
                                label="Pets Allowed"
                                value={listingData.petsAllowed}
                                onChange={(val) => setListingData(p => ({ ...p, petsAllowed: val }))}
                            />
                        </div>
                        <p className="text-xs text-neutral-500 mt-2">Select "Yes" if available, "No" if not available, or leave as "Any" to skip</p>
                    </fieldset>

                    {/* Advanced Property Details Section */}
                    <fieldset className="space-y-4 p-4 bg-neutral-50 rounded-lg border border-neutral-200">
                        <h3 className="text-base font-semibold text-neutral-800 mb-3">Advanced Property Details</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {/* Furnishing Status */}
                            <div className="relative">
                                <select
                                    id="furnishing"
                                    name="furnishing"
                                    value={listingData.furnishing}
                                    onChange={handleInputChange}
                                    className={`${floatingInputClasses} border-neutral-300`}
                                >
                                    <option value="any">Not Specified</option>
                                    <option value="furnished">Fully Furnished</option>
                                    <option value="semi-furnished">Semi-Furnished</option>
                                    <option value="unfurnished">Unfurnished</option>
                                </select>
                                <label htmlFor="furnishing" className={floatingSelectLabelClasses}>Furnishing</label>
                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-neutral-500">
                                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                                </div>
                            </div>

                            {/* Heating Type */}
                            <div className="relative">
                                <select
                                    id="heatingType"
                                    name="heatingType"
                                    value={listingData.heatingType}
                                    onChange={handleInputChange}
                                    className={`${floatingInputClasses} border-neutral-300`}
                                >
                                    <option value="any">Not Specified</option>
                                    <option value="central">Central Heating</option>
                                    <option value="electric">Electric</option>
                                    <option value="gas">Gas</option>
                                    <option value="oil">Oil</option>
                                    <option value="heat-pump">Heat Pump</option>
                                    <option value="solar">Solar</option>
                                    <option value="wood">Wood/Fireplace</option>
                                    <option value="none">No Heating</option>
                                </select>
                                <label htmlFor="heatingType" className={floatingSelectLabelClasses}>Heating Type</label>
                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-neutral-500">
                                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                                </div>
                            </div>

                            {/* Property Condition */}
                            <div className="relative">
                                <select
                                    id="condition"
                                    name="condition"
                                    value={listingData.condition}
                                    onChange={handleInputChange}
                                    className={`${floatingInputClasses} border-neutral-300`}
                                >
                                    <option value="any">Not Specified</option>
                                    <option value="new">New Construction</option>
                                    <option value="excellent">Excellent</option>
                                    <option value="good">Good</option>
                                    <option value="fair">Fair</option>
                                    <option value="needs-renovation">Needs Renovation</option>
                                </select>
                                <label htmlFor="condition" className={floatingSelectLabelClasses}>Condition</label>
                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-neutral-500">
                                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                                </div>
                            </div>

                            {/* View Type */}
                            <div className="relative">
                                <select
                                    id="viewType"
                                    name="viewType"
                                    value={listingData.viewType}
                                    onChange={handleInputChange}
                                    className={`${floatingInputClasses} border-neutral-300`}
                                >
                                    <option value="any">Not Specified</option>
                                    <option value="sea">Sea View</option>
                                    <option value="mountain">Mountain View</option>
                                    <option value="city">City View</option>
                                    <option value="park">Park View</option>
                                    <option value="garden">Garden View</option>
                                    <option value="street">Street View</option>
                                </select>
                                <label htmlFor="viewType" className={floatingSelectLabelClasses}>View Type</label>
                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-neutral-500">
                                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                                </div>
                            </div>

                            {/* Energy Rating */}
                            <div className="relative">
                                <select
                                    id="energyRating"
                                    name="energyRating"
                                    value={listingData.energyRating}
                                    onChange={handleInputChange}
                                    className={`${floatingInputClasses} border-neutral-300`}
                                >
                                    <option value="any">Not Specified</option>
                                    <option value="A+">A+ (Most Efficient)</option>
                                    <option value="A">A</option>
                                    <option value="B">B</option>
                                    <option value="C">C</option>
                                    <option value="D">D</option>
                                    <option value="E">E</option>
                                    <option value="F">F</option>
                                    <option value="G">G (Least Efficient)</option>
                                </select>
                                <label htmlFor="energyRating" className={floatingSelectLabelClasses}>Energy Rating</label>
                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-neutral-500">
                                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                                </div>
                            </div>
                        </div>
                        <p className="text-xs text-neutral-500 mt-2">Provide detailed property information to help buyers find your listing through advanced filters</p>
                    </fieldset>

                    <fieldset><label htmlFor="description" className="block text-sm font-medium text-neutral-700 mb-1">Description</label><textarea id="description" name="description" value={listingData.description} onChange={handleInputChange} className={`${inputBaseClasses} h-48`} required /></fieldset>
                    
                    <fieldset>
                        <label className="block text-sm font-medium text-neutral-700 mb-1">Image Management</label>
                        <div className="p-4 border rounded-lg bg-neutral-50/70">
                             <label htmlFor="image-upload-manual" className="flex flex-col items-center justify-center w-full h-32 border-2 border-neutral-300 border-dashed rounded-lg cursor-pointer bg-white hover:bg-neutral-50 mb-4">
                                <div className="flex flex-col items-center justify-center">
                                    <UploadIcon className="w-8 h-8 mb-2 text-neutral-400" />
                                    <p className="text-sm text-neutral-500">{images.length > 0 ? 'Upload more or replace images' : 'Upload property images'}</p>
                                </div>
                                <input id="image-upload-manual" type="file" multiple accept="image/*" className="hidden" onChange={handleImageChange} />
                            </label>

                            {images.length > 0 && (
                                <div>
                                    <div className="flex items-center gap-2 bg-blue-100 text-blue-800 text-sm p-3 rounded-lg mb-4">
                                        <InfoIcon className="w-8 h-8 flex-shrink-0"/>
                                        <p>Drag and drop images to reorder them. The first image will be the main cover photo for your listing.</p>
                                    </div>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-4">
                                        {images.map((img, index) => (
                                            <div 
                                                key={img.previewUrl}
                                                className="relative group cursor-grab"
                                                draggable
                                                onDragStart={(e) => handleDragStart(e, index)}
                                                onDragEnter={(e) => handleDragEnter(e, index)}
                                                onDragEnd={handleDragEnd}
                                                onDrop={handleDrop}
                                                onDragOver={(e) => e.preventDefault()}
                                            >
                                                <img src={img.previewUrl} alt={`preview ${index}`} className="w-full h-24 object-cover rounded-md mb-2 border" />
                                                <button type="button" onClick={() => removeImage(index)} className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity z-10">&times;</button>
                                                <ImageTagSelector
                                                    value={listingData.image_tags.find(t => t.index === index)?.tag || 'other'}
                                                    options={ALL_VALID_TAGS}
                                                    onChange={(tag) => handleImageTagChange(index, tag)}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </fieldset>
                    
                    <div>
                        <h4 className="font-semibold text-neutral-800 mb-2 mt-4">Floor Plan (Optional)</h4>
                        <label htmlFor="floorplan-upload" className="flex flex-col items-center justify-center w-full h-32 border-2 border-neutral-300 border-dashed rounded-lg cursor-pointer bg-white hover:bg-neutral-50">
                            <div className="flex flex-col items-center justify-center"><UploadIcon className="w-8 h-8 mb-2 text-neutral-400" /><p className="text-sm text-neutral-500">Upload floor plan image</p></div>
                            <input id="floorplan-upload" type="file" accept="image/*" className="hidden" onChange={handleFloorplanImageChange} />
                        </label>
                        {floorplanImage.previewUrl && (
                            <div className="mt-2 relative inline-block"><img src={floorplanImage.previewUrl} alt="floorplan" className="w-32 h-32 object-cover rounded-md" /><button type="button" onClick={() => setFloorplanImage({file: null, previewUrl: ''})} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">&times;</button></div>
                        )}
                    </div>

                    {/* 360 Virtual Tour URL */}
                    <fieldset className="space-y-4 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200">
                        <div className="flex items-center gap-2 mb-2">
                            <svg className="w-6 h-6 text-purple-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10" />
                                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                                <path d="M2 12h20" />
                            </svg>
                            <h3 className="text-base font-semibold text-purple-900">360° Virtual Tour (Optional)</h3>
                        </div>
                        <p className="text-sm text-purple-700 mb-3">
                            Add an immersive 360° virtual tour to help buyers explore your property remotely.
                            Supports Matterport, Kuula, Zillow 3D Home, and other 360 tour providers.
                        </p>
                        <div className="relative">
                            <input
                                type="url"
                                id="virtualTour360Url"
                                name="virtualTour360Url"
                                value={listingData.virtualTour360Url}
                                onChange={handleInputChange}
                                placeholder="https://my.matterport.com/show/?m=... or https://kuula.co/share/..."
                                className={`${floatingInputClasses} border-purple-300 focus:border-purple-500 focus:ring-purple-500`}
                            />
                            <label htmlFor="virtualTour360Url" className={`${floatingLabelClasses} text-purple-700 peer-focus:text-purple-600`}>
                                360° Tour URL
                            </label>
                        </div>
                        <p className="text-xs text-purple-600">
                            Paste the embed or share URL from your 360 tour provider. The tour will be displayed as an interactive iframe on your listing.
                        </p>
                    </fieldset>

                    {/* Progress Indicators */}
                    {(isCompressing || isUploading || isSubmitting) && (
                        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                            <div className="flex items-center gap-3 mb-2">
                                <SpinnerIcon className="w-5 h-5 text-blue-600 animate-spin" />
                                <span className="text-sm font-semibold text-blue-800">
                                    {isCompressing && 'Compressing images...'}
                                    {isUploading && 'Uploading to cloud...'}
                                    {isSubmitting && !isUploading && 'Creating listing...'}
                                </span>
                            </div>
                            {isUploading && (
                                <div className="w-full bg-blue-200 rounded-full h-2">
                                    <div
                                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                        style={{ width: `${uploadProgress}%` }}
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    {!propertyToEdit && (
                        <div className="bg-white border border-gray-300 rounded-lg p-6 mb-6">
                            <div className="flex items-start gap-3 mb-4">
                                <div className="flex-shrink-0">
                                    <span className="text-2xl">🚀</span>
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-base font-bold text-gray-900 mb-1">
                                        Promote Your Listing
                                    </h3>
                                    <p className="text-sm text-gray-600">
                                        Get more visibility and inquiries with promoted placement
                                    </p>
                                </div>
                            </div>

                            <label htmlFor="wantToPromote" className="flex items-start gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    id="wantToPromote"
                                    checked={wantToPromote}
                                    onChange={(e) => setWantToPromote(e.target.checked)}
                                    className="mt-0.5 w-5 h-5 text-primary border-gray-300 rounded focus:ring-2 focus:ring-primary"
                                />
                                <div className="flex-1">
                                    <span className="text-sm font-semibold text-gray-900">
                                        I want to promote this listing
                                    </span>
                                    <p className="text-xs text-gray-600 mt-1">
                                        You'll choose your promotion plan and complete payment on the next page before publishing.
                                    </p>
                                </div>
                            </label>

                            {wantToPromote && (
                                <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                                    <div className="flex items-start gap-2">
                                        <span className="text-lg">✓</span>
                                        <div className="flex-1">
                                            <p className="text-sm font-medium text-green-900 mb-1">
                                                Promotion selected
                                            </p>
                                            <p className="text-xs text-green-700">
                                                On the next page, you'll select your promotion tier (from €1.99), duration, and apply any discount coupons before publishing.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="flex justify-end pt-4">
                        <button
                            type="submit"
                            disabled={isSubmitting || isCompressing || isUploading}
                            className="px-8 py-3 bg-primary text-white font-bold rounded-lg shadow-md hover:bg-primary-dark transition-colors w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? 'Saving...' : (
                                propertyToEdit ? 'Update Listing' : (
                                    wantToPromote ? 'Continue to Payment' : 'Publish Listing'
                                )
                            )}
                        </button>
                    </div>
                 </div>
            )}
        </form>
        </>
    );
};

export default GeminiDescriptionGenerator;