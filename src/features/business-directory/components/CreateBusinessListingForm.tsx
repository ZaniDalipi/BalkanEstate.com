import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useCreateBusinessListing } from '../hooks';
import { BUSINESS_CATEGORIES, type BusinessCategory, type CreateBusinessListingData } from '@/src/shared/types/businessListing.types';

interface CreateBusinessListingFormProps {
  onBack: () => void;
  onSuccess: () => void;
}

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;

const CreateBusinessListingForm: React.FC<CreateBusinessListingFormProps> = ({ onBack, onSuccess }) => {
  const { t } = useTranslation('businessDirectory');
  const { createListing, isLoading, error } = useCreateBusinessListing();

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

    // Client-side validation
    if (!formData.name.trim()) {
      setFormError(t('form.errors.nameRequired'));
      return;
    }
    if (!formData.category) {
      setFormError(t('form.errors.categoryRequired'));
      return;
    }
    if (!formData.contactPhone.trim()) {
      setFormError(t('form.errors.phoneRequired'));
      return;
    }
    if (!formData.city.trim()) {
      setFormError(t('form.errors.cityRequired'));
      return;
    }
    if (!formData.country.trim()) {
      setFormError(t('form.errors.countryRequired'));
      return;
    }

    try {
      // Clean up empty optional fields
      const cleanData: CreateBusinessListingData = {
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

      // Only include social media if any field is filled
      const social = formData.socialMedia;
      if (social?.facebook || social?.instagram || social?.linkedin) {
        cleanData.socialMedia = {
          ...(social.facebook && { facebook: social.facebook }),
          ...(social.instagram && { instagram: social.instagram }),
          ...(social.linkedin && { linkedin: social.linkedin }),
        };
      }

      // Only include business hours if any field is filled
      const hours = formData.businessHours;
      if (hours && Object.values(hours).some(Boolean)) {
        cleanData.businessHours = hours;
      }

      await createListing(cleanData);
      onSuccess();
    } catch (err: any) {
      setFormError(err?.message || t('form.errors.generic'));
    }
  }, [formData, createListing, onSuccess, t]);

  const displayError = formError || (error as Error)?.message;

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Back button */}
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1 text-sm text-neutral-500 hover:text-primary font-medium mb-6 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          {t('detail.backToDirectory')}
        </button>

        <h1 className="text-2xl font-bold text-neutral-900 mb-6">{t('form.title')}</h1>

        {displayError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
            {displayError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic info section */}
          <div className="bg-white rounded-2xl border border-neutral-200 p-6 space-y-4">
            <h2 className="text-lg font-semibold text-neutral-900">{t('form.sections.basicInfo')}</h2>

            {/* Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-neutral-700 mb-1">
                {t('form.fields.name')} <span className="text-red-500">*</span>
              </label>
              <input
                id="name"
                name="name"
                type="text"
                value={formData.name}
                onChange={handleChange}
                maxLength={100}
                className="w-full px-4 py-2.5 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                placeholder={t('form.placeholders.name')}
              />
            </div>

            {/* Category */}
            <div>
              <label htmlFor="category" className="block text-sm font-medium text-neutral-700 mb-1">
                {t('form.fields.category')} <span className="text-red-500">*</span>
              </label>
              <select
                id="category"
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="w-full px-4 py-2.5 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors bg-white"
              >
                <option value="">{t('form.placeholders.category')}</option>
                {BUSINESS_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {t(`categories.${cat}`)}
                  </option>
                ))}
              </select>
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
                      className="inline-flex items-center gap-1 px-3 py-1 bg-primary/10 text-primary rounded-lg text-sm"
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

          {/* Contact info section */}
          <div className="bg-white rounded-2xl border border-neutral-200 p-6 space-y-4">
            <h2 className="text-lg font-semibold text-neutral-900">{t('form.sections.contact')}</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Phone */}
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

              {/* Email */}
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

            {/* Website */}
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

          {/* Location section */}
          <div className="bg-white rounded-2xl border border-neutral-200 p-6 space-y-4">
            <h2 className="text-lg font-semibold text-neutral-900">{t('form.sections.location')}</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* City */}
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

              {/* Country */}
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
          </div>

          {/* Social media section */}
          <div className="bg-white rounded-2xl border border-neutral-200 p-6 space-y-4">
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

          {/* Business hours section (collapsible) */}
          <div className="bg-white rounded-2xl border border-neutral-200 p-6">
            <button
              type="button"
              onClick={() => setShowHours(!showHours)}
              className="flex items-center justify-between w-full text-lg font-semibold text-neutral-900"
            >
              {t('form.sections.hours')}
              <svg
                className={`w-5 h-5 text-neutral-400 transition-transform ${showHours ? 'rotate-180' : ''}`}
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

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-primary text-white font-semibold rounded-xl hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? t('form.submitting') : t('form.submit')}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreateBusinessListingForm;
