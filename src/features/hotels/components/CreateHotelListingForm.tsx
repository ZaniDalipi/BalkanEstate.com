import React, { useState, useCallback, useRef, useEffect, lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { useCreateHotel, useUploadHotelCover, useUploadHotelPhotos } from '../hooks';
import { useHotelDraftStore, HOTEL_DRAFT_TTL_MS, type HotelDraft } from '../store/hotelDraftStore';
import {
  HOTEL_PROPERTY_TYPES,
  HOTEL_AMENITIES,
  ROOM_TYPES,
  SUPPORTED_CURRENCIES,
  CANCELLATION_POLICIES,
  CURRENCY_SYMBOLS,
  type CreateHotelData,
  type CreateRoomData,
  type HotelPropertyType,
  type HotelAmenity,
  type RoomType,
  type SupportedCurrency,
  type CancellationPolicy,
} from '@/src/shared/types/hotel.types';
import {
  validateHotelName,
  validateStarRating,
  validateRoom,
  validatePricePerNight,
  validateGuestCount,
  normalizeWebsiteUrl,
} from '@/src/shared/utils/validation';
import { MapPinIcon, PlusIcon, TrashIcon, CheckIcon, PhotoIcon, HomeIcon } from '@/constants';
import { BALKAN_LOCATIONS, type CityData } from '@/utils/balkanLocations';
import PhoneInput, { parsePhoneValue } from '@/src/shared/components/ui/PhoneInput';
import { useAppContext } from '@/context/AppContext';

const MapLocationPicker = lazy(() => import('@/src/features/seller/components/MapLocationPicker'));

interface CreateHotelListingFormProps {
  onBack: () => void;
  onSuccess: () => void;
}

type FieldErrorKey = 'name' | 'propertyType' | 'contactPhone' | 'country' | 'city' | 'rooms';

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_GALLERY = 15;

// Map a Balkan location country name → its international dial code, so the
// phone inputs default to the property's country ("geo location").
const COUNTRY_PHONE_CODES: Record<string, string> = {
  'Kosovo': '+383',
  'Albania': '+355',
  'North Macedonia': '+389',
  'Serbia': '+381',
  'Bosnia and Herzegovina': '+387',
  'Croatia': '+385',
  'Montenegro': '+382',
  'Greece': '+30',
  'Bulgaria': '+359',
  'Romania': '+40',
};

// While editing, numeric room fields may be an empty string so that clearing an
// input shows a blank box (not 0) and never silently auto-fills a value.
// They are coerced to numbers only at submit time.
type NumOrBlank = number | '';
interface RoomFormData extends Omit<CreateRoomData, 'maxGuests' | 'beds' | 'bathrooms' | 'sizeSqm' | 'pricePerNight' | 'quantity'> {
  maxGuests: NumOrBlank;
  beds: NumOrBlank;
  bathrooms: NumOrBlank;
  sizeSqm: NumOrBlank;
  pricePerNight: NumOrBlank;
  quantity: NumOrBlank;
}

const emptyRoom = (): RoomFormData => ({
  name: '',
  roomType: 'double',
  description: '',
  maxGuests: 2,
  beds: 1,
  bathrooms: 1,
  sizeSqm: '',
  pricePerNight: '',
  currency: 'EUR',
  quantity: 1,
  amenities: [],
});

const CreateHotelListingForm: React.FC<CreateHotelListingFormProps> = ({ onBack, onSuccess }) => {
  const { t } = useTranslation('hotels');
  const { state } = useAppContext();
  const currentUser = state.currentUser;
  const { createHotel, isLoading, error } = useCreateHotel();
  const { uploadCover } = useUploadHotelCover();
  const { uploadPhotos } = useUploadHotelPhotos();

  const fieldRefs = {
    name: useRef<HTMLInputElement>(null),
    propertyType: useRef<HTMLDivElement>(null),
    contactPhone: useRef<HTMLDivElement>(null),
    country: useRef<HTMLSelectElement>(null),
    city: useRef<HTMLSelectElement>(null),
    rooms: useRef<HTMLDivElement>(null),
  };

  // Restore a persisted draft so a page refresh never loses input. Read the
  // store once (guarded by a ref) and ignore drafts older than the TTL.
  const { setDraft, clearDraft } = useHotelDraftStore();
  const savedDraftRef = useRef<Partial<HotelDraft> | null>(null);
  if (savedDraftRef.current === null) {
    const d = useHotelDraftStore.getState().draft;
    savedDraftRef.current =
      d && d.savedAt && Date.now() - d.savedAt < HOTEL_DRAFT_TTL_MS ? d : {};
  }
  const draft = savedDraftRef.current || {};
  const [draftRestored, setDraftRestored] = useState(
    () => !!(draft.name || draft.description || (draft.rooms && draft.rooms.some((r) => r.name)))
  );

  // --- Basics ---
  const [name, setName] = useState(draft.name ?? '');
  const [propertyType, setPropertyType] = useState<HotelPropertyType | ''>(draft.propertyType ?? '');
  const [starRating, setStarRating] = useState<number | undefined>(draft.starRating);
  const [description, setDescription] = useState(draft.description ?? '');
  const [currency, setCurrency] = useState<SupportedCurrency>(draft.currency ?? 'EUR');

  // --- Location ---
  const [selectedCountry, setSelectedCountry] = useState(draft.country ?? '');
  const [selectedCity, setSelectedCity] = useState(draft.city ?? '');
  const [address, setAddress] = useState(draft.address ?? '');
  const [availableCities, setAvailableCities] = useState<CityData[]>(
    () => BALKAN_LOCATIONS.find((c) => c.name === draft.country)?.cities ?? []
  );
  const [lat, setLat] = useState(draft.lat ?? 0);
  const [lng, setLng] = useState(draft.lng ?? 0);
  const [showMap, setShowMap] = useState(!!(draft.lat && draft.lng));

  // --- Contact ---
  const [contactPhone, setContactPhone] = useState(draft.contactPhone ?? currentUser?.phone ?? '');
  const [contactEmail, setContactEmail] = useState(draft.contactEmail ?? currentUser?.email ?? '');
  const [whatsapp, setWhatsapp] = useState(draft.whatsapp ?? '');
  const [website, setWebsite] = useState(draft.website ?? '');

  // --- Amenities ---
  const [amenities, setAmenities] = useState<HotelAmenity[]>(draft.amenities ?? []);

  // --- Rooms ---
  const [rooms, setRooms] = useState<RoomFormData[]>(
    draft.rooms && draft.rooms.length > 0 ? (draft.rooms as RoomFormData[]) : [emptyRoom()]
  );

  // --- Policies ---
  const [checkInTime, setCheckInTime] = useState(draft.checkInTime ?? '14:00');
  const [checkOutTime, setCheckOutTime] = useState(draft.checkOutTime ?? '11:00');
  const [minNights, setMinNights] = useState<number | undefined>(draft.minNights ?? 1);
  const [maxNights, setMaxNights] = useState<number | undefined>(draft.maxNights);
  const [cancellationPolicy, setCancellationPolicy] = useState<CancellationPolicy | ''>(draft.cancellationPolicy ?? '');
  const [petsAllowed, setPetsAllowed] = useState(draft.petsAllowed ?? false);
  const [smokingAllowed, setSmokingAllowed] = useState(draft.smokingAllowed ?? false);
  const [houseRules, setHouseRules] = useState<string[]>(draft.houseRules ?? []);
  const [houseRuleInput, setHouseRuleInput] = useState('');
  const [languagesSpoken, setLanguagesSpoken] = useState<string[]>(draft.languagesSpoken ?? []);
  const [languageInput, setLanguageInput] = useState('');

  // --- Images ---
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [galleryFiles, setGalleryFiles] = useState<File[]>([]);
  const [galleryPreviews, setGalleryPreviews] = useState<string[]>([]);

  // --- Error state ---
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<FieldErrorKey | null>(null);
  // All required fields that failed validation (top-level keys + `room-<i>-<field>`),
  // so every missing field can be highlighted red at once.
  const [invalidFields, setInvalidFields] = useState<Set<string>>(new Set());
  const isInvalid = useCallback((key: string) => invalidFields.has(key), [invalidFields]);

  // Blocking submit overlay state — prevents interaction & double-submits.
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState('');

  // Dial code for the phone inputs, derived from the selected property country.
  const locationPhoneCode = COUNTRY_PHONE_CODES[selectedCountry];

  // Auto-save the draft (debounced) whenever any serialisable field changes, so
  // a refresh or accidental navigation preserves everything except file uploads.
  useEffect(() => {
    const handle = setTimeout(() => {
      setDraft({
        name, propertyType, starRating, description, currency,
        country: selectedCountry, city: selectedCity, address, lat, lng,
        contactPhone, contactEmail, whatsapp, website,
        amenities, rooms: rooms as unknown as CreateRoomData[], checkInTime, checkOutTime, minNights, maxNights,
        cancellationPolicy, petsAllowed, smokingAllowed, houseRules, languagesSpoken,
      });
    }, 600);
    return () => clearTimeout(handle);
  }, [
    name, propertyType, starRating, description, currency, selectedCountry, selectedCity,
    address, lat, lng, contactPhone, contactEmail, whatsapp, website, amenities, rooms,
    checkInTime, checkOutTime, minNights, maxNights, cancellationPolicy, petsAllowed,
    smokingAllowed, houseRules, languagesSpoken, setDraft,
  ]);

  const discardDraft = useCallback(() => {
    clearDraft();
    setDraftRestored(false);
    setName(''); setPropertyType(''); setStarRating(undefined); setDescription('');
    setCurrency('EUR'); setSelectedCountry(''); setSelectedCity(''); setAddress('');
    setAvailableCities([]); setLat(0); setLng(0); setShowMap(false);
    setContactPhone(currentUser?.phone ?? ''); setContactEmail(currentUser?.email ?? '');
    setWhatsapp(''); setWebsite(''); setAmenities([]); setRooms([emptyRoom()]);
    setCheckInTime('14:00'); setCheckOutTime('11:00'); setMinNights(1); setMaxNights(undefined);
    setCancellationPolicy(''); setPetsAllowed(false); setSmokingAllowed(false);
    setHouseRules([]); setLanguagesSpoken([]);
  }, [clearDraft, currentUser]);

  const clearErrors = useCallback(() => {
    setFormError(null);
    setFieldError(null);
    setInvalidFields((prev) => (prev.size ? new Set() : prev));
  }, []);

  const setValidationError = useCallback((field: FieldErrorKey, message: string) => {
    setFormError(message);
    setFieldError(field);
    const ref = fieldRefs[field];
    if (ref.current) {
      ref.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => (ref.current as any)?.focus?.(), 400);
    }
  }, [fieldRefs]);

  const inputClasses = (invalid?: boolean) =>
    `w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors ${
      invalid ? 'border-red-500 ring-2 ring-red-100' : 'border-neutral-300'
    }`;

  // --- Location handlers ---
  const handleCountryChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const countryName = e.target.value;
    setSelectedCountry(countryName);
    setSelectedCity('');
    clearErrors();
    const country = BALKAN_LOCATIONS.find((c) => c.name === countryName);
    if (country) {
      setAvailableCities(country.cities);
      setLat(0);
      setLng(0);
      setShowMap(false);
    } else {
      setAvailableCities([]);
    }
  }, [clearErrors]);

  const handleCityChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const cityName = e.target.value;
    setSelectedCity(cityName);
    clearErrors();
    const city = availableCities.find((c) => c.name === cityName);
    if (city) {
      setLat(city.lat);
      setLng(city.lng);
      setAddress(`${cityName}, ${selectedCountry}`);
      setShowMap(true);
    }
  }, [availableCities, selectedCountry, clearErrors]);

  // --- Amenities ---
  const toggleAmenity = useCallback((amenity: HotelAmenity) => {
    setAmenities((prev) =>
      prev.includes(amenity) ? prev.filter((a) => a !== amenity) : [...prev, amenity]
    );
  }, []);

  // --- Rooms handlers ---
  const updateRoom = useCallback(<K extends keyof RoomFormData>(index: number, key: K, value: RoomFormData[K]) => {
    setRooms((prev) => prev.map((room, i) => (i === index ? { ...room, [key]: value } : room)));
    clearErrors();
  }, [clearErrors]);

  // Numeric room field handler: blank input stays blank (never coerced to 0).
  const updateRoomNumber = useCallback((index: number, key: keyof RoomFormData, raw: string) => {
    const value: NumOrBlank = raw === '' ? '' : Number(raw);
    if (raw !== '' && Number.isNaN(value as number)) return;
    updateRoom(index, key, value as never);
  }, [updateRoom]);

  const toggleRoomAmenity = useCallback((index: number, amenity: HotelAmenity) => {
    setRooms((prev) => prev.map((room, i) => {
      if (i !== index) return room;
      const current = room.amenities || [];
      return {
        ...room,
        amenities: current.includes(amenity) ? current.filter((a) => a !== amenity) : [...current, amenity],
      };
    }));
  }, []);

  const addRoom = useCallback(() => {
    setRooms((prev) => (prev.length >= 50 ? prev : [...prev, emptyRoom()]));
  }, []);

  const removeRoom = useCallback((index: number) => {
    setRooms((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)));
  }, []);

  // --- House rules & languages ---
  const addHouseRule = useCallback(() => {
    const trimmed = houseRuleInput.trim();
    if (!trimmed || houseRules.length >= 20 || houseRules.includes(trimmed)) return;
    setHouseRules((prev) => [...prev, trimmed]);
    setHouseRuleInput('');
  }, [houseRuleInput, houseRules]);

  const addLanguage = useCallback(() => {
    const trimmed = languageInput.trim();
    if (!trimmed || languagesSpoken.length >= 10 || languagesSpoken.includes(trimmed)) return;
    setLanguagesSpoken((prev) => [...prev, trimmed]);
    setLanguageInput('');
  }, [languageInput, languagesSpoken]);

  // --- Image handlers ---
  const handleCoverChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setFormError(t('form.errors.imageInvalidType'));
      return;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      setFormError(t('form.errors.imageTooLarge'));
      return;
    }
    setCoverFile(file);
    clearErrors();
    const reader = new FileReader();
    reader.onloadend = () => setCoverPreview(reader.result as string);
    reader.readAsDataURL(file);
  }, [t, clearErrors]);

  const handleGalleryChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    const valid: File[] = [];
    for (const file of files) {
      if (!ACCEPTED_TYPES.includes(file.type)) {
        setFormError(t('form.errors.imageInvalidType'));
        continue;
      }
      if (file.size > MAX_IMAGE_SIZE) {
        setFormError(t('form.errors.imageTooLarge'));
        continue;
      }
      valid.push(file);
    }
    setGalleryFiles((prev) => {
      const next = [...prev, ...valid].slice(0, MAX_GALLERY);
      return next;
    });
    valid.slice(0, MAX_GALLERY).forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () =>
        setGalleryPreviews((prev) => (prev.length >= MAX_GALLERY ? prev : [...prev, reader.result as string]));
      reader.readAsDataURL(file);
    });
  }, [t]);

  const removeGalleryImage = useCallback((index: number) => {
    setGalleryFiles((prev) => prev.filter((_, i) => i !== index));
    setGalleryPreviews((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // --- Submit ---
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return; // guard against double-submit
    clearErrors();

    // Collect ALL missing/invalid required fields so each can be flagged red,
    // while still scrolling to (and focusing) the first one.
    const invalid = new Set<string>();
    let firstField: FieldErrorKey | null = null;
    let firstMsg = '';
    const flag = (field: FieldErrorKey, key: string, msg: string) => {
      invalid.add(key);
      if (!firstField) { firstField = field; firstMsg = msg; }
    };

    const nameResult = validateHotelName(name);
    if (!nameResult.isValid) flag('name', 'name', nameResult.error!);
    if (!propertyType) flag('propertyType', 'propertyType', t('form.errors.propertyTypeRequired'));

    const phoneClean = parsePhoneValue(contactPhone).localDigits;
    if (!phoneClean || phoneClean.length < 6) flag('contactPhone', 'contactPhone', t('form.errors.phoneRequired'));

    if (!selectedCountry.trim()) flag('country', 'country', t('form.errors.countryRequired'));
    if (!selectedCity.trim()) flag('city', 'city', t('form.errors.cityRequired'));

    // Rooms — at least one; flag each invalid field on each room.
    if (rooms.length === 0) flag('rooms', 'rooms', t('form.errors.roomsRequired'));
    rooms.forEach((r, i) => {
      if (!r.name.trim()) invalid.add(`room-${i}-name`);
      if (!validatePricePerNight(r.pricePerNight).isValid) invalid.add(`room-${i}-pricePerNight`);
      if (!validateGuestCount(r.maxGuests).isValid) invalid.add(`room-${i}-maxGuests`);
      const bedsNum = Number(r.beds);
      if (!(Number.isFinite(bedsNum) && bedsNum >= 1)) invalid.add(`room-${i}-beds`);
      const roomResult = validateRoom(r);
      if (!roomResult.isValid && !firstField) {
        firstField = 'rooms';
        firstMsg = t('form.errors.roomInvalid', { index: i + 1, error: roomResult.error });
      }
    });

    // Non-highlight validations (surface message only).
    const starResult = validateStarRating(starRating);
    if (!starResult.isValid && !firstMsg) firstMsg = starResult.error!;
    if (minNights != null && maxNights != null && maxNights < minNights && !firstMsg) {
      firstMsg = t('form.errors.nightsRange');
    }

    if (invalid.size > 0 || firstMsg) {
      setInvalidFields(invalid);
      if (firstField) {
        setValidationError(firstField, firstMsg || t('form.errors.generic'));
      } else {
        setFormError(firstMsg || t('form.errors.generic'));
      }
      return;
    }
    setInvalidFields(new Set());

    setSubmitting(true);
    setProgress(8);
    setProgressLabel(t('form.progress.preparing'));
    try {
      const payload: CreateHotelData = {
        name: name.trim(),
        propertyType,
        contactPhone,
        city: selectedCity.trim(),
        country: selectedCountry.trim(),
        currency,
        rooms: rooms.map((r) => ({
          name: r.name.trim(),
          roomType: r.roomType,
          description: r.description?.trim() || undefined,
          maxGuests: Number(r.maxGuests),
          beds: Number(r.beds),
          bathrooms: r.bathrooms === '' || r.bathrooms == null ? 1 : Number(r.bathrooms),
          sizeSqm: r.sizeSqm === '' || r.sizeSqm == null ? undefined : Number(r.sizeSqm),
          pricePerNight: Number(r.pricePerNight),
          currency: r.currency || currency,
          quantity: r.quantity === '' || r.quantity == null ? 1 : Number(r.quantity),
          amenities: r.amenities && r.amenities.length > 0 ? r.amenities : undefined,
        })),
        petsAllowed,
        smokingAllowed,
      };

      if (starRating) payload.starRating = starRating;
      if (description.trim()) payload.description = description.trim();
      if (contactEmail.trim()) payload.contactEmail = contactEmail.trim();
      if (whatsapp) payload.whatsapp = whatsapp;
      const cleanWebsite = normalizeWebsiteUrl(website);
      if (cleanWebsite) payload.website = cleanWebsite;
      if (address.trim()) payload.address = address.trim();
      if (lat !== 0 && lng !== 0) { payload.latitude = lat; payload.longitude = lng; }
      if (amenities.length > 0) payload.amenities = amenities;
      if (checkInTime) payload.checkInTime = checkInTime;
      if (checkOutTime) payload.checkOutTime = checkOutTime;
      if (minNights != null) payload.minNights = minNights;
      if (maxNights != null) payload.maxNights = maxNights;
      if (cancellationPolicy) payload.cancellationPolicy = cancellationPolicy;
      if (houseRules.length > 0) payload.houseRules = houseRules;
      if (languagesSpoken.length > 0) payload.languagesSpoken = languagesSpoken;

      setProgress(35);
      setProgressLabel(t('form.progress.creating'));
      const result = await createHotel(payload);
      setProgress(60);

      // Upload images after creation (non-blocking on failure)
      if (result.hotel?.id) {
        if (coverFile) {
          setProgressLabel(t('form.progress.uploadingCover'));
          try { await uploadCover({ id: result.hotel.id, file: coverFile }); } catch { /* cover optional */ }
          setProgress(78);
        }
        if (galleryFiles.length > 0) {
          setProgressLabel(t('form.progress.uploadingPhotos'));
          try { await uploadPhotos({ id: result.hotel.id, files: galleryFiles }); } catch { /* gallery optional */ }
        }
      }

      setProgress(100);
      setProgressLabel(t('form.progress.done'));
      clearDraft(); // published successfully → discard the saved draft
      // Small beat so the finished bar is visible before the view changes.
      await new Promise((r) => setTimeout(r, 500));
      onSuccess();
    } catch (err: any) {
      setSubmitting(false);
      setProgress(0);
      setFormError(err?.message || t('form.errors.generic'));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [
    submitting, name, propertyType, starRating, contactPhone, selectedCountry, selectedCity, rooms, minNights, maxNights,
    description, contactEmail, whatsapp, website, address, lat, lng, amenities, currency, checkInTime,
    checkOutTime, cancellationPolicy, houseRules, languagesSpoken, petsAllowed, smokingAllowed,
    coverFile, galleryFiles, createHotel, uploadCover, uploadPhotos, onSuccess, t, clearErrors, clearDraft, setValidationError,
  ]);

  const displayError = formError || (error as Error)?.message;

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Blocking submit overlay with animated progress — prevents interaction
          and double-submits while the listing is being published. */}
      <AnimatePresence>
        {submitting && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md px-6"
            aria-live="assertive"
            role="alertdialog"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 260, damping: 22 }}
              className="w-full max-w-sm rounded-3xl bg-white shadow-2xl p-8 text-center"
            >
              <div className="mx-auto mb-5 w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/30">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1.1, ease: 'linear' }}
                  className="w-8 h-8 rounded-full border-[3px] border-white/40 border-t-white"
                />
              </div>
              <h3 className="text-lg font-bold text-neutral-900">{t('form.progress.title')}</h3>
              <p className="mt-1 text-sm text-neutral-500 h-5">{progressLabel}</p>

              <div className="mt-5 h-2.5 w-full rounded-full bg-neutral-100 overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-600"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ ease: 'easeOut', duration: 0.5 }}
                />
              </div>
              <p className="mt-2 text-xs font-semibold text-neutral-400">{progress}%</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 relative overflow-hidden">
        <div className="absolute top-5 right-[15%] w-40 h-40 bg-violet-500/20 rounded-full blur-3xl" />
        <div className="relative z-10 max-w-3xl mx-auto px-4 py-8">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1.5 text-sm text-white/70 hover:text-white font-medium mb-4 transition-colors"
          >
            ← {t('form.back')}
          </button>
          <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-2">
            <HomeIcon className="w-7 h-7" />
            {t('form.title')}
          </h1>
          <p className="mt-2 text-white/70 text-sm max-w-xl">{t('form.subtitle')}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-3xl mx-auto px-4 py-8 space-y-8" noValidate>
        {/* Error banner */}
        {displayError && (
          <div role="alert" className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {displayError}
          </div>
        )}

        {/* Draft restored banner */}
        {draftRestored && (
          <div className="flex items-center justify-between gap-3 rounded-xl bg-blue-50 border border-blue-200 px-4 py-3 text-sm text-blue-800">
            <span className="flex items-center gap-2">
              <CheckIcon className="w-4 h-4 shrink-0" />
              {t('form.draftRestored')}
            </span>
            <button type="button" onClick={discardDraft} className="font-semibold text-blue-700 hover:text-blue-900 underline shrink-0">
              {t('form.discardDraft')}
            </button>
          </div>
        )}

        {/* --- Section: Basics --- */}
        <section className="bg-white rounded-2xl border border-neutral-200 p-6 space-y-5">
          <h2 className="text-lg font-semibold text-neutral-900">{t('form.sections.basics')}</h2>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">
              {t('form.fields.name')} <span className="text-red-500">*</span>
            </label>
            <input
              ref={fieldRefs.name}
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); clearErrors(); }}
              placeholder={t('form.placeholders.name')}
              maxLength={120}
              className={inputClasses(isInvalid('name'))}
            />
          </div>

          <div ref={fieldRefs.propertyType}>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">
              {t('form.fields.propertyType')} <span className="text-red-500">*</span>
            </label>
            <div className={`grid grid-cols-2 sm:grid-cols-4 gap-2 ${isInvalid('propertyType') ? 'p-2 -m-2 rounded-xl ring-2 ring-red-200 border border-red-400' : ''}`}>
              {HOTEL_PROPERTY_TYPES.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => { setPropertyType(type); clearErrors(); }}
                  className={`px-3 py-2.5 rounded-xl text-sm font-medium border transition-colors ${
                    propertyType === type
                      ? 'bg-primary text-white border-primary'
                      : 'bg-white text-neutral-700 border-neutral-300 hover:border-primary/40'
                  }`}
                >
                  {t(`propertyTypes.${type}`)}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">{t('form.fields.starRating')}</label>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setStarRating(starRating === star ? undefined : star)}
                    aria-label={t('form.fields.starAria', { count: star })}
                    className={`text-2xl transition-transform hover:scale-110 ${
                      starRating && star <= starRating ? 'text-amber-400' : 'text-neutral-300'
                    }`}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">{t('form.fields.currency')}</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as SupportedCurrency)}
                className={inputClasses()}
              >
                {SUPPORTED_CURRENCIES.map((c) => (
                  <option key={c} value={c}>{c} ({CURRENCY_SYMBOLS[c]})</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">{t('form.fields.description')}</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              maxLength={5000}
              placeholder={t('form.placeholders.description')}
              className={inputClasses()}
            />
            <p className="mt-1 text-xs text-neutral-400 text-right">{description.length}/5000</p>
          </div>
        </section>

        {/* --- Section: Location --- */}
        <section className="bg-white rounded-2xl border border-neutral-200 p-6 space-y-5">
          <h2 className="text-lg font-semibold text-neutral-900 flex items-center gap-2">
            <MapPinIcon className="w-5 h-5 text-primary" />
            {t('form.sections.location')}
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                {t('form.fields.country')} <span className="text-red-500">*</span>
              </label>
              <select
                ref={fieldRefs.country}
                value={selectedCountry}
                onChange={handleCountryChange}
                className={inputClasses(isInvalid('country'))}
              >
                <option value="">{t('form.placeholders.selectCountry')}</option>
                {BALKAN_LOCATIONS.map((c) => (
                  <option key={c.name} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                {t('form.fields.city')} <span className="text-red-500">*</span>
              </label>
              <select
                ref={fieldRefs.city}
                value={selectedCity}
                onChange={handleCityChange}
                disabled={!selectedCountry}
                className={inputClasses(isInvalid('city'))}
              >
                <option value="">{t('form.placeholders.selectCity')}</option>
                {availableCities.map((c) => (
                  <option key={c.name} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">{t('form.fields.address')}</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder={t('form.placeholders.address')}
              maxLength={200}
              className={inputClasses()}
            />
          </div>

          {showMap && (
            <div className="h-64 rounded-xl overflow-hidden border border-neutral-200">
              <Suspense fallback={<div className="h-full flex items-center justify-center text-sm text-neutral-400">{t('form.loadingMap')}</div>}>
                <MapLocationPicker
                  lat={lat || 41.9981}
                  lng={lng || 21.4254}
                  address={address}
                  zoom={lat !== 0 ? 14 : 8}
                  country={selectedCountry}
                  city={selectedCity}
                  onLocationChange={(newLat: number, newLng: number) => { setLat(newLat); setLng(newLng); }}
                  onAddressChange={(a: string) => setAddress(a)}
                  autoDetectLocation={false}
                />
              </Suspense>
            </div>
          )}
        </section>

        {/* --- Section: Contact --- */}
        <section className="bg-white rounded-2xl border border-neutral-200 p-6 space-y-5">
          <h2 className="text-lg font-semibold text-neutral-900">{t('form.sections.contact')}</h2>

          <div ref={fieldRefs.contactPhone}>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">
              {t('form.fields.phone')} <span className="text-red-500">*</span>
            </label>
            <PhoneInput
              value={contactPhone}
              onChange={(v) => { setContactPhone(v); clearErrors(); }}
              variant="bordered"
              defaultCountryCode={locationPhoneCode}
              error={isInvalid('contactPhone') ? t('form.errors.phoneRequired') : undefined}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">{t('form.fields.email')}</label>
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="hello@myhotel.com"
                className={inputClasses()}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">{t('form.fields.website')}</label>
              <input
                type="text"
                inputMode="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                onBlur={() => setWebsite((w) => normalizeWebsiteUrl(w))}
                placeholder="balkanestateai.com"
                className={inputClasses()}
              />
              <p className="mt-1 text-xs text-neutral-400">{t('form.fields.websiteHint')}</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">{t('form.fields.whatsapp')}</label>
            <PhoneInput value={whatsapp} onChange={setWhatsapp} variant="bordered" defaultCountryCode={locationPhoneCode} />
          </div>
        </section>

        {/* --- Section: Rooms --- */}
        <section ref={fieldRefs.rooms} className="bg-white rounded-2xl border border-neutral-200 p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-neutral-900">
              {t('form.sections.rooms')} <span className="text-red-500">*</span>
            </h2>
            <span className="text-xs text-neutral-400">{rooms.length}/50</span>
          </div>
          <p className="text-sm text-neutral-500 -mt-3">{t('form.sections.roomsHint')}</p>

          {rooms.map((room, index) => (
            <div key={index} className="rounded-xl border border-neutral-200 p-4 space-y-4 bg-neutral-50/50">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-neutral-700">{t('form.fields.roomLabel', { index: index + 1 })}</span>
                {rooms.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeRoom(index)}
                    className="text-red-500 hover:text-red-600 flex items-center gap-1 text-sm"
                  >
                    <TrashIcon className="w-4 h-4" /> {t('form.remove')}
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-600 mb-1">{t('form.fields.roomName')} <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={room.name}
                    onChange={(e) => updateRoom(index, 'name', e.target.value)}
                    placeholder={t('form.placeholders.roomName')}
                    maxLength={100}
                    className={inputClasses(isInvalid(`room-${index}-name`))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-600 mb-1">{t('form.fields.roomType')}</label>
                  <select
                    value={room.roomType}
                    onChange={(e) => updateRoom(index, 'roomType', e.target.value as RoomType)}
                    className={inputClasses()}
                  >
                    {ROOM_TYPES.map((rt) => (
                      <option key={rt} value={rt}>{t(`roomTypes.${rt}`)}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-medium text-neutral-600 mb-1">{t('form.fields.pricePerNight')} <span className="text-red-500">*</span></label>
                  <input
                    type="number"
                    min={1}
                    inputMode="numeric"
                    value={room.pricePerNight}
                    onChange={(e) => updateRoomNumber(index, 'pricePerNight', e.target.value)}
                    placeholder="50"
                    className={inputClasses(isInvalid(`room-${index}-pricePerNight`))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-600 mb-1">{t('form.fields.maxGuests')} <span className="text-red-500">*</span></label>
                  <input
                    type="number"
                    min={1}
                    max={30}
                    inputMode="numeric"
                    value={room.maxGuests}
                    onChange={(e) => updateRoomNumber(index, 'maxGuests', e.target.value)}
                    placeholder="2"
                    className={inputClasses(isInvalid(`room-${index}-maxGuests`))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-600 mb-1">{t('form.fields.beds')} <span className="text-red-500">*</span></label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    inputMode="numeric"
                    value={room.beds}
                    onChange={(e) => updateRoomNumber(index, 'beds', e.target.value)}
                    placeholder="1"
                    className={inputClasses(isInvalid(`room-${index}-beds`))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-600 mb-1">{t('form.fields.bathrooms')}</label>
                  <input
                    type="number"
                    min={0}
                    max={10}
                    inputMode="numeric"
                    value={room.bathrooms}
                    onChange={(e) => updateRoomNumber(index, 'bathrooms', e.target.value)}
                    placeholder="1"
                    className={inputClasses()}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-neutral-600 mb-1">{t('form.fields.sizeSqm')}</label>
                  <input
                    type="number"
                    min={1}
                    inputMode="numeric"
                    value={room.sizeSqm}
                    onChange={(e) => updateRoomNumber(index, 'sizeSqm', e.target.value)}
                    placeholder="25"
                    className={inputClasses()}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-600 mb-1">{t('form.fields.quantity')}</label>
                  <input
                    type="number"
                    min={1}
                    max={500}
                    inputMode="numeric"
                    value={room.quantity}
                    onChange={(e) => updateRoomNumber(index, 'quantity', e.target.value)}
                    placeholder="1"
                    className={inputClasses()}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-600 mb-1">{t('form.fields.roomCurrency')}</label>
                  <select
                    value={room.currency ?? currency}
                    onChange={(e) => updateRoom(index, 'currency', e.target.value as SupportedCurrency)}
                    className={inputClasses()}
                  >
                    {SUPPORTED_CURRENCIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-600 mb-1">{t('form.fields.roomDescription')}</label>
                <textarea
                  value={room.description ?? ''}
                  onChange={(e) => updateRoom(index, 'description', e.target.value)}
                  rows={2}
                  maxLength={1000}
                  placeholder={t('form.placeholders.roomDescription')}
                  className={inputClasses()}
                />
              </div>

              {/* Per-room amenities (optional) — e.g. this room has a jacuzzi */}
              <div>
                <label className="block text-xs font-medium text-neutral-600 mb-1.5">
                  {t('form.fields.roomAmenities')}{' '}
                  <span className="text-neutral-400 font-normal">{t('form.fields.optional')}</span>
                </label>
                <p className="text-xs text-neutral-400 mb-2">{t('form.fields.roomAmenitiesHint')}</p>
                <div className="flex flex-wrap gap-1.5">
                  {HOTEL_AMENITIES.map((amenity) => {
                    const active = room.amenities?.includes(amenity);
                    return (
                      <button
                        key={amenity}
                        type="button"
                        onClick={() => toggleRoomAmenity(index, amenity)}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs border transition-colors ${
                          active
                            ? 'bg-primary/10 text-primary border-primary'
                            : 'bg-white text-neutral-500 border-neutral-300 hover:border-primary/40'
                        }`}
                      >
                        {active && <CheckIcon className="w-3 h-3" />}
                        {t(`amenities.${amenity}`)}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={addRoom}
            disabled={rooms.length >= 50}
            className="flex items-center gap-2 text-primary font-medium text-sm hover:underline disabled:opacity-40"
          >
            <PlusIcon className="w-4 h-4" /> {t('form.addRoom')}
          </button>
        </section>

        {/* --- Section: Amenities --- */}
        <section className="bg-white rounded-2xl border border-neutral-200 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-neutral-900">{t('form.sections.amenities')}</h2>
          <div className="flex flex-wrap gap-2">
            {HOTEL_AMENITIES.map((amenity) => {
              const active = amenities.includes(amenity);
              return (
                <button
                  key={amenity}
                  type="button"
                  onClick={() => toggleAmenity(amenity)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border transition-colors ${
                    active
                      ? 'bg-primary/10 text-primary border-primary'
                      : 'bg-white text-neutral-600 border-neutral-300 hover:border-primary/40'
                  }`}
                >
                  {active && <CheckIcon className="w-3.5 h-3.5" />}
                  {t(`amenities.${amenity}`)}
                </button>
              );
            })}
          </div>
        </section>

        {/* --- Section: Photos --- */}
        <section className="bg-white rounded-2xl border border-neutral-200 p-6 space-y-5">
          <h2 className="text-lg font-semibold text-neutral-900 flex items-center gap-2">
            <PhotoIcon className="w-5 h-5 text-primary" />
            {t('form.sections.photos')}
          </h2>

          {/* Cover */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">{t('form.fields.coverImage')}</label>
            {coverPreview ? (
              <div className="relative h-48 rounded-xl overflow-hidden border border-neutral-200">
                <img src={coverPreview} alt="cover" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => { setCoverFile(null); setCoverPreview(null); }}
                  className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white hover:bg-black/80"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center h-40 rounded-xl border-2 border-dashed border-neutral-300 cursor-pointer hover:border-primary/50 transition-colors">
                <PhotoIcon className="w-8 h-8 text-neutral-400" />
                <span className="mt-2 text-sm text-neutral-500">{t('form.fields.uploadCover')}</span>
                <input type="file" accept="image/*" onChange={handleCoverChange} className="hidden" />
              </label>
            )}
          </div>

          {/* Gallery */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">
              {t('form.fields.gallery')} <span className="text-xs text-neutral-400">({galleryFiles.length}/{MAX_GALLERY})</span>
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {galleryPreviews.map((src, i) => (
                <div key={i} className="relative aspect-square rounded-lg overflow-hidden border border-neutral-200">
                  <img src={src} alt={`photo ${i + 1}`} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeGalleryImage(i)}
                    className="absolute top-1 right-1 p-1 rounded-full bg-black/60 text-white hover:bg-black/80"
                  >
                    <TrashIcon className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              {galleryFiles.length < MAX_GALLERY && (
                <label className="flex items-center justify-center aspect-square rounded-lg border-2 border-dashed border-neutral-300 cursor-pointer hover:border-primary/50 transition-colors">
                  <PlusIcon className="w-6 h-6 text-neutral-400" />
                  <input type="file" accept="image/*" multiple onChange={handleGalleryChange} className="hidden" />
                </label>
              )}
            </div>
          </div>
        </section>

        {/* --- Section: Policies --- */}
        <section className="bg-white rounded-2xl border border-neutral-200 p-6 space-y-5">
          <h2 className="text-lg font-semibold text-neutral-900">{t('form.sections.policies')}</h2>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1">{t('form.fields.checkIn')}</label>
              <input type="time" value={checkInTime} onChange={(e) => setCheckInTime(e.target.value)} className={inputClasses()} />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1">{t('form.fields.checkOut')}</label>
              <input type="time" value={checkOutTime} onChange={(e) => setCheckOutTime(e.target.value)} className={inputClasses()} />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1">{t('form.fields.minNights')}</label>
              <input
                type="number"
                min={1}
                value={minNights ?? ''}
                onChange={(e) => setMinNights(e.target.value === '' ? undefined : Number(e.target.value))}
                className={inputClasses()}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1">{t('form.fields.maxNights')}</label>
              <input
                type="number"
                min={1}
                value={maxNights ?? ''}
                onChange={(e) => setMaxNights(e.target.value === '' ? undefined : Number(e.target.value))}
                className={inputClasses()}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">{t('form.fields.cancellationPolicy')}</label>
            <select
              value={cancellationPolicy}
              onChange={(e) => setCancellationPolicy(e.target.value as CancellationPolicy)}
              className={inputClasses()}
            >
              <option value="">{t('form.placeholders.selectPolicy')}</option>
              {CANCELLATION_POLICIES.map((p) => (
                <option key={p} value={p}>{t(`cancellationPolicies.${p}`)}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm text-neutral-700 cursor-pointer">
              <input type="checkbox" checked={petsAllowed} onChange={(e) => setPetsAllowed(e.target.checked)} className="rounded" />
              {t('form.fields.petsAllowed')}
            </label>
            <label className="flex items-center gap-2 text-sm text-neutral-700 cursor-pointer">
              <input type="checkbox" checked={smokingAllowed} onChange={(e) => setSmokingAllowed(e.target.checked)} className="rounded" />
              {t('form.fields.smokingAllowed')}
            </label>
          </div>

          {/* House rules */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">{t('form.fields.houseRules')}</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={houseRuleInput}
                onChange={(e) => setHouseRuleInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addHouseRule(); } }}
                placeholder={t('form.placeholders.houseRule')}
                maxLength={200}
                className={inputClasses()}
              />
              <button type="button" onClick={addHouseRule} className="px-4 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-sm font-medium">{t('form.add')}</button>
            </div>
            {houseRules.length > 0 && (
              <ul className="mt-2 flex flex-wrap gap-2">
                {houseRules.map((rule) => (
                  <li key={rule} className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-neutral-100 text-sm text-neutral-700">
                    {rule}
                    <button type="button" onClick={() => setHouseRules((prev) => prev.filter((r) => r !== rule))} className="text-neutral-400 hover:text-red-500">×</button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Languages */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">{t('form.fields.languagesSpoken')}</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={languageInput}
                onChange={(e) => setLanguageInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addLanguage(); } }}
                placeholder={t('form.placeholders.language')}
                maxLength={50}
                className={inputClasses()}
              />
              <button type="button" onClick={addLanguage} className="px-4 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-sm font-medium">{t('form.add')}</button>
            </div>
            {languagesSpoken.length > 0 && (
              <ul className="mt-2 flex flex-wrap gap-2">
                {languagesSpoken.map((lang) => (
                  <li key={lang} className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-neutral-100 text-sm text-neutral-700">
                    {lang}
                    <button type="button" onClick={() => setLanguagesSpoken((prev) => prev.filter((l) => l !== lang))} className="text-neutral-400 hover:text-red-500">×</button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* Submit */}
        <div className="flex items-center justify-end gap-3 pb-10">
          <button
            type="button"
            onClick={onBack}
            className="px-5 py-3 rounded-xl border border-neutral-300 text-neutral-700 font-medium hover:bg-neutral-100 transition-colors"
          >
            {t('form.cancel')}
          </button>
          <button
            type="submit"
            disabled={isLoading || submitting}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold hover:brightness-110 shadow-lg shadow-cyan-500/25 transition-all disabled:opacity-60 flex items-center gap-2"
          >
            {isLoading && (
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            )}
            {isLoading ? t('form.publishing') : t('form.publish')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateHotelListingForm;
