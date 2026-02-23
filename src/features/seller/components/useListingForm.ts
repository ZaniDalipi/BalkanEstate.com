import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Property, PropertyImage, PropertyImageTag, UserRole } from '@/types';
import { generateDescriptionFromImages, calculatePropertyDistances, LocationContext } from '@/services/geminiService';
import { useAppContext } from '@/context/AppContext';
import { useAlert } from '@/context/AlertContext';
import { BALKAN_LOCATIONS, CityData } from '@/utils/balkanLocations';
import * as api from '@/services/apiService';
import imageCompression from 'browser-image-compression';
import { PLAN_LISTING_LIMITS } from '@/shared/utils/subscriptionHelpers';
import { SubscriptionPlan } from '@/shared/types/user.types';
import { API_URL } from '@/src/shared/api/config';
import { ListingData, ImageData, Step, Mode, initialListingData, ALL_VALID_TAGS } from './ListingFormHelpers';

/** Builds a preview Property object from form state (no API calls, no uploads). */
export function buildPreviewProperty(
    listingData: ListingData,
    images: ImageData[],
    floorplanImage: ImageData,
    selectedCountry: string,
    selectedCity: string,
    selectedRole: UserRole,
    currentUser: { id: string; name: string; phone?: string; avatarUrl?: string } | null,
    propertyToEdit: Property | null,
): Property {
    const imageUrls = images.map((img, index) => {
        const tagInfo = listingData.image_tags.find(t => t.index === index);
        return {
            url: img.previewUrl,
            tag: (tagInfo?.tag as PropertyImageTag) || 'other',
        };
    });

    return {
        id: propertyToEdit?.id || `preview-${Date.now()}`,
        sellerId: currentUser?.id || '',
        listingType: listingData.listingType || 'sale',
        status: propertyToEdit?.status || 'active',
        title: listingData.title.trim() || undefined,
        price: Number(listingData.price),
        address: listingData.streetAddress.trim(),
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
        imageUrl: images.length > 0 ? images[0].previewUrl : 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=500',
        images: imageUrls,
        lat: listingData.lat,
        lng: listingData.lng,
        seller: {
            type: selectedRole === UserRole.AGENT ? 'agent' : 'private',
            name: currentUser?.name || '',
            phone: currentUser?.phone,
            avatarUrl: currentUser?.avatarUrl,
        },
        propertyType: listingData.propertyType,
        floorNumber: Number(listingData.floorNumber) || undefined,
        totalFloors: Number(listingData.totalFloors) || undefined,
        floorplanUrl: floorplanImage.previewUrl || undefined,
        createdAt: propertyToEdit?.createdAt || Date.now(),
        lastRenewed: Date.now(),
        views: propertyToEdit?.views || 0,
        saves: propertyToEdit?.saves || 0,
        inquiries: propertyToEdit?.inquiries || 0,
        createdAsRole: selectedRole,
        hasBalcony: listingData.hasBalcony ?? false,
        hasGarden: listingData.hasGarden ?? false,
        hasElevator: listingData.hasElevator ?? false,
        hasSecurity: listingData.hasSecurity ?? false,
        hasAirConditioning: listingData.hasAirConditioning ?? false,
        hasPool: listingData.hasPool ?? false,
        petsAllowed: listingData.petsAllowed ?? false,
        furnishing: listingData.furnishing !== 'any' ? listingData.furnishing : undefined,
        heatingType: listingData.heatingType !== 'any' ? listingData.heatingType : undefined,
        condition: listingData.condition !== 'any' ? listingData.condition : undefined,
        viewType: listingData.viewType !== 'any' ? listingData.viewType : undefined,
        energyRating: listingData.energyRating !== 'any' ? listingData.energyRating : undefined,
        orientation: listingData.orientation !== 'any' ? listingData.orientation : undefined,
        ...(listingData.listingType === 'rent' ? {
            rentPeriod: listingData.rentPeriod || 'monthly',
            securityDeposit: Number(listingData.securityDeposit) || 0,
            minimumLeaseDuration: Number(listingData.minimumLeaseDuration) || 1,
            maximumLeaseDuration: Number(listingData.maximumLeaseDuration) || 12,
            availableFrom: listingData.availableFrom ? new Date(listingData.availableFrom).getTime() : undefined,
            utilitiesIncluded: listingData.utilitiesIncluded ?? false,
            internetIncluded: listingData.internetIncluded ?? false,
            tenantRequirements: listingData.tenantRequirements || [],
            maxOccupants: Number(listingData.maxOccupants) || 1,
        } : {}),
        ...(listingData.visitAvailability.enabled ? {
            visitAvailability: listingData.visitAvailability,
        } : {}),
    } as Property;
}

