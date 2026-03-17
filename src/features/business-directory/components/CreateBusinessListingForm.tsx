import React, { useState, useCallback, useRef, lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { useCreateBusinessListing, useUploadBusinessLogo, useMyBusinessListings } from '../hooks';
import { BUSINESS_CATEGORIES, type BusinessCategory, type CreateBusinessListingData, type ListingType } from '@/src/shared/types/businessListing.types';
import { Animated } from '@/src/components/ui/Animations';
import { BuildingStorefrontIcon, UserIcon, MapPinIcon } from '@/constants';
import { BALKAN_LOCATIONS, type CityData } from '@/utils/balkanLocations';
import { useAppContext } from '@/context/AppContext';

const MAX_LISTINGS_PER_USER = 3;

const MapLocationPicker = lazy(() => import('@/src/features/seller/components/MapLocationPicker'));

interface CreateBusinessListingFormProps {
  onBack: () => void;
  onSuccess: () => void;
}

type FieldErrorKey = 'name' | 'category' | 'contactPhone' | 'contactEmail' | 'website' | 'country' | 'city';

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;

const CATEGORY_ICONS: Record<string, string> = {
  construction: '\u{1F3D7}',
  renovation: '\u{1F528}',
  cleaning: '\u{2728}',
  moving: '\u{1F69A}',
  interior_design: '\u{1F3A8}',
  architecture: '\u{1F4D0}',
  plumbing: '\u{1F6BF}',
  electrical: '\u{26A1}',
  landscaping: '\u{1F333}',
  security: '\u{1F512}',
  real_estate_law: '\u{2696}',
  insurance: '\u{1F6E1}',
  home_inspection: '\u{1F50D}',
  pest_control: '\u{1F41B}',
  painting: '\u{1F58C}',
  roofing: '\u{1F3E0}',
  hvac: '\u{2744}',
  furniture: '\u{1FA91}',
  appliances: '\u{1F4FA}',
  other: '\u{1F4CB}',
};

const CreateBusinessListingForm: React.FC<CreateBusinessListingFormProps> = ({ onBack, onSuccess }) => {
  const { t } = useTranslation('businessDirectory');
  const { state } = useAppContext();
  const { createListing, isLoading, error } = useCreateBusinessListing();
  const { uploadLogo } = useUploadBusinessLogo();
  const { listings: myListings, isLoading: isLoadingMyListings } = useMyBusinessListings();
  const currentUser = state.currentUser;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCreatingModal, setShowCreatingModal] = useState(false);

  const hasReachedLimit = myListings.length >= MAX_LISTINGS_PER_USER;

  // Refs for scroll-to-error
  const fieldRefs = {
    name: useRef<HTMLInputElement>(null),
    category: useRef<HTMLDivElement>(null),
    contactPhone: useRef<HTMLInputElement>(null),
    contactEmail: useRef<HTMLInputElement>(null),
    website: useRef<HTMLInputElement>(null),
    country: useRef<HTMLSelectElement>(null),
    city: useRef<HTMLSelectElement>(null),
  };

  const [listingType, setListingType] = useState<ListingType>('business');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [formData, setFormData] = useState<CreateBusinessListingData>({
    name: '',
    description: '',
    category: '' as BusinessCategory,
    services: [],
    contactPhone: currentUser?.phone || '',
    contactEmail: currentUser?.email || '',
    website: '',
    address: '',
    city: '',
    country: '',
    socialMedia: { facebook: '', instagram: '', linkedin: '' },
    businessHours: {},
  });

  const [serviceInput, setServiceInput] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<FieldErrorKey | null>(null);
  const [showHours, setShowHours] = useState(false);
  const [lat, setLat] = useState(0);
  const [lng, setLng] = useState(0);
  const [showMap, setShowMap] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [availableCities, setAvailableCities] = useState<CityData[]>([]);

  const inputClasses = (field?: FieldErrorKey) =>
    `w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors ${
      fieldError === field ? 'border-red-500 ring-2 ring-red-100' : 'border-neutral-300'
    }`;

  const selectClasses = (field?: FieldErrorKey) =>
    `w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors bg-white appearance-none ${
      fieldError === field ? 'border-red-500 ring-2 ring-red-100' : 'border-neutral-300'
    }`;

  const clearErrors = useCallback(() => {
    setFormError(null);
    setFieldError(null);
  }, []);

  const setValidationError = useCallback((field: FieldErrorKey, message: string) => {
    setFormError(message);
    setFieldError(field);
    // Scroll to the errored field
    const ref = fieldRefs[field];
    if (ref.current) {
      ref.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Focus the field after scroll
      setTimeout(() => ref.current?.focus?.(), 400);
    }
  }, [fieldRefs]);

  const handleChange = useCallback((
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    clearErrors();
  }, [clearErrors]);

  const handleCountryChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const countryName = e.target.value;
    setSelectedCountry(countryName);
    setSelectedCity('');
    setFormData(prev => ({ ...prev, country: countryName, city: '' }));
    clearErrors();

    const country = BALKAN_LOCATIONS.find(c => c.name === countryName);
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
    setFormData(prev => ({ ...prev, city: cityName }));
    clearErrors();

    const city = availableCities.find(c => c.name === cityName);
    if (city) {
      setLat(city.lat);
      setLng(city.lng);
      setFormData(prev => ({
        ...prev,
        city: cityName,
        address: `${cityName}, ${selectedCountry}`,
      }));
      setShowMap(true);
    }
  }, [availableCities, selectedCountry, clearErrors]);

  const handleSocialChange = useCallback((field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      socialMedia: { ...prev.socialMedia, [field]: value },
    }));
  }, []);

  const handleHoursChange = useCallback((day: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      businessHours: { ...prev.businessHours, [day]: value },
    }));
  }, []);

  const addService = useCallback(() => {
    const trimmed = serviceInput.trim();
    if (!trimmed) return;
    if ((formData.services?.length || 0) >= 20) return;
    if (formData.services?.includes(trimmed)) return;
    setFormData((prev) => ({
      ...prev,
      services: [...(prev.services || []), trimmed],
    }));
    setServiceInput('');
  }, [serviceInput, formData.services]);

  const removeService = useCallback((service: string) => {
    setFormData((prev) => ({
      ...prev,
      services: prev.services?.filter((s) => s !== service) || [],
    }));
  }, []);

  const MAX_LOGO_SIZE = 5 * 1024 * 1024; // 5MB
  const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

  const handleLogoChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setFormError(t('form.errors.logoInvalidType'));
      return;
    }
    if (file.size > MAX_LOGO_SIZE) {
      setFormError(t('form.errors.logoTooLarge'));
      return;
    }

    setLogoFile(file);
    clearErrors();
    const reader = new FileReader();
    reader.onloadend = () => setLogoPreview(reader.result as string);
    reader.readAsDataURL(file);
  }, [t, clearErrors]);

  const removeLogo = useCallback(() => {
    setLogoFile(null);
    setLogoPreview(null);
  }, []);

  const handleMapLocationChange = useCallback((newLat: number, newLng: number) => {
    setLat(newLat);
    setLng(newLng);
  }, []);

  const handleMapAddressChange = useCallback((searchedAddress: string) => {
    setFormData(prev => ({ ...prev, address: searchedAddress }));
  }, []);

  const handleServiceKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addService();
    }
  }, [addService]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    clearErrors();

    // Check listing limit
    if (hasReachedLimit) {
      setFormError(t('form.errors.maxListingsReached', { defaultValue: `You can create a maximum of ${MAX_LISTINGS_PER_USER} business listings.` }));
      return;
    }

    // Validate with scroll-to-error
    if (!formData.name.trim()) { setValidationError('name', t('form.errors.nameRequired')); return; }
    if (formData.name.trim().length < 2) { setValidationError('name', t('form.errors.nameTooShort', { defaultValue: 'Name must be at least 2 characters.' })); return; }
    if (!formData.category) { setValidationError('category', t('form.errors.categoryRequired')); return; }
    if (!formData.contactPhone.trim()) { setValidationError('contactPhone', t('form.errors.phoneRequired')); return; }
    // Phone: allow digits, spaces, +, -, (, )
    const phoneRegex = /^[+]?[\d\s\-()]{6,30}$/;
    if (!phoneRegex.test(formData.contactPhone.trim())) { setValidationError('contactPhone', t('form.errors.phoneInvalid', { defaultValue: 'Please enter a valid phone number.' })); return; }
    // Email validation (optional field, but validate format if provided)
    if (formData.contactEmail?.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.contactEmail.trim())) { setValidationError('contactEmail', t('form.errors.emailInvalid', { defaultValue: 'Please enter a valid email address.' })); return; }
    }
    // Website validation (optional, but validate if provided)
    if (formData.website?.trim()) {
      try {
        const urlStr = formData.website.trim().startsWith('http') ? formData.website.trim() : `https://${formData.website.trim()}`;
        new URL(urlStr);
      } catch {
        setValidationError('website', t('form.errors.websiteInvalid', { defaultValue: 'Please enter a valid website URL.' })); return;
      }
    }
    if (!formData.country.trim()) { setValidationError('country', t('form.errors.countryRequired')); return; }
    if (!formData.city.trim()) { setValidationError('city', t('form.errors.cityRequired')); return; }

    try {
      setIsSubmitting(true);
      setShowCreatingModal(true);

      const cleanData: CreateBusinessListingData = {
        listingType,
        name: formData.name.trim(),
        category: formData.category,
        contactPhone: formData.contactPhone.trim(),
        city: formData.city.trim(),
        country: formData.country.trim(),
      };

      if (formData.description?.trim()) cleanData.description = formData.description.trim();
      if (formData.services && formData.services.length > 0) cleanData.services = formData.services;
      if (formData.contactEmail?.trim()) cleanData.contactEmail = formData.contactEmail.trim();
      if (formData.website?.trim()) cleanData.website = formData.website.trim();
      if (formData.address?.trim()) cleanData.address = formData.address.trim();
      if (lat !== 0 && lng !== 0) {
        cleanData.latitude = lat;
        cleanData.longitude = lng;
      }

      const social = formData.socialMedia;
      if (social?.facebook || social?.instagram || social?.linkedin) {
        cleanData.socialMedia = {
          ...(social.facebook && { facebook: social.facebook }),
          ...(social.instagram && { instagram: social.instagram }),
          ...(social.linkedin && { linkedin: social.linkedin }),
        };
      }

      const hours = formData.businessHours;
      if (hours && Object.values(hours).some(Boolean)) {
        cleanData.businessHours = hours;
      }

      const result = await createListing(cleanData);

      // Upload logo after listing is created
      if (logoFile && result.listing?.id) {
        try {
          await uploadLogo({ id: result.listing.id, file: logoFile });
        } catch {
          // Logo upload failure shouldn't block listing creation
        }
      }

      setShowCreatingModal(false);
      onSuccess();
    } catch (err: any) {
      setShowCreatingModal(false);
      setFormError(err?.message || t('form.errors.generic'));
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, listingType, lat, lng, logoFile, createListing, uploadLogo, onSuccess, t, clearErrors, setValidationError, isSubmitting, hasReachedLimit]);

  const displayError = formError || (error as Error)?.message;

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header banner */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="form-grid" width="30" height="30" patternUnits="userSpaceOnUse">
                <path d="M 30 0 L 0 0 0 30" fill="none" stroke="white" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#form-grid)" />
          </svg>
        </div>
        <div className="absolute top-5 right-[15%] w-40 h-40 bg-violet-500/20 rounded-full blur-3xl" />

        <div className="relative z-10 max-w-2xl mx-auto px-4 py-8">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1.5 text-sm text-white/70 hover:text-white font-medium mb-4 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
            {t('detail.backToDirectory')}
          </button>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">{t('form.title')}</h1>
          <p className="text-white/50 text-sm mt-1">{t('form.subtitle')}</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 -mt-4 relative z-10">
        {/* Sticky error toast */}
        {displayError && (
          <Animated variant="scaleIn">
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center gap-3 sticky top-4 z-50 shadow-lg shadow-red-100/50">
              <svg className="w-5 h-5 flex-shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              <span className="flex-1">{displayError}</span>
              <button
                type="button"
                onClick={clearErrors}
                className="text-red-400 hover:text-red-600 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </Animated>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Listing type selector */}
          <Animated variant="fadeInUp">
            <div className="bg-white rounded-2xl border border-neutral-200 p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-neutral-900 mb-4">{t('form.sections.type')}</h2>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setListingType('business')}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200 ${
                    listingType === 'business'
                      ? 'border-primary bg-primary/5 shadow-md shadow-primary/10'
                      : 'border-neutral-200 hover:border-neutral-300 bg-white'
                  }`}
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    listingType === 'business' ? 'bg-primary/10' : 'bg-neutral-100'
                  }`}>
                    <BuildingStorefrontIcon className={`w-6 h-6 ${listingType === 'business' ? 'text-primary' : 'text-neutral-400'}`} />
                  </div>
                  <span className={`font-semibold text-sm ${listingType === 'business' ? 'text-primary' : 'text-neutral-600'}`}>
                    {t('types.business')}
                  </span>
                  <span className="text-xs text-neutral-400 text-center">{t('form.typeDescBusiness')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setListingType('individual')}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200 ${
                    listingType === 'individual'
                      ? 'border-violet-500 bg-violet-50 shadow-md shadow-violet-500/10'
                      : 'border-neutral-200 hover:border-neutral-300 bg-white'
                  }`}
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    listingType === 'individual' ? 'bg-violet-100' : 'bg-neutral-100'
                  }`}>
                    <UserIcon className={`w-6 h-6 ${listingType === 'individual' ? 'text-violet-500' : 'text-neutral-400'}`} />
                  </div>
                  <span className={`font-semibold text-sm ${listingType === 'individual' ? 'text-violet-600' : 'text-neutral-600'}`}>
                    {t('types.individual')}
                  </span>
                  <span className="text-xs text-neutral-400 text-center">{t('form.typeDescIndividual')}</span>
                </button>
              </div>
            </div>
          </Animated>

          {/* Logo / Avatar upload */}
          <Animated variant="fadeInUp" delay={30}>
            <div className="bg-white rounded-2xl border border-neutral-200 p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-neutral-900 mb-4">
                {listingType === 'individual' ? t('form.fields.avatar') : t('form.fields.logo')}
              </h2>
              <div className="flex items-center gap-5">
                <div className="w-20 h-20 rounded-2xl bg-neutral-100 flex items-center justify-center flex-shrink-0 overflow-hidden border-2 border-dashed border-neutral-300">
                  {logoPreview ? (
                    <img src={logoPreview} alt="Preview" className="w-full h-full object-cover rounded-xl" />
                  ) : (
                    <div className="text-center">
                      <svg className="w-8 h-8 mx-auto text-neutral-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.41a2.25 2.25 0 013.182 0l2.909 2.91m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                      </svg>
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex gap-2">
                    <label className="px-4 py-2 bg-primary/10 text-primary rounded-xl text-sm font-medium cursor-pointer hover:bg-primary/20 transition-colors">
                      {logoFile ? t('form.logoChange') : t('form.logoUpload')}
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleLogoChange}
                        className="hidden"
                      />
                    </label>
                    {logoFile && (
                      <button
                        type="button"
                        onClick={removeLogo}
                        className="px-4 py-2 text-red-500 hover:bg-red-50 rounded-xl text-sm font-medium transition-colors"
                      >
                        {t('form.logoRemove')}
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-neutral-400 mt-2">{t('form.logoHint')}</p>
                </div>
              </div>
            </div>
          </Animated>

          {/* Basic info */}
          <Animated variant="fadeInUp" delay={50}>
            <div className="bg-white rounded-2xl border border-neutral-200 p-6 shadow-sm space-y-4">
              <h2 className="text-lg font-semibold text-neutral-900">{t('form.sections.basicInfo')}</h2>

              {/* Name */}
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-neutral-700 mb-1">
                  {listingType === 'individual' ? t('form.fields.fullName') : t('form.fields.name')} <span className="text-red-500">*</span>
                </label>
                <input
                  ref={fieldRefs.name}
                  id="name"
                  name="name"
                  type="text"
                  value={formData.name}
                  onChange={handleChange}
                  maxLength={100}
                  className={inputClasses('name')}
                  placeholder={listingType === 'individual' ? t('form.placeholders.fullName') : t('form.placeholders.name')}
                />
              </div>

              {/* Category grid */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  {t('form.fields.category')} <span className="text-red-500">*</span>
                </label>
                <div
                  ref={fieldRefs.category}
                  className={`grid grid-cols-3 sm:grid-cols-4 gap-2 p-1 rounded-xl ${
                    fieldError === 'category' ? 'ring-2 ring-red-200 bg-red-50/30' : ''
                  }`}
                >
                  {BUSINESS_CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => { setFormData(prev => ({ ...prev, category: cat })); clearErrors(); }}
                      className={`flex flex-col items-center gap-1 p-2.5 rounded-xl text-xs font-medium transition-all duration-200 border ${
                        formData.category === cat
                          ? 'border-primary bg-primary/5 text-primary shadow-sm'
                          : 'border-neutral-200 text-neutral-600 hover:border-primary/30 hover:bg-neutral-50'
                      }`}
                    >
                      <span className="text-lg">{CATEGORY_ICONS[cat]}</span>
                      <span className="text-center leading-tight">{t(`categories.${cat}`)}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-neutral-700 mb-1">
                  {t('form.fields.description')}
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={4}
                  maxLength={2000}
                  className="w-full px-4 py-2.5 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors resize-none"
                  placeholder={t('form.placeholders.description')}
                />
              </div>

              {/* Services */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  {t('form.fields.services')}
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={serviceInput}
                    onChange={(e) => setServiceInput(e.target.value)}
                    onKeyDown={handleServiceKeyDown}
                    maxLength={100}
                    className="flex-1 px-4 py-2.5 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                    placeholder={t('form.placeholders.service')}
                  />
                  <button
                    type="button"
                    onClick={addService}
                    className="px-4 py-2.5 bg-neutral-100 text-neutral-700 rounded-xl hover:bg-neutral-200 transition-colors font-medium"
                  >
                    {t('form.addService')}
                  </button>
                </div>
                {formData.services && formData.services.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.services.map((service) => (
                      <span
                        key={service}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-primary/10 text-primary rounded-lg text-sm font-medium"
                      >
                        {service}
                        <button
                          type="button"
                          onClick={() => removeService(service)}
                          className="hover:text-red-500 transition-colors"
                          aria-label={`Remove ${service}`}
                        >
                          &times;
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </Animated>

          {/* Contact info */}
          <Animated variant="fadeInUp" delay={100}>
            <div className="bg-white rounded-2xl border border-neutral-200 p-6 shadow-sm space-y-4">
              <h2 className="text-lg font-semibold text-neutral-900">{t('form.sections.contact')}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="contactPhone" className="block text-sm font-medium text-neutral-700 mb-1">
                    {t('form.fields.phone')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    ref={fieldRefs.contactPhone}
                    id="contactPhone"
                    name="contactPhone"
                    type="tel"
                    value={formData.contactPhone}
                    onChange={handleChange}
                    maxLength={30}
                    className={inputClasses('contactPhone')}
                    placeholder={t('form.placeholders.phone')}
                  />
                </div>
                <div>
                  <label htmlFor="contactEmail" className="block text-sm font-medium text-neutral-700 mb-1">
                    {t('form.fields.email')}
                  </label>
                  <input
                    ref={fieldRefs.contactEmail}
                    id="contactEmail"
                    name="contactEmail"
                    type="email"
                    value={formData.contactEmail}
                    onChange={handleChange}
                    maxLength={100}
                    className={inputClasses('contactEmail')}
                    placeholder={t('form.placeholders.email')}
                  />
                </div>
              </div>
              <div>
                <label htmlFor="website" className="block text-sm font-medium text-neutral-700 mb-1">
                  {t('form.fields.website')}
                </label>
                <input
                  ref={fieldRefs.website}
                  id="website"
                  name="website"
                  type="url"
                  value={formData.website}
                  onChange={handleChange}
                  maxLength={200}
                  className={inputClasses('website')}
                  placeholder={t('form.placeholders.website')}
                />
              </div>
            </div>
          </Animated>

          {/* Location */}
          <Animated variant="fadeInUp" delay={150}>
            <div className="bg-white rounded-2xl border border-neutral-200 p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-2">
                <MapPinIcon className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-semibold text-neutral-900">{t('form.sections.businessLocation')}</h2>
              </div>
              <p className="text-sm text-neutral-500">{t('form.locationHint')}</p>

              {/* Country & City dropdowns */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="country" className="block text-sm font-medium text-neutral-700 mb-1">
                    {t('form.fields.country')} <span className="text-red-500">*</span>
                  </label>
                  <select
                    ref={fieldRefs.country}
                    id="country"
                    value={selectedCountry}
                    onChange={handleCountryChange}
                    className={selectClasses('country')}
                  >
                    <option value="">{t('form.placeholders.selectCountry')}</option>
                    {BALKAN_LOCATIONS.map(country => (
                      <option key={country.code} value={country.name}>
                        {country.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="city" className="block text-sm font-medium text-neutral-700 mb-1">
                    {t('form.fields.city')} <span className="text-red-500">*</span>
                  </label>
                  <select
                    ref={fieldRefs.city}
                    id="city"
                    value={selectedCity}
                    onChange={handleCityChange}
                    className={selectClasses('city')}
                    disabled={!selectedCountry}
                  >
                    <option value="">{t('form.placeholders.selectCity')}</option>
                    {availableCities.map(city => (
                      <option key={city.name} value={city.name}>
                        {city.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Address */}
              <div>
                <label htmlFor="address" className="block text-sm font-medium text-neutral-700 mb-1">
                  {t('form.fields.address')}
                </label>
                <input
                  id="address"
                  name="address"
                  type="text"
                  value={formData.address}
                  onChange={handleChange}
                  maxLength={200}
                  className="w-full px-4 py-2.5 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                  placeholder={t('form.placeholders.address')}
                />
              </div>

              {/* Map location picker - auto-shows when city selected */}
              {selectedCity && (
                <>
                  {!showMap ? (
                    <button
                      type="button"
                      onClick={() => setShowMap(true)}
                      className="flex items-center gap-2 w-full py-3 px-4 border-2 border-dashed border-primary/30 rounded-xl text-primary font-medium hover:bg-primary/5 hover:border-primary/50 transition-all text-sm"
                    >
                      <MapPinIcon className="w-4 h-4" />
                      {t('form.pinOnMap')}
                    </button>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="block text-sm font-medium text-neutral-700">
                          {t('form.fields.pinLocation')}
                        </label>
                        {lat !== 0 && lng !== 0 && (
                          <span className="text-xs text-emerald-600 font-medium bg-emerald-50 px-2 py-1 rounded-full">
                            {t('form.locationSet')}
                          </span>
                        )}
                      </div>
                      <div className="rounded-xl overflow-hidden border border-neutral-200">
                        <Suspense fallback={
                          <div className="h-[300px] bg-neutral-100 flex items-center justify-center">
                            <div className="flex items-center gap-2 text-neutral-400">
                              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                              </svg>
                              <span className="text-sm">{t('form.loadingMap')}</span>
                            </div>
                          </div>
                        }>
                          <MapLocationPicker
                            lat={lat || 41.9981}
                            lng={lng || 21.4254}
                            address={formData.address || ''}
                            zoom={lat !== 0 ? 15 : 8}
                            country={formData.country}
                            city={formData.city}
                            onLocationChange={handleMapLocationChange}
                            onAddressChange={handleMapAddressChange}
                            autoDetectLocation={lat === 0 && lng === 0}
                          />
                        </Suspense>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </Animated>

          {/* Social media */}
          <Animated variant="fadeInUp" delay={200}>
            <div className="bg-white rounded-2xl border border-neutral-200 p-6 shadow-sm space-y-4">
              <h2 className="text-lg font-semibold text-neutral-900">{t('form.sections.social')}</h2>
              <div className="space-y-3">
                <div>
                  <label htmlFor="facebook" className="block text-sm font-medium text-neutral-700 mb-1">Facebook</label>
                  <input
                    id="facebook"
                    type="url"
                    value={formData.socialMedia?.facebook || ''}
                    onChange={(e) => handleSocialChange('facebook', e.target.value)}
                    className="w-full px-4 py-2.5 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                    placeholder="https://facebook.com/..."
                  />
                </div>
                <div>
                  <label htmlFor="instagram" className="block text-sm font-medium text-neutral-700 mb-1">Instagram</label>
                  <input
                    id="instagram"
                    type="url"
                    value={formData.socialMedia?.instagram || ''}
                    onChange={(e) => handleSocialChange('instagram', e.target.value)}
                    className="w-full px-4 py-2.5 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                    placeholder="https://instagram.com/..."
                  />
                </div>
                <div>
                  <label htmlFor="linkedin" className="block text-sm font-medium text-neutral-700 mb-1">LinkedIn</label>
                  <input
                    id="linkedin"
                    type="url"
                    value={formData.socialMedia?.linkedin || ''}
                    onChange={(e) => handleSocialChange('linkedin', e.target.value)}
                    className="w-full px-4 py-2.5 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                    placeholder="https://linkedin.com/..."
                  />
                </div>
              </div>
            </div>
          </Animated>

          {/* Business hours */}
          <Animated variant="fadeInUp" delay={250}>
            <div className="bg-white rounded-2xl border border-neutral-200 p-6 shadow-sm">
              <button
                type="button"
                onClick={() => setShowHours(!showHours)}
                className="flex items-center justify-between w-full text-lg font-semibold text-neutral-900"
              >
                {t('form.sections.hours')}
                <svg
                  className={`w-5 h-5 text-neutral-400 transition-transform duration-200 ${showHours ? 'rotate-180' : ''}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
              </button>
              {showHours && (
                <div className="mt-4 space-y-3">
                  {DAYS.map((day) => (
                    <div key={day} className="flex items-center gap-3">
                      <label htmlFor={`hours-${day}`} className="w-24 text-sm font-medium text-neutral-700 capitalize">
                        {t(`days.${day}`)}
                      </label>
                      <input
                        id={`hours-${day}`}
                        type="text"
                        value={formData.businessHours?.[day] || ''}
                        onChange={(e) => handleHoursChange(day, e.target.value)}
                        className="flex-1 px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors text-sm"
                        placeholder={t('form.placeholders.hours')}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Animated>

          {/* Max listings warning */}
          {hasReachedLimit && (
            <Animated variant="scaleIn">
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 text-sm flex items-center gap-3">
                <svg className="w-5 h-5 flex-shrink-0 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                </svg>
                <span>{t('form.errors.maxListingsReached', { defaultValue: `You have reached the maximum of ${MAX_LISTINGS_PER_USER} business listings.` })}</span>
              </div>
            </Animated>
          )}

          {/* Listing count indicator */}
          {!isLoadingMyListings && myListings.length > 0 && !hasReachedLimit && (
            <div className="text-center text-xs text-neutral-400">
              {t('form.listingsCount', { current: myListings.length, max: MAX_LISTINGS_PER_USER, defaultValue: `${myListings.length} of ${MAX_LISTINGS_PER_USER} listings used` })}
            </div>
          )}

          {/* Submit */}
          <Animated variant="fadeInUp" delay={300}>
            <button
              type="submit"
              disabled={isLoading || isSubmitting || hasReachedLimit}
              className="w-full py-3.5 bg-gradient-to-r from-primary to-blue-600 text-white font-bold rounded-xl hover:shadow-lg hover:shadow-primary/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.99] text-base"
            >
              {isLoading || isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  {t('form.submitting')}
                </span>
              ) : t('form.submit')}
            </button>
          </Animated>
        </form>
      </div>

      {/* Creation in progress modal */}
      <AnimatePresence>
        {showCreatingModal && (
          <motion.div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white rounded-2xl p-8 shadow-2xl max-w-sm mx-4 text-center"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            >
              <div className="w-16 h-16 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-primary animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-neutral-900 mb-2">
                {t('form.creatingTitle', { defaultValue: 'Creating your listing...' })}
              </h3>
              <p className="text-sm text-neutral-500">
                {t('form.creatingDesc', { defaultValue: 'Please wait while we set up your business listing. This may take a moment.' })}
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CreateBusinessListingForm;
