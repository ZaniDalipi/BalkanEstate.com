import React, { useState, useEffect } from 'react';
import PaymentWindow from './PaymentWindow';
import {
  BuildingOfficeIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from '../../constants';
import { useAppContext } from '../../context/AppContext';
import { BALKAN_LOCATIONS } from '../../utils/balkanLocations';
import { canCreateAgency } from '../../src/shared/utils/subscriptionHelpers';
import { UserRole } from '../../types';
import { createAgency } from '../../src/features/agencies/api/agencyApi';
import { API_URL } from '../../src/shared/api/config';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

// ─── Constants ────────────────────────────────────────────────────────────────

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

const BALKAN_LANGUAGES = [
  'English', 'Serbian', 'Croatian', 'Slovenian', 'Bosnian', 'Macedonian',
  'Albanian', 'Montenegrin', 'Bulgarian', 'Romanian', 'Greek', 'Turkish',
  'Hungarian', 'German', 'Italian', 'French', 'Russian', 'Spanish',
];

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;

const DEFAULT_HOURS: Record<string, string> = {
  monday: '9:00 AM - 6:00 PM',
  tuesday: '9:00 AM - 6:00 PM',
  wednesday: '9:00 AM - 6:00 PM',
  thursday: '9:00 AM - 6:00 PM',
  friday: '9:00 AM - 6:00 PM',
  saturday: '10:00 AM - 4:00 PM',
  sunday: 'Closed',
};

// ─── Step definitions ─────────────────────────────────────────────────────────

const STEPS = [
  { id: 1, label: 'Agency Info',  icon: '🏢' },
  { id: 2, label: 'Location',     icon: '📍' },
  { id: 3, label: 'Contact',      icon: '📞' },
  { id: 4, label: 'Professional', icon: '🎓' },
  { id: 5, label: 'Online',       icon: '🌐' },
] as const;

// ─── Props ────────────────────────────────────────────────────────────────────

interface AgencyCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAgencyCreated: (agencyId: string) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

const AgencyCreationModal: React.FC<AgencyCreationModalProps> = ({
  isOpen,
  onClose,
  onAgencyCreated,
}) => {
  const { state, dispatch } = useAppContext();
  const [step, setStep] = useState(1);
  const [isCreating, setIsCreating] = useState(false);
  const [globalError, setGlobalError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [availableCities, setAvailableCities] = useState<string[]>([]);
  const [showPaymentWindow, setShowPaymentWindow] = useState(false);
  const [pendingAgencyData, setPendingAgencyData] = useState<any>(null);
  const [enterprisePlan, setEnterprisePlan] = useState<EnterprisePlan>(DEFAULT_ENTERPRISE_PLAN);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    address: '',
    city: '',
    country: '',
    phone: '',
    email: '',
    website: '',
    licenseNumber: '',
    yearsInBusiness: '',
    languages: [] as string[],
    facebookUrl: '',
    instagramUrl: '',
    linkedinUrl: '',
    businessHours: { ...DEFAULT_HOURS },
  });

  // ── Eligibility ─────────────────────────────────────────────────────────────

  const agencyEligibility = canCreateAgency(
    state.currentUser?.subscription,
    state.currentUser?.availableRoles,
    {
      role: state.currentUser?.role,
      agentId: state.currentUser?.agentId,
      licenseNumber: state.currentUser?.licenseNumber,
    },
  );

  const isUserAgent =
    state.currentUser?.availableRoles?.includes(UserRole.AGENT) ||
    state.currentUser?.role === UserRole.AGENT ||
    state.currentUser?.role === 'agent' ||
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

  // ── Effects ──────────────────────────────────────────────────────────────────

  // Lock body scroll
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [isOpen]);

  // Reset step when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setFieldErrors({});
      setGlobalError('');
    }
  }, [isOpen]);

  // Fetch enterprise plan
  useEffect(() => {
    if (!isOpen) return;
    (async () => {
      try {
        const res = await fetch(`${API_URL}/products?role=seller`);
        if (res.ok) {
          const data = await res.json();
          const enterprise = (data.products || []).find((p: any) =>
            p.productId?.toLowerCase().includes('enterprise') ||
            p.name?.toLowerCase().includes('enterprise'),
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
      } catch {
        // keep default
      }
    })();
  }, [isOpen]);

  // Pre-fill from user / pending agency data
  useEffect(() => {
    if (!isOpen) return;
    const source = state.pendingAgencyData || null;
    const user = state.currentUser;

    if (source) {
      setFormData({
        name: source.name || '',
        description: source.description || '',
        address: source.address || '',
        city: source.city || '',
        country: source.country || '',
        phone: source.phone || '',
        email: source.email || '',
        website: source.website || '',
        licenseNumber: source.licenseNumber || '',
        yearsInBusiness: source.yearsInBusiness?.toString() || '',
        languages: source.languages || [],
        facebookUrl: source.facebookUrl || '',
        instagramUrl: source.instagramUrl || '',
        linkedinUrl: source.linkedinUrl || '',
        businessHours: source.businessHours || { ...DEFAULT_HOURS },
      });
      if (source.country) {
        const countryData = BALKAN_LOCATIONS.find(c => c.name === source.country);
        setAvailableCities(countryData?.cities.map(c => c.name) ?? []);
      }
    } else if (user) {
      setFormData(prev => ({
        ...prev,
        email: prev.email || user.email || '',
        phone: prev.phone || user.phone || '',
        city: prev.city || user.city || '',
        country: prev.country || user.country || '',
        name: prev.name || user.agencyName || '',
        licenseNumber: prev.licenseNumber || user.licenseNumber || '',
      }));
      if (user.country) {
        const countryData = BALKAN_LOCATIONS.find(c => c.name === user.country);
        setAvailableCities(countryData?.cities.map(c => c.name) ?? []);
      }
    }
  }, [isOpen, state.currentUser, state.pendingAgencyData]);

  // Update cities when country changes
  useEffect(() => {
    if (formData.country) {
      const countryData = BALKAN_LOCATIONS.find(c => c.name === formData.country);
      setAvailableCities(countryData?.cities.map(c => c.name) ?? []);
    } else {
      setAvailableCities([]);
    }
  }, [formData.country]);

  // ── Helpers ──────────────────────────────────────────────────────────────────

  const set = (field: string, value: any) => {
    setFormData(prev => {
      if (field === 'country') return { ...prev, country: value, city: '' };
      return { ...prev, [field]: value };
    });
    // clear field error on change
    setFieldErrors(prev => ({ ...prev, [field]: '' }));
  };

  const setHours = (day: string, value: string) =>
    setFormData(prev => ({ ...prev, businessHours: { ...prev.businessHours, [day]: value } }));

  const toggleLanguage = (lang: string) =>
    setFormData(prev => ({
      ...prev,
      languages: prev.languages.includes(lang)
        ? prev.languages.filter(l => l !== lang)
        : [...prev.languages, lang],
    }));

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // Per-step validation — returns error map (empty = all good)
  const validateStep = (s: number): Record<string, string> => {
    const errs: Record<string, string> = {};
    if (s === 1) {
      if (!formData.name.trim()) errs.name = 'Agency name is required';
    }
    if (s === 2) {
      if (!formData.country) errs.country = 'Country is required';
      if (!formData.city) errs.city = 'City is required';
    }
    if (s === 3) {
      if (!formData.email.trim()) {
        errs.email = 'Email address is required';
      } else if (!emailRegex.test(formData.email.trim())) {
        errs.email = 'Please enter a valid email address';
      }
      if (!formData.phone.trim()) {
        errs.phone = 'Phone number is required';
      } else if (!/^[+\d\s\-().]{7,20}$/.test(formData.phone.trim())) {
        errs.phone = 'Please enter a valid phone number (e.g. +381 11 123 4567)';
      }
      if (formData.website && !/^https?:\/\/.+/.test(formData.website)) {
        errs.website = 'Website must start with http:// or https://';
      }
    }
    return errs;
  };

  const handleNext = () => {
    const errs = validateStep(step);
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      return;
    }
    setFieldErrors({});
    setStep(s => Math.min(s + 1, STEPS.length));
  };

  const handleBack = () => {
    setFieldErrors({});
    setStep(s => Math.max(s - 1, 1));
  };

  const getUserRole = (): 'buyer' | 'private_seller' | 'agent' =>
    state.currentUser?.role === 'agent' ? 'agent' : 'private_seller';

  const handlePaymentSuccess = async (_paymentIntentId: string) => {
    setShowPaymentWindow(false);
    if (!pendingAgencyData) return;
    setIsCreating(true);
    try {
      const result = await createAgency(pendingAgencyData);
      if (result && (result.agency || result._id || result.id)) {
        dispatch({ type: 'SHOW_ALERT', payload: { type: 'success', title: 'Agency Created!', message: `Your agency "${pendingAgencyData.name}" has been created.` } });
        dispatch({ type: 'SET_PENDING_AGENCY_DATA', payload: null });
        onClose();
        const slug = result.agency?.slug || result.agency?._id || result._id;
        if (slug) {
          dispatch({ type: 'SET_SELECTED_AGENCY', payload: slug });
          dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'agencies' });
          window.history.pushState({}, '', `/agencies/${slug}`);
        }
        onAgencyCreated(result.agency?._id || result._id);
      } else {
        setGlobalError('Payment succeeded but agency creation failed. Please contact support.');
      }
    } catch (err: any) {
      setGlobalError(err.message || 'Payment succeeded but agency creation failed.');
    } finally {
      setIsCreating(false);
      setPendingAgencyData(null);
    }
  };

  const handlePaymentError = (msg: string) => {
    setGlobalError(`Payment failed: ${msg}`);
    setShowPaymentWindow(false);
  };

  const handleSubmit = async () => {
    // Validate all steps before final submit
    for (let s = 1; s <= 3; s++) {
      const errs = validateStep(s);
      if (Object.keys(errs).length > 0) {
        setFieldErrors(errs);
        setStep(s);
        return;
      }
    }

    setGlobalError('');
    const agencyData = {
      ...formData,
      yearsInBusiness: formData.yearsInBusiness ? parseInt(formData.yearsInBusiness) : undefined,
    };

    if (canSkipPayment) {
      setIsCreating(true);
      try {
        const result = await createAgency(agencyData);
        if (result && (result.agency || result._id || result.id)) {
          dispatch({ type: 'SHOW_ALERT', payload: { type: 'success', title: 'Agency Created!', message: `Your agency "${agencyData.name}" has been created successfully.` } });
          onClose();
          const slug = result.agency?.slug || result.agency?._id || result._id;
          if (slug) {
            dispatch({ type: 'SET_SELECTED_AGENCY', payload: slug });
            dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'agencies' });
            window.history.pushState({}, '', `/agencies/${slug}`);
          }
          onAgencyCreated(result.agency?._id || result._id);
        } else {
          setGlobalError('Failed to create agency. Please try again.');
        }
      } catch (err: any) {
        setGlobalError(err.message || 'Failed to create agency. Please try again.');
      } finally {
        setIsCreating(false);
      }
      return;
    }

    // No enterprise sub → proceed to payment
    setPendingAgencyData(agencyData);
    dispatch({ type: 'SET_PENDING_AGENCY_DATA', payload: agencyData });
    setShowPaymentWindow(true);
  };

  if (!isOpen) return null;

  // ── Shared classes ───────────────────────────────────────────────────────────

  const inputCls = (field: string) =>
    `w-full px-4 py-3 border rounded-xl text-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed ${
      fieldErrors[field]
        ? 'border-red-400 bg-red-50'
        : 'border-gray-200 bg-white hover:border-gray-300'
    }`;

  const labelCls = 'block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wider';

  const FieldError = ({ field }: { field: string }) =>
    fieldErrors[field] ? (
      <p className="flex items-center gap-1 text-xs text-red-600 mt-1.5 font-medium">
        <ExclamationTriangleIcon className="w-3.5 h-3.5" />
        {fieldErrors[field]}
      </p>
    ) : null;

  const Required = () => <span className="text-red-500 ml-0.5">*</span>;

  const isLastStep = step === STEPS.length;

  // ── Step content ──────────────────────────────────────────────────────────────

  const renderStep = () => {
    switch (step) {
      // ── Step 1: Basic Info ────────────────────────────────────────────────────
      case 1:
        return (
          <div className="space-y-5">
            <div>
              <label className={labelCls}>Agency Name <Required /></label>
              <input
                type="text"
                value={formData.name}
                onChange={e => set('name', e.target.value)}
                placeholder="e.g., Premier Real Estate Agency"
                className={inputCls('name')}
                disabled={isCreating}
                autoFocus
              />
              <FieldError field="name" />
              <p className="text-xs text-gray-400 mt-1">Choose a professional name that represents your brand</p>
            </div>
            <div>
              <label className={labelCls}>Description</label>
              <textarea
                value={formData.description}
                onChange={e => set('description', e.target.value)}
                placeholder="Tell potential clients about your agency, your expertise, and what makes you unique..."
                rows={4}
                className={`${inputCls('description')} resize-none`}
                disabled={isCreating}
              />
              <p className="text-xs text-gray-400 mt-1">A compelling description helps clients understand your value</p>
            </div>
          </div>
        );

      // ── Step 2: Location ──────────────────────────────────────────────────────
      case 2:
        return (
          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Country <Required /></label>
                <div className="relative">
                  <select
                    value={formData.country}
                    onChange={e => set('country', e.target.value)}
                    className={`${inputCls('country')} appearance-none pr-8`}
                    disabled={isCreating}
                  >
                    <option value="">Select a country</option>
                    {BALKAN_LOCATIONS.map(c => (
                      <option key={c.code} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                  <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 rotate-90 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
                <FieldError field="country" />
              </div>
              <div>
                <label className={labelCls}>City <Required /></label>
                <div className="relative">
                  <select
                    value={formData.city}
                    onChange={e => set('city', e.target.value)}
                    className={`${inputCls('city')} appearance-none pr-8`}
                    disabled={isCreating || !formData.country}
                  >
                    <option value="">
                      {formData.country ? 'Select a city' : 'Select country first'}
                    </option>
                    {availableCities.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 rotate-90 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
                <FieldError field="city" />
              </div>
            </div>
            <div>
              <label className={labelCls}>Street Address</label>
              <input
                type="text"
                value={formData.address}
                onChange={e => set('address', e.target.value)}
                placeholder="e.g., 123 Main Street, Building A"
                className={inputCls('address')}
                disabled={isCreating}
              />
              <p className="text-xs text-gray-400 mt-1">Optional: Full street address for your office</p>
            </div>
          </div>
        );

      // ── Step 3: Contact ───────────────────────────────────────────────────────
      case 3:
        return (
          <div className="space-y-5">
            <div>
              <label className={labelCls}>Email Address <Required /></label>
              <input
                type="email"
                value={formData.email}
                onChange={e => set('email', e.target.value)}
                placeholder="contact@agency.com"
                className={inputCls('email')}
                disabled={isCreating}
              />
              <FieldError field="email" />
              <p className="text-xs text-gray-400 mt-1">Primary contact email for inquiries</p>
            </div>
            <div>
              <label className={labelCls}>Phone Number <Required /></label>
              <input
                type="tel"
                value={formData.phone}
                onChange={e => set('phone', e.target.value)}
                placeholder="+381 11 123 4567"
                className={inputCls('phone')}
                disabled={isCreating}
              />
              <FieldError field="phone" />
              <p className="text-xs text-gray-400 mt-1">Include country code (e.g. +381 for Serbia)</p>
            </div>
            <div>
              <label className={labelCls}>Website URL</label>
              <input
                type="url"
                value={formData.website}
                onChange={e => set('website', e.target.value)}
                placeholder="https://yourwebsite.com"
                className={inputCls('website')}
                disabled={isCreating}
              />
              <FieldError field="website" />
              <p className="text-xs text-gray-400 mt-1">Optional: Your agency's website</p>
            </div>
          </div>
        );

      // ── Step 4: Professional ──────────────────────────────────────────────────
      case 4:
        return (
          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Agent License Number</label>
                <input
                  type="text"
                  value={formData.licenseNumber}
                  onChange={e => set('licenseNumber', e.target.value)}
                  placeholder="e.g., RE-123456"
                  className={inputCls('licenseNumber')}
                  disabled={isCreating}
                />
                <p className="text-xs text-gray-400 mt-1">Your official real estate license</p>
              </div>
              <div>
                <label className={labelCls}>Years in Business</label>
                <input
                  type="number"
                  value={formData.yearsInBusiness}
                  onChange={e => set('yearsInBusiness', e.target.value)}
                  placeholder="e.g., 5"
                  min="0"
                  max="100"
                  className={inputCls('yearsInBusiness')}
                  disabled={isCreating}
                />
                <p className="text-xs text-gray-400 mt-1">How long you've been in real estate</p>
              </div>
            </div>
            <div>
              <label className={labelCls}>Languages Spoken</label>
              <div className="flex flex-wrap gap-2 mt-1">
                {BALKAN_LANGUAGES.map(lang => (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => toggleLanguage(lang)}
                    disabled={isCreating}
                    className={`px-3 py-1.5 text-xs rounded-full border transition-all disabled:opacity-50 ${
                      formData.languages.includes(lang)
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-blue-400 hover:text-blue-600'
                    }`}
                  >
                    {lang}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-2">Select all languages your team can communicate in</p>
            </div>
          </div>
        );

      // ── Step 5: Online Presence ───────────────────────────────────────────────
      case 5:
        return (
          <div className="space-y-6">
            {/* Social Links */}
            <div>
              <h3 className="text-sm font-bold text-gray-800 mb-3">Social Media <span className="text-gray-400 font-normal">(optional)</span></h3>
              <div className="space-y-4">
                {[
                  { field: 'facebookUrl', label: 'Facebook', placeholder: 'https://facebook.com/yourpage' },
                  { field: 'instagramUrl', label: 'Instagram', placeholder: 'https://instagram.com/yourpage' },
                  { field: 'linkedinUrl', label: 'LinkedIn', placeholder: 'https://linkedin.com/company/...' },
                ].map(({ field, label, placeholder }) => (
                  <div key={field}>
                    <label className={labelCls}>{label}</label>
                    <input
                      type="url"
                      value={(formData as any)[field]}
                      onChange={e => set(field, e.target.value)}
                      placeholder={placeholder}
                      className={inputCls(field)}
                      disabled={isCreating}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Business Hours */}
            <div>
              <h3 className="text-sm font-bold text-gray-800 mb-3">Business Hours <span className="text-gray-400 font-normal">(optional)</span></h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {DAYS.map(day => (
                  <div key={day}>
                    <label className={labelCls}>{day.charAt(0).toUpperCase() + day.slice(1)}</label>
                    <input
                      type="text"
                      value={formData.businessHours[day]}
                      onChange={e => setHours(day, e.target.value)}
                      placeholder="9:00 AM - 5:00 PM"
                      className={inputCls(day)}
                      disabled={isCreating}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50
                   flex items-stretch sm:items-center justify-center
                   sm:p-4"
        onClick={() => { if (!isCreating) onClose(); }}
      >
        {/* Dialog */}
        <div
          className="
            bg-white flex flex-col w-full h-full
            sm:rounded-2xl sm:h-auto sm:max-w-xl sm:max-h-[94vh]
            md:max-w-2xl
            shadow-2xl overflow-hidden
          "
          onClick={e => e.stopPropagation()}
        >
          {/* ── Header ──────────────────────────────────────────────── */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center flex-shrink-0">
                <BuildingOfficeIcon className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-bold text-gray-900 leading-tight">
                  {state.pendingAgencyData ? 'Edit Agency Details' : 'Create Your Agency'}
                </h2>
                <p className="text-xs text-gray-400">
                  Step {step} of {STEPS.length} — {STEPS[step - 1].label}
                </p>
              </div>
            </div>
            <button
              onClick={() => { if (!isCreating) onClose(); }}
              disabled={isCreating}
              className="p-2 hover:bg-gray-100 rounded-xl transition-colors ml-3 flex-shrink-0 disabled:opacity-40"
              aria-label="Close"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          {/* ── Progress Bar ─────────────────────────────────────────── */}
          <div className="flex flex-shrink-0 px-5 pt-4 pb-2 gap-1.5">
            {STEPS.map(s => (
              <div
                key={s.id}
                className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                  s.id < step
                    ? 'bg-green-500'
                    : s.id === step
                    ? 'bg-blue-600'
                    : 'bg-gray-200'
                }`}
              />
            ))}
          </div>

          {/* ── Step labels (desktop only) ───────────────────────────── */}
          <div className="hidden sm:flex px-5 pb-3 gap-1.5">
            {STEPS.map(s => (
              <div key={s.id} className="flex-1 text-center">
                <span className={`text-[10px] font-semibold uppercase tracking-wide ${
                  s.id === step ? 'text-blue-600' : s.id < step ? 'text-green-600' : 'text-gray-400'
                }`}>
                  {s.icon} {s.label}
                </span>
              </div>
            ))}
          </div>

          {/* ── Eligibility Warning ──────────────────────────────────── */}
          {!agencyEligibility.allowed && (
            <div className="mx-5 mb-3 p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex-shrink-0">
              <div className="flex items-start gap-2.5">
                <ExclamationTriangleIcon className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-amber-800">
                    {agencyEligibility.reason?.includes('agent') ? 'Agent Status Required' : 'Pro Subscription Required'}
                  </p>
                  <p className="text-xs text-amber-700 mt-0.5">{agencyEligibility.reason}</p>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      if (!isUserAgent) {
                        dispatch({ type: 'SET_ACCOUNT_TAB', payload: 'profile' });
                        dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'account' });
                      } else {
                        dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'pricing' });
                      }
                    }}
                    className="mt-2 px-3 py-1.5 bg-amber-500 text-white text-xs font-semibold rounded-lg hover:bg-amber-600 transition-colors"
                  >
                    {!isUserAgent ? 'Become an Agent First' : 'Upgrade to Pro'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {canSkipPayment && (
            <div className="mx-5 mb-3 flex-shrink-0">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                <CheckCircleIcon className="w-3.5 h-3.5" />
                Enterprise Active — No Payment Required
              </div>
            </div>
          )}

          {/* ── Scrollable step body ─────────────────────────────────── */}
          <div className="flex-1 overflow-y-auto px-5 py-4">
            {/* Global error */}
            {globalError && (
              <div className="mb-4 p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5">
                <ExclamationTriangleIcon className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700 font-medium">{globalError}</p>
              </div>
            )}

            {renderStep()}
          </div>

          {/* ── Sticky Footer ────────────────────────────────────────── */}
          <div className="flex gap-3 px-5 py-4 border-t border-gray-100 bg-white flex-shrink-0">
            {step > 1 ? (
              <button
                type="button"
                onClick={handleBack}
                disabled={isCreating}
                className="flex items-center gap-1.5 px-4 py-3 border border-gray-200 text-gray-600 font-semibold rounded-xl hover:bg-gray-50 transition-colors text-sm disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </button>
            ) : (
              <button
                type="button"
                onClick={() => { if (!isCreating) onClose(); }}
                disabled={isCreating}
                className="flex-1 px-4 py-3 border border-gray-200 text-gray-600 font-semibold rounded-xl hover:bg-gray-50 transition-colors text-sm disabled:opacity-40"
              >
                Cancel
              </button>
            )}

            {isLastStep ? (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isCreating || !agencyEligibility.allowed}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold rounded-xl hover:from-amber-600 hover:to-orange-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm shadow-sm"
              >
                {isCreating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Creating Agency…
                  </>
                ) : canSkipPayment ? (
                  <>
                    <BuildingOfficeIcon className="w-4 h-4" />
                    Create Agency
                  </>
                ) : (
                  'Continue to Payment →'
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleNext}
                disabled={isCreating}
                className="flex-1 flex items-center justify-center gap-1.5 px-4 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors text-sm shadow-sm disabled:opacity-40"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Payment Window */}
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
    </>
  );
};

export default AgencyCreationModal;
