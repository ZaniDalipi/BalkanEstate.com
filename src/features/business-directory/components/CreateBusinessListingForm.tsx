import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useCreateBusinessListing } from '../hooks';
import { BUSINESS_CATEGORIES, type BusinessCategory, type CreateBusinessListingData, type ListingType } from '@/src/shared/types/businessListing.types';
import { Animated } from '@/src/components/ui/Animations';
import { BuildingStorefrontIcon, UserIcon } from '@/constants';

interface CreateBusinessListingFormProps {
  onBack: () => void;
  onSuccess: () => void;
}

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
  const { createListing, isLoading, error } = useCreateBusinessListing();

  const [listingType, setListingType] = useState<ListingType>('business');
  const [formData, setFormData] = useState<CreateBusinessListingData>({
    name: '',
    description: '',
    category: '' as BusinessCategory,
    services: [],
    contactPhone: '',
    contactEmail: '',
    website: '',
    address: '',
    city: '',
    country: '',
    socialMedia: { facebook: '', instagram: '', linkedin: '' },
    businessHours: {},
  });

  const [serviceInput, setServiceInput] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [showHours, setShowHours] = useState(false);

  const handleChange = useCallback((
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setFormError(null);
  }, []);

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

  const handleServiceKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addService();
    }
  }, [addService]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.name.trim()) { setFormError(t('form.errors.nameRequired')); return; }
    if (!formData.category) { setFormError(t('form.errors.categoryRequired')); return; }
    if (!formData.contactPhone.trim()) { setFormError(t('form.errors.phoneRequired')); return; }
    if (!formData.city.trim()) { setFormError(t('form.errors.cityRequired')); return; }
    if (!formData.country.trim()) { setFormError(t('form.errors.countryRequired')); return; }

    try {
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

      await createListing(cleanData);
      onSuccess();
    } catch (err: any) {
      setFormError(err?.message || t('form.errors.generic'));
    }
  }, [formData, listingType, createListing, onSuccess, t]);

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
        {displayError && (
          <Animated variant="scaleIn">
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
              {displayError}
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
                  id="name"
                  name="name"
                  type="text"
                  value={formData.name}
                  onChange={handleChange}
                  maxLength={100}
                  className="w-full px-4 py-2.5 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                  placeholder={listingType === 'individual' ? t('form.placeholders.fullName') : t('form.placeholders.name')}
                />
              </div>

              {/* Category grid */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  {t('form.fields.category')} <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {BUSINESS_CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => { setFormData(prev => ({ ...prev, category: cat })); setFormError(null); }}
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
                    id="contactPhone"
                    name="contactPhone"
                    type="tel"
                    value={formData.contactPhone}
                    onChange={handleChange}
                    maxLength={30}
                    className="w-full px-4 py-2.5 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                    placeholder={t('form.placeholders.phone')}
                  />
                </div>
                <div>
                  <label htmlFor="contactEmail" className="block text-sm font-medium text-neutral-700 mb-1">
                    {t('form.fields.email')}
                  </label>
                  <input
                    id="contactEmail"
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
                <label htmlFor="website" className="block text-sm font-medium text-neutral-700 mb-1">
                  {t('form.fields.website')}
                </label>
                <input
                  id="website"
                  name="website"
                  type="url"
                  value={formData.website}
                  onChange={handleChange}
                  maxLength={200}
                  className="w-full px-4 py-2.5 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                  placeholder={t('form.placeholders.website')}
                />
              </div>
            </div>
          </Animated>

          {/* Location */}
          <Animated variant="fadeInUp" delay={150}>
            <div className="bg-white rounded-2xl border border-neutral-200 p-6 shadow-sm space-y-4">
              <h2 className="text-lg font-semibold text-neutral-900">{t('form.sections.location')}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="city" className="block text-sm font-medium text-neutral-700 mb-1">
                    {t('form.fields.city')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="city"
                    name="city"
                    type="text"
                    value={formData.city}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                    placeholder={t('form.placeholders.city')}
                  />
                </div>
                <div>
                  <label htmlFor="country" className="block text-sm font-medium text-neutral-700 mb-1">
                    {t('form.fields.country')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="country"
                    name="country"
                    type="text"
                    value={formData.country}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                    placeholder={t('form.placeholders.country')}
                  />
                </div>
              </div>
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

          {/* Submit */}
          <Animated variant="fadeInUp" delay={300}>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 bg-gradient-to-r from-primary to-blue-600 text-white font-bold rounded-xl hover:shadow-lg hover:shadow-primary/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.99] text-base"
            >
              {isLoading ? t('form.submitting') : t('form.submit')}
            </button>
          </Animated>
        </form>
      </div>
    </div>
  );
};

export default CreateBusinessListingForm;