export const useListingForm = (propertyToEdit: Property | null) => {
    const { t } = useTranslation(['newListing', 'seller', 'common', 'validation']);
    const { state, dispatch, updateUser, createListing, updateListing } = useAppContext();
    const { currentUser, properties, isPricingModalOpen, pendingProperty, isAuthenticating, isLoadingUserData } = state;
    const { showError, showWarning, showSuccess, showInfo } = useAlert();
    const [mode, setMode] = useState<Mode>('manual');
    const [step, setStep] = useState<Step>('init');
    const [images, setImages] = useState<ImageData[]>([]);
    const [floorplanImage, setFloorplanImage] = useState<ImageData>({ file: null, previewUrl: '' });

    // Determine initial listingType based on current view
    const initialType = state.activeView === 'create-rental' ? 'rent' : 'sale';
    const [listingData, setListingData] = useState<ListingData>({
        ...initialListingData,
        listingType: propertyToEdit?.listingType || initialType as any,
    });
    const [language, setLanguage] = useState('English');
    const [aiPropertyType, setAiPropertyType] = useState<'house' | 'apartment' | 'villa' | 'land' | 'other'>('house');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [wantToPromote, setWantToPromote] = useState(false);
    const [pendingPropertyData, setPendingPropertyData] = useState<Property | null>(null);

    // Smart role selection: Buyer Pro users always post as private_seller.
    // Non-pro buyers (shouldn't reach here) also fall back to private_seller.
    const getInitialRole = (): UserRole => {
        const currentRole = currentUser?.activeRole || currentUser?.role;

        // Buyers always post under private_seller role context
        if (currentRole === 'buyer' || (currentRole as string) === (UserRole.BUYER as string)) {
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

    // Form container ref for scrolling
    const formContainerRef = useRef<HTMLDivElement>(null);

    // Location State
    const [selectedCountry, setSelectedCountry] = useState('');
    const [selectedCity, setSelectedCity] = useState('');
    const [availableCities, setAvailableCities] = useState<CityData[]>([]);

    // Track modal state to react to it closing
    const wasModalOpen = useRef(isPricingModalOpen);
    useEffect(() => {
        if (wasModalOpen.current && !isPricingModalOpen && pendingProperty) {
            // Get listing limit from PLAN_LISTING_LIMITS (source of truth) with fallbacks
            const productId = currentUser?.subscription?.productId as SubscriptionPlan | undefined;
            const listingsLimit = (productId && PLAN_LISTING_LIMITS[productId]) || currentUser?.subscription?.listingsLimit || 3;
            const tierName = currentUser?.subscription?.tier === 'pro' ? 'Pro' : 'Free';
            showError(t('seller:errors.listingLimitReached'), t('seller:errors.listingLimitMessage', { tierName, limit: listingsLimit }));
            dispatch({ type: 'SET_PENDING_PROPERTY', payload: null });
        }
        wasModalOpen.current = isPricingModalOpen;
    }, [isPricingModalOpen, pendingProperty, currentUser?.subscription, dispatch, showError]);

    // Populate form if editing
    useEffect(() => {
        if (propertyToEdit) {
            setMode('manual');
            setStep('form');

            setListingData({
                title: propertyToEdit.title || '',
                listingType: propertyToEdit.listingType || 'sale',
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
                image_tags: (propertyToEdit.images || []).map((img, index) => ({
                    index,
                    tag: (typeof img === 'object' && img?.tag) || 'other'
                })),
                lat: propertyToEdit.lat || 0,
                lng: propertyToEdit.lng || 0,
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
                orientation: propertyToEdit.orientation || 'any',
                // Rental-specific fields
                rentPeriod: propertyToEdit.rentPeriod || 'monthly',
                securityDeposit: propertyToEdit.securityDeposit || 0,
                minimumLeaseDuration: propertyToEdit.minimumLeaseDuration || 1,
                maximumLeaseDuration: propertyToEdit.maximumLeaseDuration || 12,
                availableFrom: propertyToEdit.availableFrom ? new Date(propertyToEdit.availableFrom).toISOString().split('T')[0] : '',
                utilitiesIncluded: propertyToEdit.utilitiesIncluded || false,
                internetIncluded: propertyToEdit.internetIncluded || false,
                tenantRequirements: propertyToEdit.tenantRequirements || [],
                maxOccupants: propertyToEdit.maxOccupants || 1,
                // Visit availability
                visitAvailability: propertyToEdit.visitAvailability || {
                    enabled: false,
                    days: [1, 2, 3, 4, 5],
                    startTime: '09:00',
                    endTime: '18:00',
                    slotDurationMinutes: 30,
                    notes: '',
                },
            });

            // Set country and city from property
            setSelectedCountry(propertyToEdit.country);
            setSelectedCity(propertyToEdit.city);

            // Load cities for the country
            const country = BALKAN_LOCATIONS.find(c => c.name === propertyToEdit.country);
            if (country) {
                setAvailableCities(country.cities);
            }

            // Robustly load existing images - handle both object and string formats
            const existingImages: ImageData[] = (propertyToEdit.images || []).map(img => {
                // Handle both {url: string} objects and plain string URLs
                const imageUrl = typeof img === 'string' ? img : (img?.url || (img as any)?.previewUrl || '');
                return { file: null, previewUrl: imageUrl };
            }).filter(img => img.previewUrl); // Filter out any empty URLs
            setImages(existingImages);
            // Log removed
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
            // Set coordinates to city center and default address to "City, Country"
            setListingData(prev => ({
                ...prev,
                lat: city.lat,
                lng: city.lng,
                streetAddress: `${cityName}, ${selectedCountry}`,
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
        // Log removed
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
                showWarning(t('newListing:imageUpload.maxImages', { count: 30 }), t('newListing:errors.removeImagesFirst'));
                e.target.value = '';
                return;
            }
            showWarning(t('newListing:imageUpload.maxImages', { count: 30 }), t('newListing:errors.onlyMoreImages', { count: availableSlots }));
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
                    // Log removed

                    const compressedFile = await imageCompression(file, compressionOptions);

                    // Log removed

                    compressedImages.push({
                        file: compressedFile,
                        previewUrl: URL.createObjectURL(compressedFile)
                    });
                } catch (compressionError) {
                    // Error removed
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

            // Log removed
        } catch (error) {
            // Error removed
            showError(t('newListing:errors.imageProcessingFailed'), t('newListing:errors.failedToProcessImages'));
        } finally {
            setIsCompressing(false);
            // Reset input so the same files can be selected again if needed
            e.target.value = '';
        }
    };

    const handleFloorplanImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];

            // Validate file format
            const ALLOWED_FORMATS = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];
            if (!ALLOWED_FORMATS.includes(file.type)) {
                showError(
                    t('newListing:floorplan.invalidFormat', 'Invalid File Format'),
                    t('newListing:floorplan.invalidFormatMessage', 'Please upload a valid image file (JPEG, PNG, WebP, GIF, or SVG).')
                );
                return;
            }

            // Validate file size (max 10MB before compression)
            const MAX_FILE_SIZE = 10 * 1024 * 1024;
            if (file.size > MAX_FILE_SIZE) {
                showError(
                    t('newListing:floorplan.fileTooLarge', 'File Too Large'),
                    t('newListing:floorplan.fileTooLargeMessage', 'Floor plan image must be under 10MB. Your file is {{size}}MB.', { size: (file.size / (1024 * 1024)).toFixed(1) })
                );
                return;
            }

            // Compress floorplan image
            setIsCompressing(true);
            try {
                const compressionOptions = {
                    maxSizeMB: 0.5,
                    maxWidthOrHeight: 1920,
                    useWebWorker: true,
                    fileType: 'image/jpeg' as const,
                    initialQuality: 0.8,
                };

                const compressedFile = await imageCompression(file, compressionOptions);

                setFloorplanImage({ file: compressedFile, previewUrl: URL.createObjectURL(compressedFile) });
            } catch (error) {
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
            showError(t('validation:imagesRequired'), t('newListing:validation.imagesRequired'));
            return;
        }
        setStep('loading');
        // Scroll to top when entering loading state
        window.scrollTo({ top: 0, behavior: 'smooth' });
        try {
            const imageFiles = images.map(img => img.file).filter((f): f is File => f !== null);
            if (imageFiles.length === 0) {
                if (images.some(img => img.previewUrl)) {
                    setStep('form');
                    return;
                }
                showError(t('newListing:errors.noNewImages'), t('newListing:errors.noNewImagesMessage'));
                setStep('init');
                return;
            }

            // Build location context for AI if location info is available
            const locationContext: LocationContext | undefined =
                (selectedCountry || selectedCity || listingData.streetAddress)
                    ? {
                        country: selectedCountry || undefined,
                        city: selectedCity || undefined,
                        address: listingData.streetAddress || undefined,
                    }
                    : undefined;

            const result = await generateDescriptionFromImages(imageFiles, language, aiPropertyType, locationContext);

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
            // Scroll to top after generation completes
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (e) {
            // Error removed
            if (e instanceof Error) {
                showWarning(t('newListing:errors.aiGenerationFailed'), `${e.message}. ${t('newListing:errors.continueManualEntry')}`);
            } else {
                showWarning(t('newListing:errors.aiTemporarilyUnavailable'), t('newListing:errors.continueManualEntry'));
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

    // --- Preview Handlers ---
    const [previewProperty, setPreviewProperty] = useState<Property | null>(null);

    const handleGoToPreview = useCallback(() => {
        // Build a temporary Property object from the form data for preview display
        const preview = buildPreviewProperty(
            listingData, images, floorplanImage,
            selectedCountry, selectedCity, selectedRole,
            currentUser, propertyToEdit,
        );
        setPreviewProperty(preview);
        setStep('preview');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, [listingData, images, floorplanImage, selectedCountry, selectedCity, selectedRole, currentUser, propertyToEdit]);

    const handleBackToForm = useCallback(() => {
        setStep('form');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentUser) {
            showError(t('common:errors.authRequired'), t('newListing:errors.mustBeLoggedIn'));
            dispatch({ type: 'TOGGLE_AUTH_MODAL', payload: { isOpen: true, view: 'signup' } });
            return;
        }
        setIsSubmitting(true);

        // Validation
        if (!selectedCountry || !selectedCity) {
            showError(t('validation:locationRequired'), t('newListing:validation.selectCountryCity'));
            setIsSubmitting(false);
            return;
        }

        if (listingData.lat === 0 || listingData.lng === 0) {
            showError(t('validation:locationRequired'), t('newListing:validation.selectValidCity'));
            setIsSubmitting(false);
            return;
        }

        // Floor validation - skip for land
        if (listingData.propertyType !== 'land') {
            if (listingData.propertyType === 'apartment') {
                if (!listingData.floorNumber || listingData.floorNumber < 0) {
                    showError(t('validation:invalidFloorNumber'), t('newListing:validation.apartmentFloorNumber'));
                    setIsSubmitting(false);
                    return;
                }
                if (!listingData.totalFloors || listingData.totalFloors < 1) {
                    showError(t('validation:invalidFloorCount'), t('newListing:validation.apartmentTotalFloors'));
                    setIsSubmitting(false);
                    return;
                }
                if (listingData.floorNumber > listingData.totalFloors) {
                    showError(t('validation:invalidFloorNumber'), t('newListing:validation.floorExceedsTotal'));
                    setIsSubmitting(false);
                    return;
                }
                if (listingData.hasElevator === undefined) {
                    showError(t('validation:elevatorRequired'), t('newListing:validation.apartmentElevator'));
                    setIsSubmitting(false);
                    return;
                }
            }
            if ((listingData.propertyType === 'house' || listingData.propertyType === 'villa') && (!listingData.totalFloors || listingData.totalFloors < 1)) {
                showError(t('validation:invalidFloorCount'), t('newListing:validation.houseTotalFloors'));
                setIsSubmitting(false);
                return;
            }
        }

        try {
            // Step 1: Upload images to Cloudinary before creating the property
            let imageUrls: PropertyImage[] = [];

            // Get all image files that need to be uploaded (new images with file objects)
            const imagesToUpload = images
                .map((img, index) => ({ img, index }))
                .filter(({ img }) => img.file !== null);

            // Log removed

            // Check if we have new images to upload
            if (imagesToUpload.length > 0) {
                try {
                    setIsUploading(true);
                    setUploadProgress(0);
                    // Log removed

                    // Extract just the files (already compressed from handleImageChange)
                    const imageFiles = imagesToUpload.map(({ img }) => img.file!);

                    // Calculate total size for progress tracking
                    const totalSize = imageFiles.reduce((sum, file) => sum + file.size, 0);
                    // Log removed

                    // Upload to Cloudinary (without propertyId first, we'll get temp URLs)
                    const uploadedImages = await api.uploadPropertyImages(imageFiles);

                    setUploadProgress(100);
                    setIsUploading(false);
                    // Log removed

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
                    // Error removed
                    showError(t('newListing:errors.uploadFailed'), t('newListing:errors.uploadFailedMessage', { error: uploadError.message || t('common:errors.unknown') }));
                    setIsSubmitting(false);
                    return;
                }
            } else if (images.length > 0) {
                // All images are existing (editing mode), just use the preview URLs
                // Log removed
                imageUrls = images.map((img, index) => {
                    const tagInfo = listingData.image_tags.find(t => t.index === index);
                    return {
                        url: img.previewUrl,
                        tag: (tagInfo?.tag as PropertyImageTag) || 'other',
                    };
                });
                // Log removed
            } else {
                // Warning removed
            }

            // Step 2: Upload floorplan to Cloudinary if a new file was selected
            let floorplanUrl: string | undefined = undefined;
            if (floorplanImage.file) {
                try {
                    const uploadedFloorplan = await api.uploadPropertyImages([floorplanImage.file]);
                    if (uploadedFloorplan.length > 0) {
                        floorplanUrl = uploadedFloorplan[0].url;
                    }
                } catch (floorplanError: unknown) {
                    const errorMsg = floorplanError instanceof Error ? floorplanError.message : t('common:errors.unknown');
                    showError(
                        t('newListing:errors.uploadFailed'),
                        t('newListing:floorplan.uploadFailedMessage', 'Failed to upload floor plan: {{error}}', { error: errorMsg })
                    );
                    setIsSubmitting(false);
                    return;
                }
            } else if (floorplanImage.previewUrl && !floorplanImage.previewUrl.startsWith('blob:')) {
                // Existing Cloudinary URL from editing
                floorplanUrl = floorplanImage.previewUrl;
            }

            const { lat, lng } = listingData;

            // Use the address from Property Location (map search) - do not duplicate city/country
            const finalAddress = listingData.streetAddress.trim();

            // Calculate distances using Gemini AI (optional - won't block listing creation)
            // Skip calculation if editing and address hasn't changed
            let distances = {
                distanceToCenter: undefined as number | undefined,
                distanceToSea: undefined as number | undefined,
                distanceToSchool: undefined as number | undefined,
                distanceToHospital: undefined as number | undefined,
            };

            // Check if address has changed when editing
            const addressChanged = !propertyToEdit ||
                propertyToEdit.address !== finalAddress ||
                propertyToEdit.city !== selectedCity ||
                propertyToEdit.country !== selectedCountry ||
                Math.abs((propertyToEdit.lat || 0) - lat) > 0.0001 ||
                Math.abs((propertyToEdit.lng || 0) - lng) > 0.0001;

            if (addressChanged) {
                try {
                    // Log removed
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
                    // Log removed
                } catch (error) {
                    // Warning removed
                    // Error removed
                    // Continue without distances - they will be undefined
                    // This is intentional - we don't want to block listing creation if Gemini API fails
                }
            } else {
                // Address hasn't changed, reuse existing distances
                // Log removed
                distances = {
                    distanceToCenter: propertyToEdit.distanceToCenter,
                    distanceToSea: propertyToEdit.distanceToSea,
                    distanceToSchool: propertyToEdit.distanceToSchool,
                    distanceToHospital: propertyToEdit.distanceToHospital,
                };
                // Log removed
            }

            // Log removed

            const newProperty: Property = {
                id: propertyToEdit ? propertyToEdit.id : `prop-${Date.now()}`,
                sellerId: currentUser.id,
                listingType: listingData.listingType || 'sale',
                status: propertyToEdit ? propertyToEdit.status : 'active',
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
                floorplanUrl,
                createdAt: propertyToEdit ? propertyToEdit.createdAt : Date.now(),
                lastRenewed: Date.now(),
                views: propertyToEdit?.views || 0,
                saves: propertyToEdit?.saves || 0,
                inquiries: propertyToEdit?.inquiries || 0,
                // Dual-role system: Pass the selected role to backend
                createdAsRole: selectedRole,
                // Amenities - always send values (default to false if not set)
                hasBalcony: listingData.hasBalcony ?? false,
                hasGarden: listingData.hasGarden ?? false,
                hasElevator: listingData.hasElevator ?? false,
                hasSecurity: listingData.hasSecurity ?? false,
                hasAirConditioning: listingData.hasAirConditioning ?? false,
                hasPool: listingData.hasPool ?? false,
                petsAllowed: listingData.petsAllowed ?? false,
                // Advanced property features
                furnishing: listingData.furnishing !== 'any' ? listingData.furnishing : undefined,
                heatingType: listingData.heatingType !== 'any' ? listingData.heatingType : undefined,
                condition: listingData.condition !== 'any' ? listingData.condition : undefined,
                viewType: listingData.viewType !== 'any' ? listingData.viewType : undefined,
                energyRating: listingData.energyRating !== 'any' ? listingData.energyRating : undefined,
                orientation: listingData.orientation !== 'any' ? listingData.orientation : undefined,
                // Calculated distances
                distanceToCenter: distances.distanceToCenter,
                distanceToSea: distances.distanceToSea,
                distanceToSchool: distances.distanceToSchool,
                distanceToHospital: distances.distanceToHospital,
                // Rental-specific fields (always included when listingType is 'rent')
                ...(listingData.listingType === 'rent' ? {
                    rentPeriod: listingData.rentPeriod || 'monthly',
                    securityDeposit: Number(listingData.securityDeposit) || 0,
                    minimumLeaseDuration: Number(listingData.minimumLeaseDuration) || 1,
                    maximumLeaseDuration: Number(listingData.maximumLeaseDuration) || 12,
                    availableFrom: listingData.availableFrom ? new Date(listingData.availableFrom).getTime() : undefined,
                    utilitiesIncluded: listingData.utilitiesIncluded ?? false,
                    internetIncluded: listingData.internetIncluded ?? false,
                    tenantRequirements: listingData.tenantRequirements || [],
                    maxOccupants: Number(listingData.maxOccupants) || 1,
                } : {}),
                // Visit availability (for all listing types)
                ...(listingData.visitAvailability.enabled ? {
                    visitAvailability: listingData.visitAvailability,
                } : {}),
            };

            // Phone number is required to create or edit a listing
            if (!currentUser.phone || currentUser.phone.trim() === '') {
                showError(
                    t('seller:errors.phoneRequired', 'Phone number required'),
                    t('seller:errors.phoneRequiredMessage', 'Please add a mobile phone number in your Profile Settings before creating a listing.')
                );
                setIsSubmitting(false);
                return;
            }

            // Check if user has reached their listing limit (from PLAN_LISTING_LIMITS as source of truth)
            if (!propertyToEdit) {
                const userListings = properties.filter(p => p.sellerId === currentUser.id);
                // Get listing limit from PLAN_LISTING_LIMITS (source of truth) with fallbacks
                const productId = currentUser.subscription?.productId as SubscriptionPlan | undefined;
                const listingsLimit = (productId && PLAN_LISTING_LIMITS[productId]) || currentUser.subscription?.listingsLimit || 3;

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
            // Handle listing limit reached - show discount game option
            if (errorCode === 'LISTING_LIMIT_REACHED' || errorCode === 'FREE_LISTING_LIMIT_REACHED') {
                // Save the property data so user doesn't lose their work
                // Note: newProperty may not exist if error occurred during image upload
                const propertyToSave = {
                    title: listingData.title,
                    price: listingData.price,
                    description: listingData.description,
                    propertyType: listingData.propertyType,
                    createdAsRole: selectedRole,
                };
                dispatch({ type: 'SET_PENDING_PROPERTY', payload: propertyToSave as any });
                setPendingPropertyData(propertyToSave as any);

                // Show the discount game modal
                showWarning(
                    t('seller:errors.freeListingLimitReached', 'Listing Limit Reached'),
                    t('seller:errors.freeListingLimitMessage', 'You have reached your free tier limit. Play a game to win a discount on Pro subscription, or save your listing as a draft!'),
                    [
                        {
                            label: t('seller:actions.playForDiscount', 'Play for Discount'),
                            onClick: () => {
                                dispatch({ type: 'TOGGLE_LISTING_LIMIT_WARNING', payload: true });
                            },
                            variant: 'primary',
                        },
                        {
                            label: t('seller:actions.saveDraft', 'Save as Draft'),
                            onClick: () => {
                                // Property is already saved in pendingProperty state
                                showInfo(
                                    t('seller:draft.savedTitle', 'Draft Saved'),
                                    t('seller:draft.savedMessage', 'Your listing has been saved. You can continue editing it later from your account.'),
                                    [
                                        {
                                            label: t('common:actions.ok', 'OK'),
                                            onClick: () => {},
                                            variant: 'primary',
                                        },
                                    ]
                                );
                            },
                            variant: 'secondary',
                        },
                    ]
                );
            } else if (errorCode === 'PRO_LISTING_LIMIT_REACHED') {
                showError(
                    t('seller:errors.proListingLimitReached'),
                    errorMessage,
                    [
                        {
                            label: t('seller:actions.viewMyListings'),
                            onClick: () => {
                                dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'account' });
                            },
                            variant: 'primary',
                        },
                        {
                            label: t('common:actions.close'),
                            onClick: () => {},
                            variant: 'secondary',
                        },
                    ]
                );
            } else if (errorCode === 'AGENT_PRO_REQUIRED') {
                showWarning(
                    t('seller:errors.proSubscriptionRequired'),
                    t('seller:errors.agentProRequiredMessage'),
                    [
                        {
                            label: t('seller:actions.subscribeToPro'),
                            onClick: () => {
                                dispatch({ type: 'TOGGLE_LISTING_LIMIT_WARNING', payload: true });
                            },
                            variant: 'primary',
                        },
                        {
                            label: t('common:actions.cancel'),
                            onClick: () => {},
                            variant: 'secondary',
                        },
                    ]
                );
            } else if (errorCode === 'PHONE_REQUIRED') {
                showError(
                    t('seller:errors.phoneRequired', 'Phone number required'),
                    t('seller:errors.phoneRequiredMessage', 'Please add a mobile phone number in your Profile Settings before creating a listing.'),
                    [
                        {
                            label: t('account:tabs.profileSettings', 'Profile Settings'),
                            onClick: () => dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'account' }),
                            variant: 'primary',
                        },
                        {
                            label: t('common:actions.close'),
                            onClick: () => {},
                            variant: 'secondary',
                        },
                    ]
                );
            } else if (errorCode === 'BUYER_CANNOT_CREATE_LISTING') {
                showInfo(
                    t('seller:errors.switchRoleRequired'),
                    t('seller:errors.buyerCannotCreateListing'),
                    [
                        {
                            label: t('seller:actions.switchRole'),
                            onClick: () => {
                                // User can switch roles in their account
                                dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'account' });
                            },
                            variant: 'primary',
                        },
                        {
                            label: t('common:actions.close'),
                            onClick: () => {},
                            variant: 'secondary',
                        },
                    ]
                );
            } else {
                // Generic error handling
                showError(
                    t('newListing:errors.failedToSubmit'),
                    errorMessage,
                    [
                        {
                            label: t('common:actions.tryAgain'),
                            onClick: () => {},
                            variant: 'primary',
                        },
                        {
                            label: t('common:actions.close'),
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
    const handlePromotionPaymentSuccess = async (promotionData: { tier: string; duration: number; hasUrgent: boolean; couponCode?: string }) => {
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
                    couponCode: promotionData.couponCode,
                }),
            });

            if (!response.ok) {
                // Error removed
            }

            setPendingPropertyData(null);
            setStep('success');
            setTimeout(() => {
                dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'account' });
            }, 3000);
        } catch (err) {
            // Error removed
            showError(t('newListing:errors.failedToCreate'), t('newListing:errors.failedToCreateMessage'));
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
            // Error removed
            showError(t('newListing:errors.failedToCreate'), t('newListing:errors.failedToCreateMessage'));
            setStep('form');
        } finally {
            setIsSubmitting(false);
        }
    };

    return {
        // State
        mode, setMode,
        step, setStep,
        images, setImages,
        floorplanImage, setFloorplanImage,
        listingData, setListingData,
        language, setLanguage,
        aiPropertyType, setAiPropertyType,
        isSubmitting,
        wantToPromote, setWantToPromote,
        pendingPropertyData,
        selectedRole, setSelectedRole,
        uploadProgress,
        isCompressing,
        isUploading,
        selectedCountry, selectedCity, availableCities,
        previewProperty,
        // Computed
        getZoomLevel, cityData,
        // Handlers
        handleCountryChange, handleCityChange,
        handleMapLocationChange, handleMapAddressChange,
        handleImageChange, handleFloorplanImageChange,
        removeImage,
        handleDragStart, handleDragEnter, handleDragEnd, handleDrop,
        handleGenerate,
        handleInputChange, handlePriceChange, handleImageTagChange,
        handleGoToPreview, handleBackToForm,
        handleSubmit,
        handlePromotionPaymentSuccess, handlePostWithoutPromotion,
        // Refs
        formContainerRef,
        // Context values needed by the wrapper
        currentUser, isAuthenticating, isLoadingUserData,
    };
};
