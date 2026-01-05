import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Footer from '../../../../components/shared/Footer';
import { useAppContext } from '../../../../context/AppContext';

// Icons
const HomeIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
  </svg>
);

const ChartIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);

const LocationIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const ClockIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const ShieldIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
);

const SparklesIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
  </svg>
);

const CheckIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

const ArrowRightIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
  </svg>
);

const CurrencyIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.121 15.536c-1.171 1.952-3.07 1.952-4.242 0-1.172-1.953-1.172-5.119 0-7.072 1.171-1.952 3.07-1.952 4.242 0M8 10.5h4m-4 3h4m9-1.5a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const BuildingIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
  </svg>
);

const propertyTypes = [
  { value: 'apartment', label: 'Apartment' },
  { value: 'house', label: 'House' },
  { value: 'villa', label: 'Villa' },
  { value: 'land', label: 'Land' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'other', label: 'Other' },
];

const countries = [
  'Albania', 'Bosnia and Herzegovina', 'Bulgaria', 'Croatia', 'Greece',
  'Kosovo', 'Montenegro', 'North Macedonia', 'Romania', 'Serbia', 'Slovenia'
];

const ValuationPage: React.FC = () => {
  const { t } = useTranslation();
  const { state, dispatch } = useAppContext();

  const [formData, setFormData] = useState({
    address: '',
    city: '',
    country: '',
    propertyType: '',
    bedrooms: '',
    bathrooms: '',
    sqft: '',
    yearBuilt: '',
    condition: 'good',
    email: '',
    phone: '',
    name: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [estimatedValue, setEstimatedValue] = useState<{ min: number; max: number } | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const calculateEstimate = () => {
    // Simple estimation algorithm based on inputs
    const basePricePerSqm: Record<string, number> = {
      'Albania': 800,
      'Bosnia and Herzegovina': 1000,
      'Bulgaria': 900,
      'Croatia': 2000,
      'Greece': 1800,
      'Kosovo': 700,
      'Montenegro': 1500,
      'North Macedonia': 800,
      'Romania': 1200,
      'Serbia': 1400,
      'Slovenia': 2500,
    };

    const typeMultiplier: Record<string, number> = {
      'apartment': 1,
      'house': 1.1,
      'villa': 1.5,
      'land': 0.3,
      'commercial': 1.3,
      'other': 0.9,
    };

    const conditionMultiplier: Record<string, number> = {
      'excellent': 1.2,
      'good': 1,
      'fair': 0.85,
      'needs-work': 0.7,
    };

    const sqft = parseInt(formData.sqft) || 100;
    const basePrice = basePricePerSqm[formData.country] || 1000;
    const typeMult = typeMultiplier[formData.propertyType] || 1;
    const condMult = conditionMultiplier[formData.condition] || 1;

    // Age factor
    const year = parseInt(formData.yearBuilt) || 2000;
    const age = new Date().getFullYear() - year;
    const ageMult = Math.max(0.7, 1 - (age * 0.005));

    const estimatedPrice = sqft * basePrice * typeMult * condMult * ageMult;

    return {
      min: Math.round(estimatedPrice * 0.85),
      max: Math.round(estimatedPrice * 1.15),
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));

    const estimate = calculateEstimate();
    setEstimatedValue(estimate);
    setIsSubmitted(true);
    setIsSubmitting(false);
  };

  const handleRequestExpert = () => {
    if (!state.isAuthenticated) {
      dispatch({ type: 'TOGGLE_AUTH_MODAL', payload: { isOpen: true } });
      return;
    }
    // Navigate to agents page
    dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'agents' });
    window.history.pushState({}, '', '/en/agents');
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
    }).format(price);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-50 to-white">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 text-white">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyem0wLTRoLTEydi0yaDEydjJ6bS0xMi0xMGgxMnYySDI0di0yem0xMiA2SDI0di0yaDEydjJ6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-30"></div>

        {/* Floating decorative elements */}
        <div className="absolute top-20 left-10 w-20 h-20 bg-white/10 rounded-full blur-xl"></div>
        <div className="absolute bottom-20 right-20 w-32 h-32 bg-teal-400/20 rounded-full blur-2xl"></div>
        <div className="absolute top-40 right-40 w-16 h-16 bg-emerald-300/10 rounded-full blur-lg"></div>

        <div className="max-w-6xl mx-auto px-4 py-16 md:py-24 relative">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 mb-6">
              <SparklesIcon className="w-5 h-5 text-emerald-300" />
              <span className="text-sm font-medium text-emerald-100">Free Instant Valuation</span>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
              How Much Is Your
              <br />
              <span className="text-emerald-300">Property Worth?</span>
            </h1>
            <p className="text-xl text-white/80 max-w-2xl mx-auto mb-8">
              Get an instant AI-powered estimate of your property's market value,
              backed by real data from across the Balkans
            </p>
            <div className="flex flex-wrap justify-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <CheckIcon className="w-5 h-5 text-emerald-300" />
                <span>100% Free</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckIcon className="w-5 h-5 text-emerald-300" />
                <span>Instant Results</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckIcon className="w-5 h-5 text-emerald-300" />
                <span>No Obligation</span>
              </div>
            </div>
          </div>
        </div>

        {/* Wave decoration */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 100V0C240 66 480 100 720 100C960 100 1200 66 1440 0V100H0Z" fill="#fafafa"/>
          </svg>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 -mt-8 relative z-10 pb-16">
        <div className="grid lg:grid-cols-5 gap-8">
          {/* Form Section */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-3xl shadow-xl p-6 md:p-8">
              {!isSubmitted ? (
                <>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                      <HomeIcon className="w-6 h-6 text-emerald-600" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-neutral-800">Property Details</h2>
                      <p className="text-sm text-neutral-500">Enter your property information for an estimate</p>
                    </div>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Location */}
                    <div className="space-y-4">
                      <h3 className="font-semibold text-neutral-700 flex items-center gap-2">
                        <LocationIcon className="w-5 h-5 text-emerald-500" />
                        Location
                      </h3>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-neutral-600 mb-1">Country *</label>
                          <select
                            name="country"
                            value={formData.country}
                            onChange={handleInputChange}
                            required
                            className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                          >
                            <option value="">Select country</option>
                            {countries.map(c => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-neutral-600 mb-1">City *</label>
                          <input
                            type="text"
                            name="city"
                            value={formData.city}
                            onChange={handleInputChange}
                            required
                            placeholder="e.g., Belgrade, Tirana"
                            className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-neutral-600 mb-1">Address</label>
                        <input
                          type="text"
                          name="address"
                          value={formData.address}
                          onChange={handleInputChange}
                          placeholder="Street address (optional)"
                          className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                        />
                      </div>
                    </div>

                    {/* Property Details */}
                    <div className="space-y-4">
                      <h3 className="font-semibold text-neutral-700 flex items-center gap-2">
                        <BuildingIcon className="w-5 h-5 text-emerald-500" />
                        Property Information
                      </h3>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-neutral-600 mb-1">Property Type *</label>
                          <select
                            name="propertyType"
                            value={formData.propertyType}
                            onChange={handleInputChange}
                            required
                            className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                          >
                            <option value="">Select type</option>
                            {propertyTypes.map(t => (
                              <option key={t.value} value={t.value}>{t.label}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-neutral-600 mb-1">Size (m²) *</label>
                          <input
                            type="number"
                            name="sqft"
                            value={formData.sqft}
                            onChange={handleInputChange}
                            required
                            placeholder="e.g., 85"
                            className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-neutral-600 mb-1">Bedrooms</label>
                          <input
                            type="number"
                            name="bedrooms"
                            value={formData.bedrooms}
                            onChange={handleInputChange}
                            placeholder="0"
                            min="0"
                            className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-neutral-600 mb-1">Bathrooms</label>
                          <input
                            type="number"
                            name="bathrooms"
                            value={formData.bathrooms}
                            onChange={handleInputChange}
                            placeholder="0"
                            min="0"
                            className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-neutral-600 mb-1">Year Built</label>
                          <input
                            type="number"
                            name="yearBuilt"
                            value={formData.yearBuilt}
                            onChange={handleInputChange}
                            placeholder="e.g., 2010"
                            min="1900"
                            max={new Date().getFullYear()}
                            className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-neutral-600 mb-2">Condition</label>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          {[
                            { value: 'excellent', label: 'Excellent', emoji: '✨' },
                            { value: 'good', label: 'Good', emoji: '👍' },
                            { value: 'fair', label: 'Fair', emoji: '👌' },
                            { value: 'needs-work', label: 'Needs Work', emoji: '🔧' },
                          ].map(cond => (
                            <button
                              key={cond.value}
                              type="button"
                              onClick={() => setFormData(prev => ({ ...prev, condition: cond.value }))}
                              className={`px-4 py-3 rounded-xl border-2 transition-all text-sm font-medium ${
                                formData.condition === cond.value
                                  ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                                  : 'border-neutral-200 text-neutral-600 hover:border-neutral-300'
                              }`}
                            >
                              <span className="mr-1">{cond.emoji}</span> {cond.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Contact Info (Optional) */}
                    <div className="space-y-4 pt-4 border-t border-neutral-100">
                      <h3 className="font-semibold text-neutral-700">Contact Information (Optional)</h3>
                      <p className="text-sm text-neutral-500">Leave your details if you'd like an expert to contact you</p>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-neutral-600 mb-1">Name</label>
                          <input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleInputChange}
                            placeholder="Your name"
                            className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-neutral-600 mb-1">Email</label>
                          <input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleInputChange}
                            placeholder="your@email.com"
                            className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                          />
                        </div>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold rounded-xl hover:from-emerald-700 hover:to-teal-700 transition-all shadow-lg shadow-emerald-500/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                          Calculating...
                        </>
                      ) : (
                        <>
                          Get Free Valuation
                          <ArrowRightIcon className="w-5 h-5" />
                        </>
                      )}
                    </button>
                  </form>
                </>
              ) : (
                /* Results View */
                <div className="text-center py-8">
                  <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CurrencyIcon className="w-10 h-10 text-emerald-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-neutral-800 mb-2">Estimated Property Value</h2>
                  <p className="text-neutral-500 mb-8">Based on current market data in {formData.city}, {formData.country}</p>

                  {estimatedValue && (
                    <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl p-8 mb-8">
                      <div className="text-5xl font-bold text-emerald-600 mb-2">
                        {formatPrice(estimatedValue.min)} - {formatPrice(estimatedValue.max)}
                      </div>
                      <p className="text-neutral-600">Market Value Range</p>
                    </div>
                  )}

                  <div className="grid md:grid-cols-3 gap-4 mb-8 text-left">
                    <div className="bg-neutral-50 rounded-xl p-4">
                      <p className="text-sm text-neutral-500">Property Type</p>
                      <p className="font-semibold text-neutral-800 capitalize">{formData.propertyType}</p>
                    </div>
                    <div className="bg-neutral-50 rounded-xl p-4">
                      <p className="text-sm text-neutral-500">Size</p>
                      <p className="font-semibold text-neutral-800">{formData.sqft} m²</p>
                    </div>
                    <div className="bg-neutral-50 rounded-xl p-4">
                      <p className="text-sm text-neutral-500">Condition</p>
                      <p className="font-semibold text-neutral-800 capitalize">{formData.condition.replace('-', ' ')}</p>
                    </div>
                  </div>

                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-8">
                    <p className="text-sm text-amber-800">
                      <strong>Note:</strong> This is an automated estimate based on market averages. For an accurate valuation, we recommend consulting with a local real estate expert.
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-4">
                    <button
                      onClick={handleRequestExpert}
                      className="flex-1 py-3 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-700 transition-colors"
                    >
                      Get Expert Valuation
                    </button>
                    <button
                      onClick={() => {
                        setIsSubmitted(false);
                        setEstimatedValue(null);
                        setFormData({
                          address: '', city: '', country: '', propertyType: '',
                          bedrooms: '', bathrooms: '', sqft: '', yearBuilt: '',
                          condition: 'good', email: '', phone: '', name: '',
                        });
                      }}
                      className="flex-1 py-3 border border-neutral-200 text-neutral-700 font-semibold rounded-xl hover:bg-neutral-50 transition-colors"
                    >
                      New Valuation
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-2 space-y-6">
            {/* Why Valuation */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="font-bold text-neutral-800 mb-4">Why Get a Valuation?</h3>
              <div className="space-y-4">
                {[
                  { icon: ChartIcon, title: 'Know Your Worth', desc: 'Understand your property\'s market value before selling' },
                  { icon: ShieldIcon, title: 'Make Informed Decisions', desc: 'Price your property competitively based on data' },
                  { icon: ClockIcon, title: 'Save Time', desc: 'Get instant results without waiting for an appraiser' },
                ].map((item, idx) => {
                  const Icon = item.icon;
                  return (
                    <div key={idx} className="flex gap-4">
                      <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Icon className="w-5 h-5 text-emerald-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-neutral-800 text-sm">{item.title}</h4>
                        <p className="text-xs text-neutral-500">{item.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Trust Indicators */}
            <div className="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-2xl shadow-lg p-6 text-white">
              <h3 className="font-bold mb-4">Trusted by Thousands</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-white/10 rounded-xl">
                  <div className="text-3xl font-bold">50K+</div>
                  <div className="text-xs text-emerald-200">Properties Valued</div>
                </div>
                <div className="text-center p-4 bg-white/10 rounded-xl">
                  <div className="text-3xl font-bold">11</div>
                  <div className="text-xs text-emerald-200">Countries Covered</div>
                </div>
                <div className="text-center p-4 bg-white/10 rounded-xl">
                  <div className="text-3xl font-bold">95%</div>
                  <div className="text-xs text-emerald-200">Accuracy Rate</div>
                </div>
                <div className="text-center p-4 bg-white/10 rounded-xl">
                  <div className="text-3xl font-bold">Free</div>
                  <div className="text-xs text-emerald-200">Always Free</div>
                </div>
              </div>
            </div>

            {/* Expert CTA */}
            <div className="bg-neutral-50 rounded-2xl p-6 border border-neutral-200">
              <h3 className="font-bold text-neutral-800 mb-2">Need a Professional Opinion?</h3>
              <p className="text-sm text-neutral-600 mb-4">
                Connect with verified local agents for an in-depth property appraisal.
              </p>
              <button
                onClick={handleRequestExpert}
                className="w-full py-3 bg-neutral-800 text-white font-medium rounded-xl hover:bg-neutral-900 transition-colors text-sm"
              >
                Find Local Experts
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* How It Works Section */}
      <div className="bg-neutral-50 py-16">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-neutral-800 mb-4">How Our Valuation Works</h2>
            <p className="text-neutral-600 max-w-2xl mx-auto">
              Our AI-powered valuation tool analyzes thousands of data points to give you an accurate estimate
            </p>
          </div>
          <div className="grid md:grid-cols-4 gap-8">
            {[
              { step: '1', title: 'Enter Details', desc: 'Provide basic information about your property', icon: HomeIcon },
              { step: '2', title: 'AI Analysis', desc: 'Our algorithm compares with similar properties', icon: ChartIcon },
              { step: '3', title: 'Get Results', desc: 'Receive your estimated value range instantly', icon: CurrencyIcon },
              { step: '4', title: 'Take Action', desc: 'List your property or consult an expert', icon: ArrowRightIcon },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.step} className="text-center">
                  <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4 relative">
                    <Icon className="w-8 h-8 text-emerald-600" />
                    <div className="absolute -top-2 -right-2 w-7 h-7 bg-emerald-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                      {item.step}
                    </div>
                  </div>
                  <h3 className="font-semibold text-neutral-800 mb-2">{item.title}</h3>
                  <p className="text-sm text-neutral-500">{item.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-700 py-16">
        <div className="max-w-4xl mx-auto px-4 text-center text-white">
          <h2 className="text-3xl font-bold mb-4">Ready to Sell Your Property?</h2>
          <p className="text-lg text-white/80 mb-8">
            List your property on Balkan Estate and reach thousands of potential buyers
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <button
              onClick={() => {
                dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'create-listing' });
                window.history.pushState({}, '', '/en/create-listing');
              }}
              className="px-8 py-3 bg-white text-emerald-700 font-semibold rounded-xl hover:bg-neutral-100 transition-colors"
            >
              List Your Property
            </button>
            <button
              onClick={() => {
                dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'search' });
                window.history.pushState({}, '', '/en/');
              }}
              className="px-8 py-3 bg-white/20 text-white font-semibold rounded-xl hover:bg-white/30 transition-colors border border-white/30"
            >
              Browse Properties
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default ValuationPage;
