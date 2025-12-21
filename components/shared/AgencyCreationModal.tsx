import React, { useState, useEffect } from 'react';
import Modal from '../shared/Modal';
import { BuildingOfficeIcon, CheckCircleIcon } from '../../constants';
import { useAppContext } from '../../context/AppContext';
import { BALKAN_LOCATIONS } from '../../utils/balkanLocations';

// Common languages spoken in the Balkan region
const BALKAN_LANGUAGES = [
  'English', 'Serbian', 'Croatian', 'Slovenian', 'Bosnian', 'Macedonian',
  'Albanian', 'Montenegrin', 'Bulgarian', 'Romanian', 'Greek', 'Turkish',
  'Hungarian', 'German', 'Italian', 'French', 'Russian', 'Spanish'
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
  const { state, dispatch } = useAppContext();
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');
  const [availableCities, setAvailableCities] = useState<string[]>([]);
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

  // Auto-populate form with user data when modal opens
  useEffect(() => {
    if (isOpen && state.currentUser) {
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
  }, [isOpen, state.currentUser]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!formData.name.trim()) {
      setError('Agency name is required');
      return;
    }
    if (!formData.city.trim() || !formData.country.trim()) {
      setError('City and country are required');
      return;
    }
    if (!formData.email.trim()) {
      setError('Email is required');
      return;
    }

    // Prepare data with yearsInBusiness as a number
    const agencyData = {
      ...formData,
      yearsInBusiness: formData.yearsInBusiness ? parseInt(formData.yearsInBusiness) : undefined,
    };

    // Save agency data to context (will be created after payment)
    dispatch({ type: 'SET_PENDING_AGENCY_DATA', payload: agencyData });

    // Close this modal
    onClose();

    // Open pricing modal for Enterprise plan (agency creation mode)
    dispatch({ type: 'TOGGLE_PRICING_MODAL', payload: { isOpen: true, isOffer: false, isAgencyMode: true } });
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
          <h2 className="text-2xl font-bold text-neutral-800 mb-2">Create Your Agency</h2>
          <p className="text-sm text-neutral-600">
            Set up your agency profile to showcase your team and properties
          </p>
        </div>

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
              Basic Information
            </h3>

            {/* Agency Name */}
            <div className="mb-4">
              <label htmlFor="name" className={labelClasses}>
                Agency Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="e.g., Premier Real Estate Agency"
                className={inputClasses}
                required
                disabled={isCreating}
              />
              <p className="text-xs text-neutral-500 mt-1">Choose a professional name that represents your brand</p>
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className={labelClasses}>
                Description
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Tell potential clients about your agency, your expertise, and what makes you unique..."
                rows={3}
                className={inputClasses}
                disabled={isCreating}
              />
              <p className="text-xs text-neutral-500 mt-1">A compelling description helps clients understand your value</p>
            </div>
          </div>

          {/* Location Section */}
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-5 rounded-xl border border-blue-200">
            <h3 className="text-base font-bold text-neutral-800 mb-4 flex items-center gap-2">
              <span className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-bold">2</span>
              Location
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label htmlFor="country" className={labelClasses}>
                  Country <span className="text-red-500">*</span>
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
                  <option value="">🌍 Select a country</option>
                  {BALKAN_LOCATIONS.map((country) => (
                    <option key={country.code} value={country.name}>
                      {country.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="city" className={labelClasses}>
                  City <span className="text-red-500">*</span>
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
                    {formData.country ? '🏙️ Select a city' : '⚠️ Select country first'}
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
                Street Address
              </label>
              <input
                type="text"
                id="address"
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                placeholder="e.g., 123 Main Street, Building A"
                className={inputClasses}
                disabled={isCreating}
              />
              <p className="text-xs text-neutral-500 mt-1">Optional: Full street address for office location</p>
            </div>
          </div>

          {/* Contact Information Section */}
          <div className="bg-gradient-to-r from-green-50 to-green-100 p-5 rounded-xl border border-green-200">
            <h3 className="text-base font-bold text-neutral-800 mb-4 flex items-center gap-2">
              <span className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center text-white text-sm font-bold">3</span>
              Contact Information
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label htmlFor="email" className={labelClasses}>
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="📧 contact@agency.com"
                  className={inputClasses}
                  required
                  disabled={isCreating}
                />
                <p className="text-xs text-neutral-500 mt-1">Primary contact email for inquiries</p>
              </div>
              <div>
                <label htmlFor="phone" className={labelClasses}>
                  Phone Number
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="📞 +381 11 123 4567"
                  className={inputClasses}
                  disabled={isCreating}
                />
                <p className="text-xs text-neutral-500 mt-1">Include country code</p>
              </div>
            </div>

            {/* Website */}
            <div>
              <label htmlFor="website" className={labelClasses}>
                Website URL
              </label>
              <input
                type="url"
                id="website"
                name="website"
                value={formData.website}
                onChange={handleInputChange}
                placeholder="🌐 https://yourwebsite.com"
                className={inputClasses}
                disabled={isCreating}
              />
              <p className="text-xs text-neutral-500 mt-1">Optional: Your agency's website</p>
            </div>
          </div>

          {/* Professional Details Section */}
          <div className="bg-gradient-to-r from-amber-50 to-amber-100 p-5 rounded-xl border border-amber-200">
            <h3 className="text-base font-bold text-neutral-800 mb-4 flex items-center gap-2">
              <span className="w-8 h-8 bg-amber-600 rounded-full flex items-center justify-center text-white text-sm font-bold">4</span>
              Professional Details
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* License Number */}
              <div>
                <label htmlFor="licenseNumber" className={labelClasses}>
                  Agent License Number
                </label>
                <input
                  type="text"
                  id="licenseNumber"
                  name="licenseNumber"
                  value={formData.licenseNumber}
                  onChange={handleInputChange}
                  placeholder="e.g., RE-123456"
                  className={inputClasses}
                  disabled={isCreating}
                />
                <p className="text-xs text-neutral-500 mt-1">Required for agency registration</p>
              </div>

              {/* Years in Business */}
              <div>
                <label htmlFor="yearsInBusiness" className={labelClasses}>
                  Years in Business
                </label>
                <input
                  type="number"
                  id="yearsInBusiness"
                  name="yearsInBusiness"
                  value={formData.yearsInBusiness}
                  onChange={handleInputChange}
                  placeholder="e.g., 5"
                  min="0"
                  max="100"
                  className={inputClasses}
                  disabled={isCreating}
                />
                <p className="text-xs text-neutral-500 mt-1">How long you've been in real estate</p>
              </div>
            </div>

            {/* Languages */}
            <div className="mt-4">
              <label className={labelClasses}>
                Languages Spoken
              </label>
              <div className="flex flex-wrap gap-2">
                {BALKAN_LANGUAGES.map((language) => (
                  <button
                    key={language}
                    type="button"
                    onClick={() => handleLanguageToggle(language)}
                    disabled={isCreating}
                    className={`px-3 py-1.5 text-sm rounded-full border transition-all ${
                      formData.languages.includes(language)
                        ? 'bg-amber-500 text-white border-amber-500'
                        : 'bg-white text-neutral-600 border-neutral-300 hover:border-amber-400'
                    } disabled:opacity-50`}
                  >
                    {language}
                  </button>
                ))}
              </div>
              <p className="text-xs text-neutral-500 mt-2">Select languages your team can communicate in</p>
            </div>
          </div>

          {/* Social Media Links */}
          <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-5 rounded-xl border border-purple-200">
            <h3 className="text-base font-bold text-neutral-800 mb-4 flex items-center gap-2">
              <span className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-white text-sm font-bold">5</span>
              Social Media (Optional)
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="facebookUrl" className={labelClasses}>
                  Facebook
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
                  Instagram
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
                  LinkedIn
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
            <p className="text-xs text-neutral-500 mt-3">Connect your social profiles to increase visibility</p>
          </div>

          {/* Business Hours */}
          <div className="bg-gradient-to-r from-indigo-50 to-indigo-100 p-5 rounded-xl border border-indigo-200">
            <h3 className="text-base font-bold text-neutral-800 mb-4 flex items-center gap-2">
              <span className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center text-white text-sm font-bold">6</span>
              Business Hours (Optional)
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => (
                <div key={day}>
                  <label htmlFor={day} className={labelClasses}>
                    {day.charAt(0).toUpperCase() + day.slice(1)}
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
            <p className="text-xs text-neutral-500 mt-3">Let clients know when you're available</p>
          </div>

          {/* Info Box */}
          <div className="bg-gradient-to-br from-blue-50 via-blue-100 to-cyan-100 border-2 border-blue-300 rounded-xl p-6 shadow-sm">
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <CheckCircleIcon className="w-10 h-10 text-blue-600" />
              </div>
              <div className="flex-1">
                <h4 className="text-base font-bold text-blue-900 mb-3">🎉 What You'll Get</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div className="flex items-start gap-2">
                    <span className="text-blue-600 font-bold">✓</span>
                    <p className="text-sm text-blue-800">Dedicated agency page on platform</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-blue-600 font-bold">✓</span>
                    <p className="text-sm text-blue-800">Display all agents & properties</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-blue-600 font-bold">✓</span>
                    <p className="text-sm text-blue-800">Featured in homepage ads</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-blue-600 font-bold">✓</span>
                    <p className="text-sm text-blue-800">Full contact info displayed</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-blue-600 font-bold">✓</span>
                    <p className="text-sm text-blue-800">Unique invitation code for agents</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-blue-600 font-bold">✓</span>
                    <p className="text-sm text-blue-800">Priority customer support</p>
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
              Cancel
            </button>
            <button
              type="submit"
              disabled={isCreating}
              className="flex-1 py-3.5 px-6 bg-gradient-to-r from-amber-500 via-amber-600 to-orange-600 text-white rounded-xl font-bold hover:from-amber-600 hover:via-amber-700 hover:to-orange-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isCreating ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <span>Continue to Payment</span>
                  <span className="text-xl">→</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
};

export default AgencyCreationModal;
