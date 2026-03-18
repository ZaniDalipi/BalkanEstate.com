import React, { useState, useCallback, useRef, useEffect, lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { useUpdateBusinessListing, useUploadBusinessLogo, useUploadBusinessBanner } from '../hooks';
import { BUSINESS_CATEGORIES, type BusinessCategory, type CreateBusinessListingData, type ListingType, type BusinessListing, PRICE_RANGES, PAYMENT_METHODS, BALKAN_LANGUAGES, type PriceRange, type PaymentMethod } from '@/src/shared/types/businessListing.types';
import { Animated } from '@/src/components/ui/Animations';
import { BuildingStorefrontIcon, UserIcon, MapPinIcon } from '@/constants';
import { BALKAN_LOCATIONS, type CityData } from '@/utils/balkanLocations';

const MapLocationPicker = lazy(() => import('@/src/features/seller/components/MapLocationPicker'));

interface EditBusinessListingFormProps {
  listing: BusinessListing;
  onBack: () => void;
  onSuccess: () => void;
}

type FieldErrorKey = 'name' | 'category' | 'contactPhone' | 'country' | 'city';

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

const EditBusinessListingForm: React.FC<EditBusinessListingFormProps> = ({ listing, onBack, onSuccess }) => {
  const { t } = useTranslation('businessDirectory');
  const { updateListing, isLoading, error } = useUpdateBusinessListing();
  const { uploadLogo } = useUploadBusinessLogo();
  const { uploadBanner } = useUploadBusinessBanner();

  const fieldRefs = {
    name: useRef<HTMLInputElement>(null),
    category: useRef<HTMLDivElement>(null),
    contactPhone: useRef<HTMLInputElement>(null),
    country: useRef<HTMLSelectElement>(null),
    city: useRef<HTMLSelectElement>(null),
  };

  // Initialize from existing listing
  const [listingType, setListingType] = useState<ListingType>(listing.listingType);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(listing.logoUrl || null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(listing.bannerUrl || null);
  const [formData, setFormData] = useState<CreateBusinessListingData>({
    name: listing.name,
    description: listing.description || '',
    category: listing.category,
    customCategory: listing.customCategory || '',
    services: listing.services || [],
    contactPhone: listing.contactPhone,
    contactEmail: listing.contactEmail || '',
    website: listing.website || '',
    address: listing.address || '',
    city: listing.city,
    country: listing.country,
    whatsapp: listing.whatsapp || '',
    viber: listing.viber || '',
    languages: listing.languages || [],
    yearEstablished: listing.yearEstablished,
    licenseNumber: listing.licenseNumber || '',
    serviceAreas: listing.serviceAreas || [],
    priceRange: listing.priceRange,
    paymentMethods: listing.paymentMethods || [],
    socialMedia: {
      facebook: listing.socialMedia?.facebook || '',
      instagram: listing.socialMedia?.instagram || '',
      linkedin: listing.socialMedia?.linkedin || '',
      tiktok: listing.socialMedia?.tiktok || '',
    },
    businessHours: listing.businessHours || {},
  });

  const [serviceInput, setServiceInput] = useState('');
  const [languageInput, setLanguageInput] = useState('');
  const [serviceAreaInput, setServiceAreaInput] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<FieldErrorKey | null>(null);
  const [showHours, setShowHours] = useState(
    !!(listing.businessHours && Object.values(listing.businessHours).some(Boolean))
  );
  const [lat, setLat] = useState(listing.latitude || 0);
  const [lng, setLng] = useState(listing.longitude || 0);
  const [showMap, setShowMap] = useState(!!(listing.latitude && listing.longitude));
  const [selectedCountry, setSelectedCountry] = useState(listing.country);
  const [selectedCity, setSelectedCity] = useState(listing.city);
  const [availableCities, setAvailableCities] = useState<CityData[]>([]);
  const [isActive, setIsActive] = useState(listing.isActive);

  // Initialize available cities based on the listing's country
  useEffect(() => {
    const country = BALKAN_LOCATIONS.find(c => c.name === listing.country);
    if (country) {
      setAvailableCities(country.cities);
    }
  }, [listing.country]);

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
    const ref = fieldRefs[field];
    if (ref.current) {
      ref.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
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

  const addLanguage = useCallback(() => {
    const trimmed = languageInput.trim();
    if (!trimmed) return;
    if ((formData.languages?.length || 0) >= 10) return;
    if (formData.languages?.includes(trimmed)) return;
    setFormData((prev) => ({ ...prev, languages: [...(prev.languages || []), trimmed] }));
    setLanguageInput('');
  }, [languageInput, formData.languages]);

  const removeLanguage = useCallback((lang: string) => {
    setFormData((prev) => ({ ...prev, languages: prev.languages?.filter((l) => l !== lang) || [] }));
  }, []);

  const addServiceArea = useCallback(() => {
    const trimmed = serviceAreaInput.trim();
    if (!trimmed) return;
    if ((formData.serviceAreas?.length || 0) >= 20) return;
    if (formData.serviceAreas?.includes(trimmed)) return;
    setFormData((prev) => ({ ...prev, serviceAreas: [...(prev.serviceAreas || []), trimmed] }));
    setServiceAreaInput('');
  }, [serviceAreaInput, formData.serviceAreas]);

  const removeServiceArea = useCallback((area: string) => {
    setFormData((prev) => ({ ...prev, serviceAreas: prev.serviceAreas?.filter((a) => a !== area) || [] }));
  }, []);

  const togglePaymentMethod = useCallback((method: PaymentMethod) => {
    setFormData((prev) => {
      const current = prev.paymentMethods || [];
      if (current.includes(method)) {
        return { ...prev, paymentMethods: current.filter((m) => m !== method) };
      }
      if (current.length >= 10) return prev;
      return { ...prev, paymentMethods: [...current, method] };
    });
  }, []);

  const MAX_LOGO_SIZE = 5 * 1024 * 1024;
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

  const handleBannerChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
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

    setBannerFile(file);
    clearErrors();
    const reader = new FileReader();
    reader.onloadend = () => setBannerPreview(reader.result as string);
    reader.readAsDataURL(file);
  }, [t, clearErrors]);

  const removeBanner = useCallback(() => {
    setBannerFile(null);
    setBannerPreview(null);
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
    clearErrors();

    if (!formData.name.trim()) { setValidationError('name', t('form.errors.nameRequired')); return; }
    if (!formData.category) { setValidationError('category', t('form.errors.categoryRequired')); return; }
    if (!formData.contactPhone.trim()) { setValidationError('contactPhone', t('form.errors.phoneRequired')); return; }
    if (!formData.country.trim()) { setValidationError('country', t('form.errors.countryRequired')); return; }
    if (!formData.city.trim()) { setValidationError('city', t('form.errors.cityRequired')); return; }

    try {
      const cleanData: Partial<CreateBusinessListingData & { isActive: boolean }> = {
        listingType,
        name: formData.name.trim(),
        category: formData.category,
        contactPhone: formData.contactPhone.trim(),
        city: formData.city.trim(),
        country: formData.country.trim(),
        isActive,
      };

      cleanData.customCategory = formData.category === 'other' && formData.customCategory?.trim()
        ? formData.customCategory.trim()
        : '';
      if (formData.description?.trim()) cleanData.description = formData.description.trim();
      else cleanData.description = '';
      if (formData.services && formData.services.length > 0) cleanData.services = formData.services;
      else cleanData.services = [];
      if (formData.contactEmail?.trim()) cleanData.contactEmail = formData.contactEmail.trim();
      else cleanData.contactEmail = '';
      if (formData.website?.trim()) cleanData.website = formData.website.trim();
      else cleanData.website = '';
      if (formData.address?.trim()) cleanData.address = formData.address.trim();
      else cleanData.address = '';
      if (lat !== 0 && lng !== 0) {
        cleanData.latitude = lat;
        cleanData.longitude = lng;
      }

      cleanData.whatsapp = formData.whatsapp?.trim() || '';
      cleanData.viber = formData.viber?.trim() || '';
      cleanData.languages = formData.languages && formData.languages.length > 0 ? formData.languages : [];
      cleanData.yearEstablished = formData.yearEstablished || undefined;
      cleanData.licenseNumber = formData.licenseNumber?.trim() || '';
      cleanData.serviceAreas = formData.serviceAreas && formData.serviceAreas.length > 0 ? formData.serviceAreas : [];
      cleanData.priceRange = formData.priceRange || undefined;
      cleanData.paymentMethods = formData.paymentMethods && formData.paymentMethods.length > 0 ? formData.paymentMethods : [];

      const social = formData.socialMedia;
      cleanData.socialMedia = {
        ...(social?.facebook && { facebook: social.facebook }),
        ...(social?.instagram && { instagram: social.instagram }),
        ...(social?.linkedin && { linkedin: social.linkedin }),
        ...(social?.tiktok && { tiktok: social.tiktok }),
      };

      const hours = formData.businessHours;
      if (hours && Object.values(hours).some(Boolean)) {
        cleanData.businessHours = hours;
      } else {
        cleanData.businessHours = {};
      }

      await updateListing({ id: listing.id, data: cleanData });

      if (logoFile) {
        try {
          await uploadLogo({ id: listing.id, file: logoFile });
        } catch {
          // Logo upload failure shouldn't block update
        }
      }

      if (bannerFile) {
        try {
          await uploadBanner({ id: listing.id, file: bannerFile });
        } catch {
          // Banner upload failure shouldn't block update
        }
      }

      onSuccess();
    } catch (err: any) {
      setFormError(err?.message || t('form.errors.generic'));
    }
  }, [formData, listingType, lat, lng, logoFile, bannerFile, isActive, listing.id, updateListing, uploadLogo, uploadBanner, onSuccess, t, clearErrors, setValidationError]);

  const displayError = formError || (error as Error)?.message;

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header banner */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="edit-form-grid" width="30" height="30" patternUnits="userSpaceOnUse">
                <path d="M 30 0 L 0 0 0 30" fill="none" stroke="white" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#edit-form-grid)" />
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
            {t('edit.backToListing', { defaultValue: 'Back to Listing' })}
          </button>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">{t('edit.title', { defaultValue: 'Edit Your Listing' })}</h1>
          <p className="text-white/50 text-sm mt-1">{t('edit.subtitle', { defaultValue: 'Update your business information' })}</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 -mt-4 relative z-10">
        {/* Error toast */}
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
          {/* Active/Inactive toggle */}
          <Animated variant="fadeInUp">
            <div className="bg-white rounded-2xl border border-neutral-200 p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-neutral-900">{t('edit.status', { defaultValue: 'Listing Status' })}</h2>
                  <p className="text-sm text-neutral-500 mt-0.5">
                    {isActive
                      ? t('edit.statusActiveDesc', { defaultValue: 'Your listing is visible to everyone' })
                      : t('edit.statusInactiveDesc', { defaultValue: 'Your listing is hidden from the directory' })
                    }
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsActive(!isActive)}
                  className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors duration-200 ${
                    isActive ? 'bg-emerald-500' : 'bg-neutral-300'
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
                      isActive ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </Animated>

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
                      {logoPreview ? t('form.logoChange') : t('form.logoUpload')}
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleLogoChange}
                        className="hidden"
                      />
                    </label>
                    {logoPreview && (
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

          {/* Banner upload */}
          <Animated variant="fadeInUp" delay={40}>
            <div className="bg-white rounded-2xl border border-neutral-200 p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-neutral-900 mb-4">
                {t('form.fields.banner', 'Cover Banner')}
              </h2>
              <div className="space-y-3">
                <div className="w-full h-32 rounded-xl bg-neutral-100 flex items-center justify-center overflow-hidden border-2 border-dashed border-neutral-300">
                  {bannerPreview ? (
                    <img src={bannerPreview} alt="Banner preview" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center">
                      <svg className="w-10 h-10 mx-auto text-neutral-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.41a2.25 2.25 0 013.182 0l2.909 2.91m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                      </svg>
                      <p className="text-xs text-neutral-400 mt-1">{t('form.bannerHint', '1200 x 400px recommended')}</p>
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <label className="px-4 py-2 bg-primary/10 text-primary rounded-xl text-sm font-medium cursor-pointer hover:bg-primary/20 transition-colors">
                    {bannerPreview ? t('form.bannerChange', 'Change Banner') : t('form.bannerUpload', 'Upload Banner')}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleBannerChange}
                      className="hidden"
                    />
                  </label>
                  {bannerPreview && (
                    <button
                      type="button"
                      onClick={removeBanner}
                      className="px-4 py-2 text-red-500 hover:bg-red-50 rounded-xl text-sm font-medium transition-colors"
                    >
                      {t('form.bannerRemove', 'Remove')}
                    </button>
                  )}
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
                <label htmlFor="edit-name" className="block text-sm font-medium text-neutral-700 mb-1">
                  {listingType === 'individual' ? t('form.fields.fullName') : t('form.fields.name')} <span className="text-red-500">*</span>
                </label>
                <input
                  ref={fieldRefs.name}
                  id="edit-name"
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
                {formData.category === 'other' && (
                  <div className="mt-3">
                    <label htmlFor="edit-customCategory" className="block text-sm font-medium text-neutral-700 mb-1">
                      {t('form.fields.customCategory', 'Specify your category')} <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="edit-customCategory"
                      name="customCategory"
                      type="text"
                      value={formData.customCategory || ''}
                      onChange={handleChange}
                      maxLength={100}
                      className={inputClasses()}
                      placeholder={t('form.placeholders.customCategory', 'e.g. Property Management, Solar Energy...')}
                    />
                  </div>
                )}
              </div>

              {/* Description */}
              <div>
                <label htmlFor="edit-description" className="block text-sm font-medium text-neutral-700 mb-1">
                  {t('form.fields.description')}
                </label>
                <textarea
                  id="edit-description"
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
                  <label htmlFor="edit-contactPhone" className="block text-sm font-medium text-neutral-700 mb-1">
                    {t('form.fields.phone')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    ref={fieldRefs.contactPhone}
                    id="edit-contactPhone"
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
                  <label htmlFor="edit-contactEmail" className="block text-sm font-medium text-neutral-700 mb-1">
                    {t('form.fields.email')}
                  </label>
                  <input
                    id="edit-contactEmail"
                    name="contactEmail"
                    type="email"
                    value={formData.contactEmail}
                    onChange={handleChange}
                    maxLength={100}
                    className="w-full px-4 py-2.5 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                    placeholder={t('form.placeholders.email')}
                  />
                </div>
              </div>
              <div>
                <label htmlFor="edit-website" className="block text-sm font-medium text-neutral-700 mb-1">
                  {t('form.fields.website')}
                </label>
                <input
                  id="edit-website"
                  name="website"
                  type="url"
                  value={formData.website}
                  onChange={handleChange}
                  maxLength={200}
                  className="w-full px-4 py-2.5 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                  placeholder={t('form.placeholders.website')}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="edit-whatsapp" className="block text-sm font-medium text-neutral-700 mb-1">
                    {t('form.fields.whatsapp', 'WhatsApp')}
                  </label>
                  <input
                    id="edit-whatsapp"
                    name="whatsapp"
                    type="tel"
                    value={formData.whatsapp}
                    onChange={handleChange}
                    maxLength={30}
                    className="w-full px-4 py-2.5 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                    placeholder={t('form.placeholders.whatsapp', '+383 44 123 456')}
                  />
                </div>
                <div>
                  <label htmlFor="edit-viber" className="block text-sm font-medium text-neutral-700 mb-1">
                    {t('form.fields.viber', 'Viber')}
                  </label>
                  <input
                    id="edit-viber"
                    name="viber"
                    type="tel"
                    value={formData.viber}
                    onChange={handleChange}
                    maxLength={30}
                    className="w-full px-4 py-2.5 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                    placeholder={t('form.placeholders.viber', '+383 44 123 456')}
                  />
                </div>
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
                  <label htmlFor="edit-country" className="block text-sm font-medium text-neutral-700 mb-1">
                    {t('form.fields.country')} <span className="text-red-500">*</span>
                  </label>
                  <select
                    ref={fieldRefs.country}
                    id="edit-country"
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
                  <label htmlFor="edit-city" className="block text-sm font-medium text-neutral-700 mb-1">
                    {t('form.fields.city')} <span className="text-red-500">*</span>
                  </label>
                  <select
                    ref={fieldRefs.city}
                    id="edit-city"
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
                <label htmlFor="edit-address" className="block text-sm font-medium text-neutral-700 mb-1">
                  {t('form.fields.address')}
                </label>
                <input
                  id="edit-address"
                  name="address"
                  type="text"
                  value={formData.address}
                  onChange={handleChange}
                  maxLength={200}
                  className="w-full px-4 py-2.5 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                  placeholder={t('form.placeholders.address')}
                />
              </div>

              {/* Map location picker */}
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
                  <label htmlFor="edit-facebook" className="block text-sm font-medium text-neutral-700 mb-1">Facebook</label>
                  <input
                    id="edit-facebook"
                    type="url"
                    value={formData.socialMedia?.facebook || ''}
                    onChange={(e) => handleSocialChange('facebook', e.target.value)}
                    className="w-full px-4 py-2.5 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                    placeholder="https://facebook.com/..."
                  />
                </div>
                <div>
                  <label htmlFor="edit-instagram" className="block text-sm font-medium text-neutral-700 mb-1">Instagram</label>
                  <input
                    id="edit-instagram"
                    type="url"
                    value={formData.socialMedia?.instagram || ''}
                    onChange={(e) => handleSocialChange('instagram', e.target.value)}
                    className="w-full px-4 py-2.5 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                    placeholder="https://instagram.com/..."
                  />
                </div>
                <div>
                  <label htmlFor="edit-linkedin" className="block text-sm font-medium text-neutral-700 mb-1">LinkedIn</label>
                  <input
                    id="edit-linkedin"
                    type="url"
                    value={formData.socialMedia?.linkedin || ''}
                    onChange={(e) => handleSocialChange('linkedin', e.target.value)}
                    className="w-full px-4 py-2.5 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                    placeholder="https://linkedin.com/..."
                  />
                </div>
                <div>
                  <label htmlFor="edit-tiktok" className="block text-sm font-medium text-neutral-700 mb-1">TikTok</label>
                  <input
                    id="edit-tiktok"
                    type="url"
                    value={formData.socialMedia?.tiktok || ''}
                    onChange={(e) => handleSocialChange('tiktok', e.target.value)}
                    className="w-full px-4 py-2.5 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                    placeholder="https://tiktok.com/@..."
                  />
                </div>
              </div>
            </div>
          </Animated>

          {/* Languages */}
          <Animated variant="fadeInUp" delay={210}>
            <div className="bg-white rounded-2xl border border-neutral-200 p-6 shadow-sm space-y-4">
              <h2 className="text-lg font-semibold text-neutral-900">{t('form.sections.languages', 'Languages Spoken')}</h2>
              <div className="flex gap-2">
                <select
                  value={languageInput}
                  onChange={(e) => setLanguageInput(e.target.value)}
                  className="flex-1 px-4 py-2.5 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors bg-white"
                >
                  <option value="">{t('form.placeholders.selectLanguage', 'Select a language')}</option>
                  {BALKAN_LANGUAGES.filter(l => !formData.languages?.includes(l)).map(lang => (
                    <option key={lang} value={lang}>{lang}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={addLanguage}
                  className="px-4 py-2.5 bg-neutral-100 text-neutral-700 rounded-xl hover:bg-neutral-200 transition-colors font-medium"
                >
                  {t('form.addLanguage', 'Add')}
                </button>
              </div>
              {formData.languages && formData.languages.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.languages.map((lang) => (
                    <span key={lang} className="inline-flex items-center gap-1 px-3 py-1 bg-violet-50 text-violet-700 rounded-lg text-sm font-medium border border-violet-100">
                      {lang}
                      <button type="button" onClick={() => removeLanguage(lang)} className="hover:text-red-500 transition-colors">&times;</button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </Animated>

          {/* Business Details */}
          <Animated variant="fadeInUp" delay={220}>
            <div className="bg-white rounded-2xl border border-neutral-200 p-6 shadow-sm space-y-4">
              <h2 className="text-lg font-semibold text-neutral-900">{t('form.sections.businessDetails', 'Business Details')}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="edit-yearEstablished" className="block text-sm font-medium text-neutral-700 mb-1">
                    {t('form.fields.yearEstablished', 'Year Established')}
                  </label>
                  <input
                    id="edit-yearEstablished"
                    type="number"
                    min={1900}
                    max={new Date().getFullYear()}
                    value={formData.yearEstablished || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, yearEstablished: e.target.value ? parseInt(e.target.value) : undefined }))}
                    className="w-full px-4 py-2.5 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                    placeholder={t('form.placeholders.yearEstablished', 'e.g. 2015')}
                  />
                </div>
                <div>
                  <label htmlFor="edit-licenseNumber" className="block text-sm font-medium text-neutral-700 mb-1">
                    {t('form.fields.licenseNumber', 'License / Certification #')}
                  </label>
                  <input
                    id="edit-licenseNumber"
                    name="licenseNumber"
                    type="text"
                    value={formData.licenseNumber}
                    onChange={handleChange}
                    maxLength={100}
                    className="w-full px-4 py-2.5 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                    placeholder={t('form.placeholders.licenseNumber', 'e.g. LIC-2024-1234')}
                  />
                </div>
              </div>
            </div>
          </Animated>

          {/* Service Areas */}
          <Animated variant="fadeInUp" delay={230}>
            <div className="bg-white rounded-2xl border border-neutral-200 p-6 shadow-sm space-y-4">
              <h2 className="text-lg font-semibold text-neutral-900">{t('form.sections.serviceAreas', 'Service Areas')}</h2>
              <p className="text-sm text-neutral-500">{t('form.serviceAreasHint', 'Cities or regions where you provide services')}</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={serviceAreaInput}
                  onChange={(e) => setServiceAreaInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addServiceArea(); } }}
                  maxLength={100}
                  className="flex-1 px-4 py-2.5 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                  placeholder={t('form.placeholders.serviceArea', 'e.g. Pristina, Prizren...')}
                />
                <button
                  type="button"
                  onClick={addServiceArea}
                  className="px-4 py-2.5 bg-neutral-100 text-neutral-700 rounded-xl hover:bg-neutral-200 transition-colors font-medium"
                >
                  {t('form.addServiceArea', 'Add')}
                </button>
              </div>
              {formData.serviceAreas && formData.serviceAreas.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.serviceAreas.map((area) => (
                    <span key={area} className="inline-flex items-center gap-1 px-3 py-1 bg-orange-50 text-orange-700 rounded-lg text-sm font-medium border border-orange-100">
                      {area}
                      <button type="button" onClick={() => removeServiceArea(area)} className="hover:text-red-500 transition-colors">&times;</button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </Animated>

          {/* Pricing & Payment */}
          <Animated variant="fadeInUp" delay={240}>
            <div className="bg-white rounded-2xl border border-neutral-200 p-6 shadow-sm space-y-4">
              <h2 className="text-lg font-semibold text-neutral-900">{t('form.sections.pricing', 'Pricing & Payment')}</h2>

              {/* Price Range */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  {t('form.fields.priceRange', 'Price Range')}
                </label>
                <div className="flex gap-2">
                  {PRICE_RANGES.map((range) => (
                    <button
                      key={range}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, priceRange: prev.priceRange === range ? undefined : range as PriceRange }))}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-bold border-2 transition-all duration-200 ${
                        formData.priceRange === range
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm'
                          : 'border-neutral-200 text-neutral-500 hover:border-neutral-300'
                      }`}
                    >
                      {range}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-neutral-400 mt-1.5">
                  {t('form.priceRangeHint', '$ = Budget  |  $$ = Mid-range  |  $$$ = Premium')}
                </p>
              </div>

              {/* Payment Methods */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  {t('form.fields.paymentMethods', 'Payment Methods Accepted')}
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {PAYMENT_METHODS.map((method) => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => togglePaymentMethod(method)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border transition-all duration-200 ${
                        formData.paymentMethods?.includes(method)
                          ? 'border-primary bg-primary/5 text-primary'
                          : 'border-neutral-200 text-neutral-600 hover:border-neutral-300'
                      }`}
                    >
                      <span className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                        formData.paymentMethods?.includes(method) ? 'border-primary bg-primary' : 'border-neutral-300'
                      }`}>
                        {formData.paymentMethods?.includes(method) && (
                          <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </span>
                      {t(`paymentMethods.${method}`, method.replace('_', ' '))}
                    </button>
                  ))}
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
                      <label htmlFor={`edit-hours-${day}`} className="w-24 text-sm font-medium text-neutral-700 capitalize">
                        {t(`days.${day}`)}
                      </label>
                      <input
                        id={`edit-hours-${day}`}
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

          {/* Submit */}
          <Animated variant="fadeInUp" delay={300}>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onBack}
                disabled={isLoading}
                className="flex-1 py-3.5 border-2 border-neutral-300 text-neutral-700 font-bold rounded-xl hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-base"
              >
                {t('edit.cancel', { defaultValue: 'Cancel' })}
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="flex-[2] py-3.5 bg-gradient-to-r from-primary to-blue-600 text-white font-bold rounded-xl hover:shadow-lg hover:shadow-primary/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.99] text-base"
              >
                {isLoading ? t('edit.saving', { defaultValue: 'Saving...' }) : t('edit.save', { defaultValue: 'Save Changes' })}
              </button>
            </div>
          </Animated>
        </form>
      </div>
    </div>
  );
};

export default EditBusinessListingForm;
