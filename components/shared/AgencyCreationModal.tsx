import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from '../shared/Modal';
import PaymentWindow from './PaymentWindow';
import { BuildingOfficeIcon, CheckCircleIcon, ExclamationTriangleIcon } from '../../constants';
import { useAppContext } from '../../context/AppContext';
import { BALKAN_LOCATIONS } from '../../utils/balkanLocations';
import { canCreateAgency } from '../../src/shared/utils/subscriptionHelpers';
import { UserRole } from '../../types';
import { createAgency } from '../../src/features/agencies/api/agencyApi';
import { API_URL } from '../../src/shared/api/config';

// Default Enterprise plan configuration (fallback if API fails)
const DEFAULT_ENTERPRISE_PLAN = {
  name: 'Enterprise',
  price: 999,
  interval: 'year' as const,
  productId: 'enterprise_yearly',
};

interface EnterprisePlan {
  name: string;
  price: number;
  interval: 'month' | 'year';
  productId: string;
}

// Language keys for the Balkan region - display names come from i18n
const BALKAN_LANGUAGE_KEYS = [
  'english', 'serbian', 'croatian', 'slovenian', 'bosnian', 'macedonian',
  'albanian', 'montenegrin', 'bulgarian', 'romanian', 'greek', 'turkish',
  'hungarian', 'german', 'italian', 'french', 'russian', 'spanish'
];

interface AgencyCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAgencyCreated: (agencyId: string) => void;
}

