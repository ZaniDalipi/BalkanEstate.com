import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '@/context/AppContext';
import { BALKAN_LOCATIONS } from '@/utils/balkanLocations';
import { canCreateAgency } from '@/src/shared/utils/subscriptionHelpers';
import { convertToUploadableImage } from '@/shared/utils/imageConversion';
import { UserRole } from '@/types';
import Footer from '@/components/shared/Footer';
import {
  BuildingOfficeIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  MapPinIcon,
  PhoneIcon,
  GlobeAltIcon,
  ClockIcon,
  UsersIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  ShieldCheckIcon,
} from '@/constants';
import { API_URL } from '@/src/shared/api/config';
import { Upload, ImageIcon, X } from 'lucide-react';
import PhoneInput, { validateFullPhone } from '@/src/shared/components/ui/PhoneInput';
import ConfirmationModal from '@/shared/components/ui/ConfirmationModal';

const AGENCY_TYPES = [
  { value: 'standard', label: 'Standard' },
  { value: 'luxury', label: 'Luxury' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'boutique', label: 'Boutique' },
  { value: 'team', label: 'Team' },
] as const;

const SPECIALIZATION_OPTIONS = [
  'Residential Sales', 'Residential Rentals', 'Commercial Sales', 'Commercial Leasing',
  'Luxury Properties', 'New Developments', 'Land & Plots', 'Vacation Homes',
  'Property Management', 'Investment Properties', 'Relocation Services', 'Appraisals & Valuations',
];

// Common languages spoken in the Balkan region
const BALKAN_LANGUAGES = [
  'English', 'Serbian', 'Croatian', 'Slovenian', 'Bosnian', 'Macedonian',
  'Albanian', 'Montenegrin', 'Bulgarian', 'Romanian', 'Greek', 'Turkish',
  'Hungarian', 'German', 'Italian', 'French', 'Russian', 'Spanish'
];

interface AgencyFormData {
  name: string;
  description: string;
  type: string;
  address: string;
  zipCode: string;
  city: string;
  country: string;
  phone: string;
  email: string;
  website: string;
  licenseNumber: string;
  registrationNumber: string;
  yearsInBusiness: string;
  languages: string[];
  specializations: string[];
  serviceAreas: string;
  facebookUrl: string;
  instagramUrl: string;
  linkedinUrl: string;
  businessHours: {
    monday: string;
    tuesday: string;
    wednesday: string;
    thursday: string;
    friday: string;
    saturday: string;
    sunday: string;
  };
}

const defaultBusinessHours = {
  monday: '9:00 AM - 6:00 PM',
  tuesday: '9:00 AM - 6:00 PM',
  wednesday: '9:00 AM - 6:00 PM',
  thursday: '9:00 AM - 6:00 PM',
  friday: '9:00 AM - 6:00 PM',
  saturday: '10:00 AM - 4:00 PM',
  sunday: 'Closed',
};

