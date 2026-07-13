import React, { useState, useCallback, useRef, lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { useCreateHotel, useUploadHotelCover, useUploadHotelPhotos } from '../hooks';
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

const emptyRoom = (): CreateRoomData => ({
  name: '',
  roomType: 'double',
  description: '',
  maxGuests: 2,
  beds: 1,
  bathrooms: 1,
  sizeSqm: undefined,
  pricePerNight: undefined as unknown as number,
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

  // --- Basics ---
  const [name, setName] = useState('');
  const [propertyType, setPropertyType] = useState<HotelPropertyType | ''>('');
  const [starRating, setStarRating] = useState<number | undefined>(undefined);
  const [description, setDescription] = useState('');
  const [currency, setCurrency] = useState<SupportedCurrency>('EUR');

  // --- Location ---
  const [selectedCountry, setSelectedCountry] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [address, setAddress] = useState('');
  const [availableCities, setAvailableCities] = useState<CityData[]>([]);
  const [lat, setLat] = useState(0);
  const [lng, setLng] = useState(0);
  const [showMap, setShowMap] = useState(false);

  // --- Contact ---
  const [contactPhone, setContactPhone] = useState(currentUser?.phone || '');
  const [contactEmail, setContactEmail] = useState(currentUser?.email || '');
  const [whatsapp, setWhatsapp] = useState('');
  const [website, setWebsite] = useState('');

  // --- Amenities ---
  const [amenities, setAmenities] = useState<HotelAmenity[]>([]);

  // --- Rooms ---
  const [rooms, setRooms] = useState<CreateRoomData[]>([emptyRoom()]);

  // --- Policies ---
  const [checkInTime, setCheckInTime] = useState('14:00');
  const [checkOutTime, setCheckOutTime] = useState('11:00');
  const [minNights, setMinNights] = useState<number | undefined>(1);
  const [maxNights, setMaxNights] = useState<number | undefined>(undefined);
  const [cancellationPolicy, setCancellationPolicy] = useState<CancellationPolicy | ''>('');
  const [petsAllowed, setPetsAllowed] = useState(false);
  const [smokingAllowed, setSmokingAllowed] = useState(false);
  const [houseRules, setHouseRules] = useState<string[]>([]);
  const [houseRuleInput, setHouseRuleInput] = useState('');
  const [languagesSpoken, setLanguagesSpoken] = useState<string[]>([]);
  const [languageInput, setLanguageInput] = useState('');

  // --- Images ---
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [galleryFiles, setGalleryFiles] = useState<File[]>([]);
  const [galleryPreviews, setGalleryPreviews] = useState<string[]>([]);

  // --- Error state ---
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<FieldErrorKey | null>(null);

  const clearErrors = useCallback(() => {
    setFormError(null);
    setFieldError(null);
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
  const updateRoom = useCallback(<K extends keyof CreateRoomData>(index: number, key: K, value: CreateRoomData[K]) => {
    setRooms((prev) => prev.map((room, i) => (i === index ? { ...room, [key]: value } : room)));
    clearErrors();
  }, [clearErrors]);

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
    clearErrors();

    // 1. Name
    const nameResult = validateHotelName(name);
    if (!nameResult.isValid) { setValidationError('name', nameResult.error!); return; }

    // 2. Property type
    if (!propertyType) { setValidationError('propertyType', t('form.errors.propertyTypeRequired')); return; }

    // 3. Star rating (optional)
    const starResult = validateStarRating(starRating);
    if (!starResult.isValid) { setFormError(starResult.error!); return; }

    // 4. Phone
    const phoneClean = parsePhoneValue(contactPhone).localDigits;
    if (!phoneClean || phoneClean.length < 6) { setValidationError('contactPhone', t('form.errors.phoneRequired')); return; }

    // 5. Location
    if (!selectedCountry.trim()) { setValidationError('country', t('form.errors.countryRequired')); return; }
    if (!selectedCity.trim()) { setValidationError('city', t('form.errors.cityRequired')); return; }

    // 6. Rooms — at least one, each valid
    if (rooms.length === 0) { setValidationError('rooms', t('form.errors.roomsRequired')); return; }
    for (let i = 0; i < rooms.length; i++) {
      const roomResult = validateRoom(rooms[i]);
      if (!roomResult.isValid) {
        setValidationError('rooms', t('form.errors.roomInvalid', { index: i + 1, error: roomResult.error }));
        return;
      }
    }

    // 7. Nights coherence
    if (minNights != null && maxNights != null && maxNights < minNights) {
      setFormError(t('form.errors.nightsRange'));
      return;
    }

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
          bathrooms: r.bathrooms != null ? Number(r.bathrooms) : 1,
          sizeSqm: r.sizeSqm != null && r.sizeSqm !== ('' as unknown) ? Number(r.sizeSqm) : undefined,
          pricePerNight: Number(r.pricePerNight),
          currency: r.currency || currency,
          quantity: r.quantity != null ? Number(r.quantity) : 1,
          amenities: r.amenities && r.amenities.length > 0 ? r.amenities : undefined,
        })),
        petsAllowed,
        smokingAllowed,
      };

      if (starRating) payload.starRating = starRating;
      if (description.trim()) payload.description = description.trim();
      if (contactEmail.trim()) payload.contactEmail = contactEmail.trim();
      if (whatsapp) payload.whatsapp = whatsapp;
      if (website.trim()) payload.website = website.trim();
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

      const result = await createHotel(payload);

      // Upload images after creation (non-blocking on failure)
      if (result.hotel?.id) {
        if (coverFile) {
          try { await uploadCover({ id: result.hotel.id, file: coverFile }); } catch { /* cover optional */ }
        }
        if (galleryFiles.length > 0) {
          try { await uploadPhotos({ id: result.hotel.id, files: galleryFiles }); } catch { /* gallery optional */ }
        }
      }

      onSuccess();
    } catch (err: any) {
      setFormError(err?.message || t('form.errors.generic'));
    }
  }, [
    name, propertyType, starRating, contactPhone, selectedCountry, selectedCity, rooms, minNights, maxNights,
    description, contactEmail, whatsapp, website, address, lat, lng, amenities, currency, checkInTime,
    checkOutTime, cancellationPolicy, houseRules, languagesSpoken, petsAllowed, smokingAllowed,
    coverFile, galleryFiles, createHotel, uploadCover, uploadPhotos, onSuccess, t, clearErrors, setValidationError,
  ]);

  const displayError = formError || (error as Error)?.message;

  return (
    <div className="min-h-screen bg-neutral-50">
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
              className={inputClasses(fieldError === 'name')}
            />
          </div>

          <div ref={fieldRefs.propertyType}>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">
              {t('form.fields.propertyType')} <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
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
                className={inputClasses(fieldError === 'country')}
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
                className={inputClasses(fieldError === 'city')}
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
              error={fieldError === 'contactPhone' ? t('form.errors.phoneRequired') : undefined}
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
                type="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://"
                className={inputClasses()}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">{t('form.fields.whatsapp')}</label>
            <PhoneInput value={whatsapp} onChange={setWhatsapp} variant="bordered" />
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
                    className={inputClasses()}
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
                    value={room.pricePerNight ?? ''}
                    onChange={(e) => updateRoom(index, 'pricePerNight', e.target.value === '' ? (undefined as unknown as number) : Number(e.target.value))}
                    placeholder="50"
                    className={inputClasses()}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-600 mb-1">{t('form.fields.maxGuests')} <span className="text-red-500">*</span></label>
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={room.maxGuests}
                    onChange={(e) => updateRoom(index, 'maxGuests', Number(e.target.value))}
                    className={inputClasses()}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-600 mb-1">{t('form.fields.beds')} <span className="text-red-500">*</span></label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={room.beds}
                    onChange={(e) => updateRoom(index, 'beds', Number(e.target.value))}
                    className={inputClasses()}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-600 mb-1">{t('form.fields.bathrooms')}</label>
                  <input
                    type="number"
                    min={0}
                    max={10}
                    value={room.bathrooms ?? 1}
                    onChange={(e) => updateRoom(index, 'bathrooms', Number(e.target.value))}
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
                    value={room.sizeSqm ?? ''}
                    onChange={(e) => updateRoom(index, 'sizeSqm', e.target.value === '' ? undefined : Number(e.target.value))}
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
                    value={room.quantity ?? 1}
                    onChange={(e) => updateRoom(index, 'quantity', Number(e.target.value))}
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
            disabled={isLoading}
            className="px-6 py-3 rounded-xl bg-primary text-white font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60 flex items-center gap-2"
          >
            {isLoading ? t('form.publishing') : t('form.publish')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateHotelListingForm;