const AgencyCreationModal: React.FC<AgencyCreationModalProps> = ({
  isOpen,
  onClose,
  onAgencyCreated,
}) => {
  const { t } = useTranslation(['agents', 'common']);
  const { state, dispatch } = useAppContext();
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');
  const [availableCities, setAvailableCities] = useState<string[]>([]);
  const [showPaymentWindow, setShowPaymentWindow] = useState(false);
  const [pendingAgencyData, setPendingAgencyData] = useState<any>(null);
  const [enterprisePlan, setEnterprisePlan] = useState<EnterprisePlan>(DEFAULT_ENTERPRISE_PLAN);
  const [loadingPlan, setLoadingPlan] = useState(false);

  // Fetch Enterprise plan from database
  useEffect(() => {
    const fetchEnterprisePlan = async () => {
      setLoadingPlan(true);
      try {
        const response = await fetch(`${API_URL}/products?role=seller`);
        if (response.ok) {
          const data = await response.json();
          const products = data.products || [];

          // Find the enterprise product
          const enterprise = products.find((p: any) =>
            p.productId?.toLowerCase().includes('enterprise') ||
            p.name?.toLowerCase().includes('enterprise')
          );

          if (enterprise) {
            setEnterprisePlan({
              name: enterprise.name || 'Enterprise',
              price: enterprise.price || 999,
              interval: enterprise.billingPeriod === 'monthly' ? 'month' : 'year',
              productId: enterprise.productId || 'enterprise_yearly',
            });
          }
        }
      } catch (err) {
        // Keep default plan on error
      } finally {
        setLoadingPlan(false);
      }
    };

    if (isOpen) {
      fetchEnterprisePlan();
    }
  }, [isOpen]);

  // Check if user can create an agency (must be an agent with active Pro subscription)
  // Pass additional user fields for comprehensive agent status check (DB is source of truth)
  const agencyEligibility = canCreateAgency(
    state.currentUser?.subscription,
    state.currentUser?.availableRoles,
    {
      role: state.currentUser?.role,
      agentId: state.currentUser?.agentId,
      licenseNumber: state.currentUser?.licenseNumber,
    }
  );

  // Check if user is an agent using multiple indicators (matches backend logic)
  const isUserAgent =
    state.currentUser?.availableRoles?.includes(UserRole.AGENT) ||
    state.currentUser?.role === UserRole.AGENT ||
    state.currentUser?.role === 'agent' ||
    !!state.currentUser?.agentId ||
    !!state.currentUser?.licenseNumber;

  // Check if user already has Enterprise subscription (can create agency without payment)
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

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    address: '',
    city: '',
    country: '',
    phone: '',
    email: '',
    website: '',
    licenseNumber: '', // Agent license number
    yearsInBusiness: '',
    languages: [] as string[],
    facebookUrl: '',
    instagramUrl: '',
    linkedinUrl: '',
    businessHours: {
      monday: '9:00 AM - 6:00 PM',
      tuesday: '9:00 AM - 6:00 PM',
      wednesday: '9:00 AM - 6:00 PM',
      thursday: '9:00 AM - 6:00 PM',
      friday: '9:00 AM - 6:00 PM',
      saturday: '10:00 AM - 4:00 PM',
      sunday: 'Closed',
    },
  });

  // Auto-populate form with pending agency data (when editing) or user data (when creating new)
  useEffect(() => {
    if (isOpen) {
      // If there's pending agency data (user came back to edit), use it
      if (state.pendingAgencyData) {
        const pendingData = state.pendingAgencyData;
        setFormData({
          name: pendingData.name || '',
          description: pendingData.description || '',
          address: pendingData.address || '',
          city: pendingData.city || '',
          country: pendingData.country || '',
          phone: pendingData.phone || '',
          email: pendingData.email || '',
          website: pendingData.website || '',
          licenseNumber: pendingData.licenseNumber || '',
          yearsInBusiness: pendingData.yearsInBusiness?.toString() || '',
          languages: pendingData.languages || [],
          facebookUrl: pendingData.facebookUrl || '',
          instagramUrl: pendingData.instagramUrl || '',
          linkedinUrl: pendingData.linkedinUrl || '',
          businessHours: pendingData.businessHours || {
            monday: '9:00 AM - 6:00 PM',
            tuesday: '9:00 AM - 6:00 PM',
            wednesday: '9:00 AM - 6:00 PM',
            thursday: '9:00 AM - 6:00 PM',
            friday: '9:00 AM - 6:00 PM',
            saturday: '10:00 AM - 4:00 PM',
            sunday: 'Closed',
          },
        });

        // Set available cities for the pending country
        if (pendingData.country) {
          const countryData = BALKAN_LOCATIONS.find(c => c.name === pendingData.country);
          if (countryData) {
            setAvailableCities(countryData.cities.map(city => city.name));
          }
        }
      } else if (state.currentUser) {
        // No pending data, pre-fill from user data for new agency creation
        const user = state.currentUser;
        const userCountry = user.country || '';

        setFormData(prev => ({
          ...prev,
          // Pre-fill with user data, but allow it to be overridden if already set
          email: prev.email || user.email || '',
          phone: prev.phone || user.phone || '',
          city: prev.city || user.city || '',
          country: prev.country || userCountry,
          // If user already has an agency name (e.g., they're an agent), use it
          name: prev.name || user.agencyName || '',
          // Auto-fill agent-specific fields if user is an agent
          licenseNumber: prev.licenseNumber || user.licenseNumber || '',
          // If user has years in business data, use it
          yearsInBusiness: prev.yearsInBusiness || '',
        }));

        // Set available cities if user has a country
        if (userCountry) {
          const countryData = BALKAN_LOCATIONS.find(c => c.name === userCountry);
          if (countryData) {
            setAvailableCities(countryData.cities.map(city => city.name));
          }
        }
      }
    }
  }, [isOpen, state.currentUser, state.pendingAgencyData]);

  // Update available cities when country changes
  useEffect(() => {
    if (formData.country) {
      const countryData = BALKAN_LOCATIONS.find(c => c.name === formData.country);
      if (countryData) {
        setAvailableCities(countryData.cities.map(city => city.name));
      } else {
        setAvailableCities([]);
      }
    } else {
      setAvailableCities([]);
    }
  }, [formData.country]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    // If country changes, reset city
    if (name === 'country') {
      setFormData(prev => ({ ...prev, country: value, city: '' }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleBusinessHoursChange = (day: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      businessHours: { ...prev.businessHours, [day]: value },
    }));
  };

  const handleLanguageToggle = (language: string) => {
    setFormData(prev => ({
      ...prev,
      languages: prev.languages.includes(language)
        ? prev.languages.filter(l => l !== language)
        : [...prev.languages, language],
    }));
  };

  // Get user role for payment window
  const getUserRole = (): 'buyer' | 'private_seller' | 'agent' => {
    if (!state.currentUser) return 'private_seller';
    return state.currentUser.role === 'agent' ? 'agent' : 'private_seller';
  };

  // Handle payment success - create agency after successful payment
  const handlePaymentSuccess = async (paymentIntentId: string) => {
    setShowPaymentWindow(false);

    if (pendingAgencyData) {
      setIsCreating(true);
      try {
        const result = await createAgency(pendingAgencyData);

        if (result && (result.agency || result._id || result.id)) {
          dispatch({
            type: 'SHOW_ALERT',
            payload: {
              type: 'success',
              title: t('agents:agencies.creation.successTitle'),
              message: t('agents:agencies.creation.successMessageEnterprise', { name: pendingAgencyData.name }),
            },
          });

          // Clear pending data
          dispatch({ type: 'SET_PENDING_AGENCY_DATA', payload: null });

          // Close modal and navigate to the new agency
          onClose();

          const agencySlug = result.agency?.slug || result.agency?._id || result._id;
          if (agencySlug) {
            dispatch({ type: 'SET_SELECTED_AGENCY', payload: agencySlug });
            dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'agencies' });
            window.history.pushState({}, '', `/agencies/${agencySlug}`);
          }

          if (onAgencyCreated) {
            onAgencyCreated(result.agency?._id || result._id);
          }
        } else {
          setError(t('agents:agencies.creation.paymentSuccessButFailed'));
        }
      } catch (err: any) {
        setError(err.message || t('agents:agencies.creation.paymentSuccessButFailed'));
      } finally {
        setIsCreating(false);
        setPendingAgencyData(null);
      }
    }
  };

  // Handle payment error
  const handlePaymentError = (errorMsg: string) => {
    setError(t('agents:agencies.creation.paymentFailed', { error: errorMsg }));
    setShowPaymentWindow(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!formData.name.trim()) {
      setError(t('agents:agencies.creation.validation.nameRequired'));
      return;
    }
    if (!formData.city.trim() || !formData.country.trim()) {
      setError(t('agents:agencies.creation.validation.cityCountryRequired'));
      return;
    }
    if (!formData.email.trim()) {
      setError(t('agents:agencies.creation.validation.emailRequired'));
      return;
    }
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email.trim())) {
      setError(t('agents:agencies.creation.validation.invalidEmail'));
      return;
    }
    // Validate URL formats if provided
    if (formData.website && !/^https?:\/\/.+/.test(formData.website)) {
      setError(t('agents:agencies.creation.validation.invalidWebsite'));
      return;
    }

    // Prepare data with yearsInBusiness as a number
    const agencyData = {
      ...formData,
      yearsInBusiness: formData.yearsInBusiness ? parseInt(formData.yearsInBusiness) : undefined,
    };

    // If user already has Enterprise subscription, create agency directly without payment
    if (canSkipPayment) {
      setIsCreating(true);
      try {
        const result = await createAgency(agencyData);

        if (result && (result.agency || result._id || result.id)) {
          // Agency created successfully
          dispatch({
            type: 'SHOW_ALERT',
            payload: {
              type: 'success',
              title: t('agents:agencies.creation.successTitle'),
              message: t('agents:agencies.creation.successMessage', { name: agencyData.name }),
            },
          });

          // Close modal and navigate to the new agency
          onClose();

          const agencySlug = result.agency?.slug || result.agency?._id || result._id;
          if (agencySlug) {
            dispatch({ type: 'SET_SELECTED_AGENCY', payload: agencySlug });
            dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'agencies' });
            window.history.pushState({}, '', `/agencies/${agencySlug}`);
          }

          // Call the callback if provided
          if (onAgencyCreated) {
            onAgencyCreated(result.agency?._id || result._id);
          }
        } else {
          setError(t('agents:agencies.creation.createFailed'));
        }
      } catch (err: any) {
        setError(err.message || t('agents:agencies.creation.createFailed'));
      } finally {
        setIsCreating(false);
      }
      return;
    }

    // User doesn't have Enterprise subscription - save data and show payment window
    setPendingAgencyData(agencyData);
    dispatch({ type: 'SET_PENDING_AGENCY_DATA', payload: agencyData });
    setShowPaymentWindow(true);
  };

  const inputClasses = "w-full px-4 py-2.5 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-sm transition-all duration-200 hover:border-neutral-400";
  const labelClasses = "block text-sm font-semibold text-neutral-700 mb-2";
  const selectClasses = "w-full px-4 py-2.5 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-sm transition-all duration-200 hover:border-neutral-400 cursor-pointer bg-white";

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="" size="4xl">
      <div className="max-w-4xl mx-auto">
        <div className="text-center pb-6 border-b border-neutral-200 mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <BuildingOfficeIcon className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-neutral-800 mb-2">
            {state.pendingAgencyData ? t('agents:agencies.creation.editTitle') : t('agents:agencies.creation.createTitle')}
          </h2>
          <p className="text-sm text-neutral-600">
            {canSkipPayment
              ? t('agents:agencies.creation.enterpriseSubtitle')
              : state.pendingAgencyData
                ? t('agents:agencies.creation.editSubtitle')
                : t('agents:agencies.creation.createSubtitle')
            }
          </p>
          {canSkipPayment && (
            <div className="inline-flex items-center gap-2 mt-3 px-3 py-1.5 bg-green-100 text-green-700 rounded-full text-sm font-medium">
              <CheckCircleIcon className="w-4 h-4" />
              <span>{t('agents:agencies.creation.enterpriseActive')}</span>
            </div>
          )}
        </div>

        {/* Show eligibility warning if user is not an agent */}
        {!agencyEligibility.allowed && (
          <div className="mb-6 p-4 bg-amber-50 border-2 border-amber-300 rounded-xl">
            <div className="flex items-start gap-3">
              <ExclamationTriangleIcon className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-amber-800 mb-1">
                  {agencyEligibility.reason?.includes('agent')
                    ? t('agents:agencies.creation.agentStatusRequired')
                    : t('agents:agencies.creation.proSubscriptionRequired')}
                </h4>
                <p className="text-sm text-amber-700 mb-3">
                  {agencyEligibility.reason}
                </p>
                {!isUserAgent ? (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      // Navigate to profile page where user can switch from private seller to agent
                      dispatch({ type: 'SET_ACCOUNT_TAB', payload: 'profile' });
                      dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'account' });
                    }}
                    className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-semibold rounded-lg hover:from-amber-600 hover:to-orange-600 transition-all"
                  >
                    {t('agents:agencies.creation.becomeAgentFirst')}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'pricing' });
                    }}
                    className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-semibold rounded-lg hover:from-amber-600 hover:to-orange-600 transition-all"
                  >
                    {t('agents:agencies.creation.upgradeToPro')}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information Section */}
          <div className="bg-gradient-to-r from-neutral-50 to-neutral-100 p-5 rounded-xl border border-neutral-200">
            <h3 className="text-base font-bold text-neutral-800 mb-4 flex items-center gap-2">
              <span className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white text-sm font-bold">1</span>
              {t('agents:agencies.creation.sections.basicInfo')}
            </h3>

            {/* Agency Name */}
            <div className="mb-4">
              <label htmlFor="name" className={labelClasses}>
                {t('agents:agencies.creation.fields.agencyName')} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder={t('agents:agencies.creation.placeholders.agencyName')}
                className={inputClasses}
                required
                disabled={isCreating}
              />
              <p className="text-xs text-neutral-500 mt-1">{t('agents:agencies.creation.hints.agencyName')}</p>
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className={labelClasses}>
                {t('agents:agencies.creation.fields.description')}
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder={t('agents:agencies.creation.placeholders.description')}
                rows={3}
                className={inputClasses}
                disabled={isCreating}
              />
              <p className="text-xs text-neutral-500 mt-1">{t('agents:agencies.creation.hints.description')}</p>
            </div>
          </div>

          {/* Location Section */}
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-5 rounded-xl border border-blue-200">
            <h3 className="text-base font-bold text-neutral-800 mb-4 flex items-center gap-2">
              <span className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-bold">2</span>
              {t('agents:agencies.creation.sections.location')}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label htmlFor="country" className={labelClasses}>
                  {t('agents:agencies.creation.fields.country')} <span className="text-red-500">*</span>
                </label>
                <select
                  id="country"
                  name="country"
                  value={formData.country}
                  onChange={handleInputChange}
                  className={selectClasses}
                  required
                  disabled={isCreating}
                >
                  <option value="">{t('agents:agencies.creation.placeholders.selectCountry')}</option>
                  {BALKAN_LOCATIONS.map((country) => (
                    <option key={country.code} value={country.name}>
                      {country.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="city" className={labelClasses}>
                  {t('agents:agencies.creation.fields.city')} <span className="text-red-500">*</span>
                </label>
                <select
                  id="city"
                  name="city"
                  value={formData.city}
                  onChange={handleInputChange}
                  className={selectClasses}
                  required
                  disabled={isCreating || !formData.country}
                >
                  <option value="">
                    {formData.country ? t('agents:agencies.creation.placeholders.selectCity') : t('agents:agencies.creation.placeholders.selectCountryFirst')}
                  </option>
                  {availableCities.map((city) => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Address */}
            <div>
              <label htmlFor="address" className={labelClasses}>
                {t('agents:agencies.creation.fields.streetAddress')}
              </label>
              <input
                type="text"
                id="address"
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                placeholder={t('agents:agencies.creation.placeholders.streetAddress')}
                className={inputClasses}
                disabled={isCreating}
              />
              <p className="text-xs text-neutral-500 mt-1">{t('agents:agencies.creation.hints.streetAddress')}</p>
            </div>
          </div>

          {/* Contact Information Section */}
          <div className="bg-gradient-to-r from-green-50 to-green-100 p-5 rounded-xl border border-green-200">
            <h3 className="text-base font-bold text-neutral-800 mb-4 flex items-center gap-2">
              <span className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center text-white text-sm font-bold">3</span>
              {t('agents:agencies.creation.sections.contactInfo')}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label htmlFor="email" className={labelClasses}>
                  {t('agents:agencies.creation.fields.email')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder={t('agents:agencies.creation.placeholders.email')}
                  className={inputClasses}
                  required
                  disabled={isCreating}
                />
                <p className="text-xs text-neutral-500 mt-1">{t('agents:agencies.creation.hints.email')}</p>
              </div>
              <div>
                <label htmlFor="phone" className={labelClasses}>
                  {t('agents:agencies.creation.fields.phone')}
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder={t('agents:agencies.creation.placeholders.phone')}
                  className={inputClasses}
                  disabled={isCreating}
                />
                <p className="text-xs text-neutral-500 mt-1">{t('agents:agencies.creation.hints.phone')}</p>
              </div>
            </div>

            {/* Website */}
            <div>
              <label htmlFor="website" className={labelClasses}>
                {t('agents:agencies.creation.fields.websiteUrl')}
              </label>
              <input
                type="url"
                id="website"
                name="website"
                value={formData.website}
                onChange={handleInputChange}
                placeholder={t('agents:agencies.creation.placeholders.website')}
                className={inputClasses}
                disabled={isCreating}
              />
              <p className="text-xs text-neutral-500 mt-1">{t('agents:agencies.creation.hints.website')}</p>
            </div>
          </div>

          {/* Professional Details Section */}
          <div className="bg-gradient-to-r from-amber-50 to-amber-100 p-5 rounded-xl border border-amber-200">
            <h3 className="text-base font-bold text-neutral-800 mb-4 flex items-center gap-2">
              <span className="w-8 h-8 bg-amber-600 rounded-full flex items-center justify-center text-white text-sm font-bold">4</span>
              {t('agents:agencies.creation.sections.professionalDetails')}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* License Number */}
              <div>
                <label htmlFor="licenseNumber" className={labelClasses}>
                  {t('agents:agencies.creation.fields.licenseNumber')}
                </label>
                <input
                  type="text"
                  id="licenseNumber"
                  name="licenseNumber"
                  value={formData.licenseNumber}
                  onChange={handleInputChange}
                  placeholder={t('agents:agencies.creation.placeholders.licenseNumber')}
                  className={inputClasses}
                  disabled={isCreating}
                />
                <p className="text-xs text-neutral-500 mt-1">{t('agents:agencies.creation.hints.licenseNumber')}</p>
              </div>

              {/* Years in Business */}
              <div>
                <label htmlFor="yearsInBusiness" className={labelClasses}>
                  {t('agents:agencies.creation.fields.yearsInBusiness')}
                </label>
                <input
                  type="number"
                  id="yearsInBusiness"
                  name="yearsInBusiness"
                  value={formData.yearsInBusiness}
                  onChange={handleInputChange}
                  placeholder={t('agents:agencies.creation.placeholders.yearsInBusiness')}
                  min="0"
                  max="100"
                  className={inputClasses}
                  disabled={isCreating}
                />
                <p className="text-xs text-neutral-500 mt-1">{t('agents:agencies.creation.hints.yearsInBusiness')}</p>
              </div>
            </div>

            {/* Languages */}
            <div className="mt-4">
              <label className={labelClasses}>
                {t('agents:agencies.creation.fields.languagesSpoken')}
              </label>
              <div className="flex flex-wrap gap-2">
                {BALKAN_LANGUAGE_KEYS.map((langKey) => (
                  <button
                    key={langKey}
                    type="button"
                    onClick={() => handleLanguageToggle(langKey)}
                    disabled={isCreating}
                    className={`px-3 py-1.5 text-sm rounded-full border transition-all ${
                      formData.languages.includes(langKey)
                        ? 'bg-amber-500 text-white border-amber-500'
                        : 'bg-white text-neutral-600 border-neutral-300 hover:border-amber-400'
                    } disabled:opacity-50`}
                  >
                    {t(`agents:languages.${langKey}`)}
                  </button>
                ))}
              </div>
              <p className="text-xs text-neutral-500 mt-2">{t('agents:agencies.creation.hints.languages')}</p>
            </div>
          </div>

          {/* Social Media Links */}
          <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-5 rounded-xl border border-purple-200">
            <h3 className="text-base font-bold text-neutral-800 mb-4 flex items-center gap-2">
              <span className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-white text-sm font-bold">5</span>
              {t('agents:agencies.creation.sections.socialMedia')}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="facebookUrl" className={labelClasses}>
                  {t('common:social.facebook')}
                </label>
                <input
                  type="url"
                  id="facebookUrl"
                  name="facebookUrl"
                  value={formData.facebookUrl}
                  onChange={handleInputChange}
                  placeholder="facebook.com/yourpage"
                  className={inputClasses}
                  disabled={isCreating}
                />
              </div>

              <div>
                <label htmlFor="instagramUrl" className={labelClasses}>
                  {t('common:social.instagram')}
                </label>
                <input
                  type="url"
                  id="instagramUrl"
                  name="instagramUrl"
                  value={formData.instagramUrl}
                  onChange={handleInputChange}
                  placeholder="instagram.com/yourpage"
                  className={inputClasses}
                  disabled={isCreating}
                />
              </div>

              <div>
                <label htmlFor="linkedinUrl" className={labelClasses}>
                  {t('common:social.linkedin')}
                </label>
                <input
                  type="url"
                  id="linkedinUrl"
                  name="linkedinUrl"
                  value={formData.linkedinUrl}
                  onChange={handleInputChange}
                  placeholder="linkedin.com/company/..."
                  className={inputClasses}
                  disabled={isCreating}
                />
              </div>
            </div>
            <p className="text-xs text-neutral-500 mt-3">{t('agents:agencies.creation.hints.socialMedia')}</p>
          </div>

          {/* Business Hours */}
          <div className="bg-gradient-to-r from-indigo-50 to-indigo-100 p-5 rounded-xl border border-indigo-200">
            <h3 className="text-base font-bold text-neutral-800 mb-4 flex items-center gap-2">
              <span className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center text-white text-sm font-bold">6</span>
              {t('agents:agencies.creation.sections.businessHours')}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => (
                <div key={day}>
                  <label htmlFor={day} className={labelClasses}>
                    {t(`agents:agencies.creation.days.${day}`)}
                  </label>
                  <input
                    type="text"
                    id={day}
                    value={formData.businessHours[day as keyof typeof formData.businessHours]}
                    onChange={(e) => handleBusinessHoursChange(day, e.target.value)}
                    placeholder="9:00 AM - 5:00 PM"
                    className={inputClasses}
                    disabled={isCreating}
                  />
                </div>
              ))}
            </div>
            <p className="text-xs text-neutral-500 mt-3">{t('agents:agencies.creation.hints.businessHours')}</p>
          </div>

          {/* Info Box */}
          <div className="bg-gradient-to-br from-blue-50 via-blue-100 to-cyan-100 border-2 border-blue-300 rounded-xl p-6 shadow-sm">
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <CheckCircleIcon className="w-10 h-10 text-blue-600" />
              </div>
              <div className="flex-1">
                <h4 className="text-base font-bold text-blue-900 mb-3">{t('agents:agencies.creation.features.title')}</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div className="flex items-start gap-2">
                    <span className="text-blue-600 font-bold">✓</span>
                    <p className="text-sm text-blue-800">{t('agents:agencies.creation.features.dedicatedPage')}</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-blue-600 font-bold">✓</span>
                    <p className="text-sm text-blue-800">{t('agents:agencies.creation.features.displayAgents')}</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-blue-600 font-bold">✓</span>
                    <p className="text-sm text-blue-800">{t('agents:agencies.creation.features.featuredAds')}</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-blue-600 font-bold">✓</span>
                    <p className="text-sm text-blue-800">{t('agents:agencies.creation.features.contactInfo')}</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-blue-600 font-bold">✓</span>
                    <p className="text-sm text-blue-800">{t('agents:agencies.creation.features.invitationCode')}</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-blue-600 font-bold">✓</span>
                    <p className="text-sm text-blue-800">{t('agents:agencies.creation.features.prioritySupport')}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-4 pt-2 sticky bottom-0 bg-white py-4 border-t border-neutral-200">
            <button
              type="button"
              onClick={onClose}
              disabled={isCreating}
              className="flex-1 py-3.5 px-6 border-2 border-neutral-300 text-neutral-700 rounded-xl font-bold hover:bg-neutral-50 hover:border-neutral-400 transition-all disabled:opacity-50"
            >
              {t('common:cancel')}
            </button>
            <button
              type="submit"
              disabled={isCreating || !agencyEligibility.allowed}
              className="flex-1 py-3.5 px-6 bg-gradient-to-r from-amber-500 via-amber-600 to-orange-600 text-white rounded-xl font-bold hover:from-amber-600 hover:via-amber-700 hover:to-orange-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isCreating ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>{t('agents:agencies.creation.creatingAgency')}</span>
                </>
              ) : canSkipPayment ? (
                <>
                  <BuildingOfficeIcon className="w-5 h-5" />
                  <span>{t('agents:agencies.creation.createAgencyButton')}</span>
                </>
              ) : (
                <>
                  <span>{t('agents:agencies.creation.continueToPayment')}</span>
                  <span className="text-xl">→</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Enterprise Payment Window - shown directly after form submission */}
      {/* Price fetched from database, supports coupons and discount codes */}
      <PaymentWindow
        isOpen={showPaymentWindow}
        onClose={() => {
          setShowPaymentWindow(false);
          setPendingAgencyData(null);
        }}
        planName={enterprisePlan.name}
        planPrice={enterprisePlan.price}
        planInterval={enterprisePlan.interval}
        userRole={getUserRole()}
        userEmail={state.currentUser?.email}
        userCountry={state.currentUser?.country || 'RS'}
        onSuccess={handlePaymentSuccess}
        onError={handlePaymentError}
        productId={enterprisePlan.productId}
      />
    </Modal>
  );
};

export default AgencyCreationModal;