const CreateAgencyPage: React.FC = () => {
  const { t } = useTranslation(['agencies', 'common', 'modals']);
  const { state, dispatch } = useAppContext();
  const [error, setError] = useState('');
  const [availableCities, setAvailableCities] = useState<string[]>([]);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 4;
  const [showCloseConfirmation, setShowCloseConfirmation] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const [formData, setFormData] = useState<AgencyFormData>({
    name: '',
    description: '',
    type: 'standard',
    address: '',
    zipCode: '',
    city: '',
    country: '',
    phone: '',
    email: '',
    website: '',
    licenseNumber: '',
    registrationNumber: '',
    yearsInBusiness: '',
    languages: [],
    specializations: [],
    serviceAreas: '',
    facebookUrl: '',
    instagramUrl: '',
    linkedinUrl: '',
    businessHours: defaultBusinessHours,
  });

  // Check agency creation eligibility
  const agencyEligibility = canCreateAgency(
    state.currentUser?.subscription,
    state.currentUser?.availableRoles,
    {
      role: state.currentUser?.role,
      agentId: state.currentUser?.agentId,
      licenseNumber: state.currentUser?.licenseNumber,
    }
  );

  const isUserAgent =
    state.currentUser?.availableRoles?.includes(UserRole.AGENT) ||
    state.currentUser?.role === UserRole.AGENT ||
    !!state.currentUser?.agentId ||
    !!state.currentUser?.licenseNumber;

  const hasEnterpriseSubscription =
    state.currentUser?.subscription?.tier === 'agency_owner' ||
    state.currentUser?.subscriptionPlan?.toLowerCase().includes('enterprise') ||
    state.currentUser?.subscriptionPlan?.toLowerCase().includes('agency') ||
    state.currentUser?.isEnterpriseTier;

  const hasActiveSubscription =
    state.currentUser?.subscriptionStatus === 'active' ||
    state.currentUser?.subscriptionStatus === 'trial' ||
    state.currentUser?.subscriptionStatus === 'grace';

  const canSkipPayment = hasEnterpriseSubscription && hasActiveSubscription;

  // Load pending agency data or user data
  useEffect(() => {
    if (state.pendingAgencyData) {
      const pendingData = state.pendingAgencyData;
      setFormData({
        name: pendingData.name || '',
        description: pendingData.description || '',
        type: pendingData.type || 'standard',
        address: pendingData.address || '',
        zipCode: pendingData.zipCode || '',
        city: pendingData.city || '',
        country: pendingData.country || '',
        phone: pendingData.phone || '',
        email: pendingData.email || '',
        website: pendingData.website || '',
        licenseNumber: pendingData.licenseNumber || '',
        registrationNumber: pendingData.registrationNumber || '',
        yearsInBusiness: pendingData.yearsInBusiness?.toString() || '',
        languages: pendingData.languages || [],
        specializations: pendingData.specializations || [],
        serviceAreas: Array.isArray(pendingData.serviceAreas) ? pendingData.serviceAreas.join(', ') : pendingData.serviceAreas || '',
        facebookUrl: pendingData.facebookUrl || '',
        instagramUrl: pendingData.instagramUrl || '',
        linkedinUrl: pendingData.linkedinUrl || '',
        businessHours: pendingData.businessHours || defaultBusinessHours,
      });

      if (pendingData.country) {
        const countryData = BALKAN_LOCATIONS.find(c => c.name === pendingData.country);
        if (countryData) {
          setAvailableCities(countryData.cities.map(city => city.name));
        }
      }
    } else if (state.currentUser) {
      const user = state.currentUser;
      setFormData(prev => ({
        ...prev,
        email: user.email || '',
        phone: user.phone || '',
        city: user.city || '',
        country: user.country || '',
        name: user.agencyName || '',
        licenseNumber: user.licenseNumber || '',
      }));

      if (user.country) {
        const countryData = BALKAN_LOCATIONS.find(c => c.name === user.country);
        if (countryData) {
          setAvailableCities(countryData.cities.map(city => city.name));
        }
      }
    }
  }, [state.pendingAgencyData, state.currentUser]);

  // Track unsaved changes
  useEffect(() => {
    const hasChanges = formData.name.trim() !== '' ||
                      formData.description.trim() !== '' ||
                      formData.address.trim() !== '' ||
                      formData.city.trim() !== '' ||
                      logoFile !== null;
    setHasUnsavedChanges(hasChanges);
  }, [formData, logoFile]);

  // Update cities when country changes
  useEffect(() => {
    if (formData.country) {
      const countryData = BALKAN_LOCATIONS.find(c => c.name === formData.country);
      setAvailableCities(countryData ? countryData.cities.map(city => city.name) : []);
    } else {
      setAvailableCities([]);
    }
  }, [formData.country]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'country') {
      setFormData(prev => ({ ...prev, country: value, city: '' }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  }, []);

  const handleBusinessHoursChange = useCallback((day: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      businessHours: { ...prev.businessHours, [day]: value },
    }));
  }, []);

  const handleLanguageToggle = useCallback((language: string) => {
    setFormData(prev => ({
      ...prev,
      languages: prev.languages.includes(language)
        ? prev.languages.filter(l => l !== language)
        : [...prev.languages, language],
    }));
  }, []);

  const handleSpecializationToggle = useCallback((spec: string) => {
    setFormData(prev => ({
      ...prev,
      specializations: prev.specializations.includes(spec)
        ? prev.specializations.filter(s => s !== spec)
        : [...prev.specializations, spec],
    }));
  }, []);

  const MAX_LOGO_SIZE = 5 * 1024 * 1024; // 5MB
  const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];

  const handleLogoChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    // Convert HEIC/HEIF (iPhone photos) to JPEG so it previews and uploads correctly.
    const file = await convertToUploadableImage(selected);

    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      setError(t('create.errors.logoInvalidType', 'Please upload a JPEG, PNG, WebP, or SVG image'));
      return;
    }
    if (file.size > MAX_LOGO_SIZE) {
      setError(t('create.errors.logoTooLarge', 'Logo must be under 5MB'));
      return;
    }

    setLogoFile(file);
    setError('');
    const reader = new FileReader();
    reader.onloadend = () => setLogoPreview(reader.result as string);
    reader.readAsDataURL(file);
  }, [t]);

  const removeLogo = useCallback(() => {
    setLogoFile(null);
    setLogoPreview(null);
  }, []);

  const validateStep = (step: number): boolean => {
    setError('');

    if (step === 1) {
      if (!formData.name.trim()) {
        setError(t('create.errors.nameRequired', 'Agency name is required'));
        return false;
      }
    }

    if (step === 2) {
      if (!formData.city.trim() || !formData.country.trim()) {
        setError(t('create.errors.locationRequired', 'City and country are required'));
        return false;
      }
    }

    if (step === 3) {
      if (!formData.email.trim()) {
        setError(t('create.errors.emailRequired', 'Email is required'));
        return false;
      }
    }

    return true;
  };

  const handleNextStep = () => {
    if (validateStep(currentStep)) {
      if (currentStep < totalSteps) {
        setCurrentStep(prev => prev + 1);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateStep(currentStep)) return;

    const agencyData = {
      ...formData,
      yearsInBusiness: formData.yearsInBusiness ? parseInt(formData.yearsInBusiness) : undefined,
      serviceAreas: formData.serviceAreas
        ? formData.serviceAreas.split(',').map(s => s.trim()).filter(Boolean)
        : [],
    };

    // Save to context and navigate to payment
    // Note: logoFile cannot be serialized to context - it's handled by the confirmation page or modal
    dispatch({ type: 'SET_PENDING_AGENCY_DATA', payload: { ...agencyData, _hasLogoFile: !!logoFile } });

    if (canSkipPayment) {
      // User has enterprise subscription, redirect to confirmation/creation
      dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'createAgencyConfirm' });
      window.history.pushState({}, '', '/create-agency/confirm');
    } else {
      // Navigate to payment page
      dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'createAgencyPayment' });
      window.history.pushState({}, '', '/create-agency/payment');
    }
  };

  const handleGoBack = () => {
    if (hasUnsavedChanges) {
      setShowCloseConfirmation(true);
    } else {
      dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'account' });
      window.history.pushState({}, '', '/account');
    }
  };

  const handleConfirmGoBack = () => {
    setShowCloseConfirmation(false);
    // Clear pending agency data when confirming to leave
    dispatch({ type: 'SET_PENDING_AGENCY_DATA', payload: null });
    dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'account' });
    window.history.pushState({}, '', '/account');
  };

  const inputClasses = "w-full px-4 py-3 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary text-sm transition-all duration-200 hover:border-neutral-400";
  const labelClasses = "block text-sm font-semibold text-neutral-700 mb-2";
  const selectClasses = "w-full px-4 py-3 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary text-sm transition-all duration-200 hover:border-neutral-400 cursor-pointer bg-white";

  const stepInfo = [
    { number: 1, title: t('create.steps.basic', 'Basic Info'), icon: BuildingOfficeIcon },
    { number: 2, title: t('create.steps.location', 'Location'), icon: MapPinIcon },
    { number: 3, title: t('create.steps.contact', 'Contact'), icon: PhoneIcon },
    { number: 4, title: t('create.steps.details', 'Details'), icon: ClockIcon },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Confirmation modal for unsaved changes */}
      <ConfirmationModal
        isOpen={showCloseConfirmation}
        onClose={() => setShowCloseConfirmation(false)}
        onConfirm={handleConfirmGoBack}
        title={t('confirmation.unsavedChanges.title', 'Unsaved Changes')}
        message={t('confirmation.unsavedChanges.message', 'You have unsaved changes. Are you sure you want to leave?')}
        confirmLabel={t('confirmation.unsavedChanges.confirm', 'Leave')}
        cancelLabel={t('common.cancel', 'Cancel')}
        type="warning"
      />
      {/* Hero Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 py-12 sm:py-16">
        <div className="absolute inset-0 opacity-10">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="agency-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#agency-grid)" />
          </svg>
        </div>

        <div className="absolute top-10 left-[10%] w-72 h-72 bg-amber-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-10 right-[10%] w-96 h-96 bg-orange-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />

        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <button
            onClick={handleGoBack}
            className="inline-flex items-center gap-2 text-white/70 hover:text-white mb-6 transition-colors"
          >
            <ArrowLeftIcon className="w-5 h-5" />
            <span>{t('create.backToAccount', 'Back to Account')}</span>
          </button>

          <div className="w-20 h-20 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-2xl">
            <BuildingOfficeIcon className="w-10 h-10 text-white" />
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white mb-4">
            {t('create.title', 'Create Your Agency')}
          </h1>
          <p className="text-lg text-white/70 max-w-2xl mx-auto">
            {t('create.subtitle', 'Set up your agency profile to showcase your team and properties')}
          </p>

          {canSkipPayment && (
            <div className="inline-flex items-center gap-2 mt-6 px-4 py-2 bg-green-500/20 backdrop-blur-sm rounded-full text-green-300 border border-green-500/30">
              <CheckCircleIcon className="w-5 h-5" />
              <span className="font-medium">{t('create.enterpriseActive', 'Enterprise Subscription Active')}</span>
            </div>
          )}
        </div>
      </div>

      {/* Step Progress */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-20">
        <div className="bg-white rounded-2xl shadow-xl p-4 sm:p-6 border border-neutral-100">
          <div className="flex items-center justify-between">
            {stepInfo.map((step, index) => (
              <React.Fragment key={step.number}>
                <div className="flex flex-col items-center">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 ${
                      currentStep >= step.number
                        ? 'bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg'
                        : 'bg-neutral-100 text-neutral-400'
                    }`}
                  >
                    <step.icon className="w-6 h-6" />
                  </div>
                  <span className={`mt-2 text-xs sm:text-sm font-medium ${
                    currentStep >= step.number ? 'text-amber-600' : 'text-neutral-400'
                  }`}>
                    {step.title}
                  </span>
                </div>
                {index < stepInfo.length - 1 && (
                  <div className={`flex-1 h-1 mx-2 rounded-full transition-all duration-300 ${
                    currentStep > step.number ? 'bg-amber-500' : 'bg-neutral-200'
                  }`} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      {/* Eligibility Warning */}
      {!agencyEligibility.allowed && (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
          <div className="p-4 bg-amber-50 border-2 border-amber-300 rounded-xl">
            <div className="flex items-start gap-3">
              <ExclamationTriangleIcon className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-amber-800 mb-1">
                  {agencyEligibility.reason?.includes('agent')
                    ? t('create.warnings.agentRequired', 'Agent Status Required')
                    : t('create.warnings.proRequired', 'Pro Subscription Required')}
                </h4>
                <p className="text-sm text-amber-700 mb-3">{agencyEligibility.reason}</p>
                {!isUserAgent ? (
                  <button
                    type="button"
                    onClick={() => {
                      dispatch({ type: 'SET_ACCOUNT_TAB', payload: 'profile' });
                      dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'account' });
                      window.history.pushState({}, '', '/account');
                    }}
                    className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-semibold rounded-lg hover:from-amber-600 hover:to-orange-600 transition-all"
                  >
                    {t('create.becomeAgent', 'Become an Agent First')}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'pricing' });
                      window.history.pushState({}, '', '/pricing');
                    }}
                    className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-semibold rounded-lg hover:from-amber-600 hover:to-orange-600 transition-all"
                  >
                    {t('create.upgradeToPro', 'Upgrade to Pro')}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Form Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Step 1: Basic Information */}
          {currentStep === 1 && (
            <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 border border-neutral-100">
              <h2 className="text-xl font-bold text-neutral-800 mb-6 flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                  <BuildingOfficeIcon className="w-5 h-5 text-amber-600" />
                </div>
                {t('create.sections.basicInfo', 'Basic Information')}
              </h2>

              <div className="space-y-6">
                <div>
                  <label htmlFor="name" className={labelClasses}>
                    {t('create.fields.agencyName', 'Agency Name')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder={t('create.placeholders.agencyName', 'e.g., Premier Real Estate Agency')}
                    className={inputClasses}
                    required
                  />
                  <p className="text-xs text-neutral-500 mt-2">
                    {t('create.hints.agencyName', 'Choose a professional name that represents your brand')}
                  </p>
                </div>

                <div>
                  <label htmlFor="description" className={labelClasses}>
                    {t('create.fields.description', 'Description')}
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder={t('create.placeholders.description', 'Tell potential clients about your agency, your expertise, and what makes you unique...')}
                    rows={4}
                    className={inputClasses}
                  />
                  <p className="text-xs text-neutral-500 mt-2">
                    {t('create.hints.description', 'A compelling description helps clients understand your value')}
                  </p>
                </div>

                {/* Logo Upload */}
                <div>
                  <label className={labelClasses}>
                    {t('create.fields.logo', 'Agency Logo')}
                  </label>
                  <div className="flex items-center gap-4">
                    {logoPreview ? (
                      <div className="relative group">
                        <img
                          src={logoPreview}
                          alt={t('create.fields.logoPreview', 'Logo preview')}
                          className="w-20 h-20 rounded-xl object-cover border border-neutral-200 shadow-sm"
                        />
                        <button
                          type="button"
                          onClick={removeLogo}
                          className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          aria-label={t('create.buttons.removeLogo', 'Remove logo')}
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="w-20 h-20 rounded-xl border-2 border-dashed border-neutral-300 flex items-center justify-center bg-neutral-50">
                        <ImageIcon className="w-8 h-8 text-neutral-400" />
                      </div>
                    )}
                    <div className="flex-1">
                      <label className="inline-flex items-center gap-2 px-4 py-2.5 border border-neutral-300 rounded-xl text-sm font-medium text-neutral-700 hover:bg-neutral-50 transition-colors cursor-pointer">
                        <Upload className="w-4 h-4" />
                        {logoFile ? t('create.buttons.changeLogo', 'Change Logo') : t('create.buttons.uploadLogo', 'Upload Logo')}
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/svg+xml,image/heic,image/heif"
                          onChange={handleLogoChange}
                          className="hidden"
                        />
                      </label>
                      <p className="text-xs text-neutral-500 mt-2">
                        {t('create.hints.logo', 'JPEG, PNG, WebP or SVG. Max 5MB.')}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Registration Number */}
                <div>
                  <label htmlFor="registrationNumber" className={labelClasses}>
                    {t('create.fields.registrationNumber', 'Business Registration / Tax ID')}
                  </label>
                  <input
                    type="text"
                    id="registrationNumber"
                    name="registrationNumber"
                    value={formData.registrationNumber}
                    onChange={handleInputChange}
                    placeholder={t('create.placeholders.registrationNumber', 'e.g., PIB 123456789, OIB 12345678901')}
                    className={inputClasses}
                  />
                  <p className="text-xs text-neutral-500 mt-2">
                    {t('create.hints.registrationNumber', 'Your official business registration or tax identification number')}
                  </p>
                </div>

                <div>
                  <label htmlFor="type" className={labelClasses}>
                    {t('create.fields.agencyType', 'Agency Type')}
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                    {AGENCY_TYPES.map((agencyType) => (
                      <button
                        key={agencyType.value}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, type: agencyType.value }))}
                        className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${
                          formData.type === agencyType.value
                            ? 'border-amber-500 bg-amber-50 text-amber-700'
                            : 'border-neutral-200 bg-white text-neutral-600 hover:border-amber-300'
                        }`}
                      >
                        <ShieldCheckIcon className="w-4 h-4" />
                        {t(`create.agencyTypes.${agencyType.value}`, agencyType.label)}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-neutral-500 mt-2">
                    {t('create.hints.agencyType', 'Select the type that best describes your agency')}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Location */}
          {currentStep === 2 && (
            <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 border border-neutral-100">
              <h2 className="text-xl font-bold text-neutral-800 mb-6 flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                  <MapPinIcon className="w-5 h-5 text-blue-600" />
                </div>
                {t('create.sections.location', 'Location')}
              </h2>

              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="country" className={labelClasses}>
                      {t('create.fields.country', 'Country')} <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="country"
                      name="country"
                      value={formData.country}
                      onChange={handleInputChange}
                      className={selectClasses}
                      required
                    >
                      <option value="">{t('create.placeholders.selectCountry', 'Select a country')}</option>
                      {BALKAN_LOCATIONS.map((country) => (
                        <option key={country.code} value={country.name}>
                          {country.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="city" className={labelClasses}>
                      {t('create.fields.city', 'City')} <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="city"
                      name="city"
                      value={formData.city}
                      onChange={handleInputChange}
                      className={selectClasses}
                      required
                      disabled={!formData.country}
                    >
                      <option value="">
                        {formData.country
                          ? t('create.placeholders.selectCity', 'Select a city')
                          : t('create.placeholders.selectCountryFirst', 'Select country first')}
                      </option>
                      {availableCities.map((city) => (
                        <option key={city} value={city}>{city}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="md:col-span-2">
                    <label htmlFor="address" className={labelClasses}>
                      {t('create.fields.address', 'Street Address')}
                    </label>
                    <input
                      type="text"
                      id="address"
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      placeholder={t('create.placeholders.address', 'e.g., 123 Main Street, Building A')}
                      className={inputClasses}
                    />
                  </div>
                  <div>
                    <label htmlFor="zipCode" className={labelClasses}>
                      {t('create.fields.zipCode', 'Zip / Postal Code')}
                    </label>
                    <input
                      type="text"
                      id="zipCode"
                      name="zipCode"
                      value={formData.zipCode}
                      onChange={handleInputChange}
                      placeholder={t('create.placeholders.zipCode', 'e.g., 11000')}
                      className={inputClasses}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Contact Information */}
          {currentStep === 3 && (
            <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 border border-neutral-100">
              <h2 className="text-xl font-bold text-neutral-800 mb-6 flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                  <PhoneIcon className="w-5 h-5 text-green-600" />
                </div>
                {t('create.sections.contact', 'Contact Information')}
              </h2>

              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="email" className={labelClasses}>
                      {t('create.fields.email', 'Email')} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder={t('create.placeholders.email', 'contact@agency.com')}
                      className={inputClasses}
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="phone" className={labelClasses}>
                      {t('create.fields.phone', 'Phone Number')}
                    </label>
                    <PhoneInput
                      value={formData.phone}
                      onChange={fullPhone => setFormData(prev => ({ ...prev, phone: fullPhone }))}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="website" className={labelClasses}>
                    {t('create.fields.website', 'Website URL')}
                  </label>
                  <input
                    type="url"
                    id="website"
                    name="website"
                    value={formData.website}
                    onChange={handleInputChange}
                    placeholder={t('create.placeholders.website', 'https://yourwebsite.com')}
                    className={inputClasses}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label htmlFor="facebookUrl" className={labelClasses}>Facebook</label>
                    <input
                      type="url"
                      id="facebookUrl"
                      name="facebookUrl"
                      value={formData.facebookUrl}
                      onChange={handleInputChange}
                      placeholder="facebook.com/yourpage"
                      className={inputClasses}
                    />
                  </div>
                  <div>
                    <label htmlFor="instagramUrl" className={labelClasses}>Instagram</label>
                    <input
                      type="url"
                      id="instagramUrl"
                      name="instagramUrl"
                      value={formData.instagramUrl}
                      onChange={handleInputChange}
                      placeholder="instagram.com/yourpage"
                      className={inputClasses}
                    />
                  </div>
                  <div>
                    <label htmlFor="linkedinUrl" className={labelClasses}>LinkedIn</label>
                    <input
                      type="url"
                      id="linkedinUrl"
                      name="linkedinUrl"
                      value={formData.linkedinUrl}
                      onChange={handleInputChange}
                      placeholder="linkedin.com/company/..."
                      className={inputClasses}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Professional Details */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 border border-neutral-100">
                <h2 className="text-xl font-bold text-neutral-800 mb-6 flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                    <UsersIcon className="w-5 h-5 text-purple-600" />
                  </div>
                  {t('create.sections.professional', 'Professional Details')}
                </h2>

                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="licenseNumber" className={labelClasses}>
                        {t('create.fields.license', 'Agent License Number')}
                      </label>
                      <input
                        type="text"
                        id="licenseNumber"
                        name="licenseNumber"
                        value={formData.licenseNumber}
                        onChange={handleInputChange}
                        placeholder={t('create.placeholders.license', 'e.g., RE-123456')}
                        className={inputClasses}
                      />
                    </div>

                    <div>
                      <label htmlFor="yearsInBusiness" className={labelClasses}>
                        {t('create.fields.yearsInBusiness', 'Years in Business')}
                      </label>
                      <input
                        type="number"
                        id="yearsInBusiness"
                        name="yearsInBusiness"
                        value={formData.yearsInBusiness}
                        onChange={handleInputChange}
                        placeholder="5"
                        min="0"
                        max="100"
                        className={inputClasses}
                      />
                    </div>
                  </div>

                  <div>
                    <label className={labelClasses}>
                      {t('create.fields.languages', 'Languages Spoken')}
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {BALKAN_LANGUAGES.map((language) => (
                        <button
                          key={language}
                          type="button"
                          onClick={() => handleLanguageToggle(language)}
                          className={`px-3 py-1.5 text-sm rounded-full border transition-all ${
                            formData.languages.includes(language)
                              ? 'bg-purple-500 text-white border-purple-500'
                              : 'bg-white text-neutral-600 border-neutral-300 hover:border-purple-400'
                          }`}
                        >
                          {language}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className={labelClasses}>
                      {t('create.fields.specializations', 'Specializations')}
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {SPECIALIZATION_OPTIONS.map((spec) => (
                        <button
                          key={spec}
                          type="button"
                          onClick={() => handleSpecializationToggle(spec)}
                          className={`px-3 py-1.5 text-sm rounded-full border transition-all ${
                            formData.specializations.includes(spec)
                              ? 'bg-amber-500 text-white border-amber-500'
                              : 'bg-white text-neutral-600 border-neutral-300 hover:border-amber-400'
                          }`}
                        >
                          {t(`create.specializations.${spec.replace(/\s+/g, '_').toLowerCase()}`, spec)}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-neutral-500 mt-2">
                      {t('create.hints.specializations', 'Select all areas your agency specializes in')}
                    </p>
                  </div>

                  <div>
                    <label htmlFor="serviceAreas" className={labelClasses}>
                      {t('create.fields.serviceAreas', 'Service Areas / Regions')}
                    </label>
                    <input
                      type="text"
                      id="serviceAreas"
                      name="serviceAreas"
                      value={formData.serviceAreas}
                      onChange={handleInputChange}
                      placeholder={t('create.placeholders.serviceAreas', 'e.g., Belgrade, Novi Sad, Nis (comma-separated)')}
                      className={inputClasses}
                    />
                    <p className="text-xs text-neutral-500 mt-2">
                      {t('create.hints.serviceAreas', 'List the cities or regions where your agency operates')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Business Hours */}
              <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 border border-neutral-100">
                <h2 className="text-xl font-bold text-neutral-800 mb-6 flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                    <ClockIcon className="w-5 h-5 text-indigo-600" />
                  </div>
                  {t('create.sections.businessHours', 'Business Hours')}
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(formData.businessHours).map(([day, hours]) => (
                    <div key={day}>
                      <label htmlFor={day} className={labelClasses}>
                        {t(`create.days.${day}`, day.charAt(0).toUpperCase() + day.slice(1))}
                      </label>
                      <input
                        type="text"
                        id={day}
                        value={hours}
                        onChange={(e) => handleBusinessHoursChange(day, e.target.value)}
                        placeholder="9:00 AM - 5:00 PM"
                        className={inputClasses}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* What You'll Get */}
              <div className="bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 border-2 border-amber-200 rounded-2xl p-6 sm:p-8">
                <h3 className="text-lg font-bold text-amber-900 mb-4 flex items-center gap-2">
                  <CheckCircleIcon className="w-6 h-6 text-amber-600" />
                  {t('create.benefits.title', "What You'll Get")}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[
                    t('create.benefits.dedicatedPage', 'Dedicated agency page on platform'),
                    t('create.benefits.displayAgents', 'Display all agents & properties'),
                    t('create.benefits.featured', 'Featured in homepage ads'),
                    t('create.benefits.contactInfo', 'Full contact info displayed'),
                    t('create.benefits.invitationCode', 'Unique invitation code for agents'),
                    t('create.benefits.support', 'Priority customer support'),
                  ].map((benefit, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <CheckCircleIcon className="w-5 h-5 text-amber-600 flex-shrink-0" />
                      <span className="text-sm text-amber-800">{benefit}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex gap-4 mt-8">
            {currentStep > 1 && (
              <button
                type="button"
                onClick={handlePrevStep}
                className="flex-1 py-3.5 px-6 border-2 border-neutral-300 text-neutral-700 rounded-xl font-bold hover:bg-neutral-50 hover:border-neutral-400 transition-all flex items-center justify-center gap-2"
              >
                <ArrowLeftIcon className="w-5 h-5" />
                {t('common:back', 'Back')}
              </button>
            )}

            {currentStep < totalSteps ? (
              <button
                type="button"
                onClick={handleNextStep}
                disabled={!agencyEligibility.allowed}
                className="flex-1 py-3.5 px-6 bg-gradient-to-r from-amber-500 via-amber-600 to-orange-600 text-white rounded-xl font-bold hover:from-amber-600 hover:via-amber-700 hover:to-orange-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {t('common:next', 'Next')}
                <ArrowRightIcon className="w-5 h-5" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={!agencyEligibility.allowed}
                className="flex-1 py-3.5 px-6 bg-gradient-to-r from-amber-500 via-amber-600 to-orange-600 text-white rounded-xl font-bold hover:from-amber-600 hover:via-amber-700 hover:to-orange-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {canSkipPayment ? (
                  <>
                    <BuildingOfficeIcon className="w-5 h-5" />
                    {t('create.createAgency', 'Create Agency')}
                  </>
                ) : (
                  <>
                    {t('create.continueToPayment', 'Continue to Payment')}
                    <ArrowRightIcon className="w-5 h-5" />
                  </>
                )}
              </button>
            )}
          </div>
        </form>
      </div>

      <Footer />
    </div>
  );
};

export default CreateAgencyPage;
