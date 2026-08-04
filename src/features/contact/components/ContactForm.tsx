/**
 * ContactForm Component
 * Glass-styled contact form with floating labels and validation
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import type { ContactFormData, ContactFormErrors } from '../types';
import PhoneInput from '@/src/shared/components/ui/PhoneInput';

interface ContactFormProps {
  formData: ContactFormData;
  errors: ContactFormErrors;
  isSubmitting: boolean;
  submitError: string | null;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  onPhoneChange?: (fullPhone: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  /** Advertising creative upload (only used when subject === 'advertising'). */
  onAdImageSelect?: (file: File) => void;
  onAdImageClear?: () => void;
  isAdImageUploading?: boolean;
}

const AD_PAGE_OPTIONS = [
  { value: 'all', label: 'All pages' },
  { value: 'home', label: 'Home' },
  { value: 'search', label: 'Search results' },
  { value: 'rentals', label: 'Rentals' },
  { value: 'property-details', label: 'Property details' },
  { value: 'agents', label: 'Agents' },
  { value: 'agencies', label: 'Agencies' },
  { value: 'business-directory', label: 'Business directory' },
  { value: 'blog', label: 'Blog' },
  { value: 'guides', label: 'Guides' },
];

const AD_PLACEMENT_OPTIONS = [
  { value: 'in-content', label: 'In content (leaderboard)' },
  { value: 'sidebar', label: 'Sidebar (skyscraper)' },
  { value: 'sticky-bottom', label: 'Sticky bottom bar' },
  { value: 'sticky-top', label: 'Sticky top bar' },
  { value: 'header', label: 'Header' },
  { value: 'footer', label: 'Footer' },
];

const SUBJECT_OPTIONS = [
  { value: 'general', labelKey: 'contact:subjects.general' },
  { value: 'buying', labelKey: 'contact:subjects.buying' },
  { value: 'selling', labelKey: 'contact:subjects.selling' },
  { value: 'agency', labelKey: 'contact:subjects.agency' },
  { value: 'support', labelKey: 'contact:subjects.support' },
  { value: 'partnership', labelKey: 'contact:subjects.partnership' },
  { value: 'advertising', labelKey: 'contact:subjects.advertising', fallback: 'Advertising / Ad placement' },
] as const;

const ContactForm: React.FC<ContactFormProps> = ({
  formData,
  errors,
  isSubmitting,
  submitError,
  onChange,
  onPhoneChange = () => {},
  onSubmit,
  onAdImageSelect,
  onAdImageClear,
  isAdImageUploading = false,
}) => {
  const { t } = useTranslation(['contact', 'common']);
  const isAdvertising = formData.subject === 'advertising';

  const inputClasses =
    'block px-4 pb-2.5 pt-4 w-full text-base text-neutral-900 glass-input rounded-xl appearance-none focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 peer transition-all duration-300';
  const labelClasses =
    'absolute text-sm text-neutral-500 duration-300 transform -translate-y-4 scale-75 top-2 z-10 origin-[0] bg-white/70 backdrop-blur-sm px-2 peer-focus:px-2 peer-focus:text-primary peer-placeholder-shown:scale-100 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:top-1/2 peer-focus:top-2 peer-focus:scale-75 peer-focus:-translate-y-4 start-3 rounded-md';
  const errorClasses = 'text-xs text-red-500 mt-1 ml-1';

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      {submitError && (
        <div className="p-3 bg-red-50/80 backdrop-blur-sm border border-red-200/60 rounded-xl" role="alert">
          <p className="text-red-700 text-sm">{submitError}</p>
        </div>
      )}

      {/* Name */}
      <div className="relative">
        <input
          type="text"
          id="contact-name"
          name="name"
          value={formData.name}
          onChange={onChange}
          className={`${inputClasses} ${errors.name ? 'border-red-300 focus:ring-red-200' : ''}`}
          placeholder=" "
          autoComplete="name"
          aria-invalid={!!errors.name}
          aria-describedby={errors.name ? 'name-error' : undefined}
        />
        <label htmlFor="contact-name" className={labelClasses}>
          {t('contact:form.name', 'Full Name')} *
        </label>
        {errors.name && (
          <p id="name-error" className={errorClasses}>{errors.name}</p>
        )}
      </div>

      {/* Email */}
      <div className="relative">
        <input
          type="email"
          id="contact-email"
          name="email"
          value={formData.email}
          onChange={onChange}
          className={`${inputClasses} ${errors.email ? 'border-red-300 focus:ring-red-200' : ''}`}
          placeholder=" "
          autoComplete="email"
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? 'email-error' : undefined}
        />
        <label htmlFor="contact-email" className={labelClasses}>
          {t('contact:form.email', 'Email Address')} *
        </label>
        {errors.email && (
          <p id="email-error" className={errorClasses}>{errors.email}</p>
        )}
      </div>

      {/* Phone (optional) */}
      <div>
        <label className="block text-sm font-medium text-neutral-600 mb-1.5">
          {t('contact:form.phone', 'Phone (optional)')}
        </label>
        <PhoneInput
          value={formData.phone}
          onChange={onPhoneChange}
          error={errors.phone}
          disabled={isSubmitting}
        />
        {errors.phone && (
          <p id="phone-error" className={errorClasses}>{errors.phone}</p>
        )}
      </div>

      {/* Subject */}
      <div className="relative">
        <select
          id="contact-subject"
          name="subject"
          value={formData.subject}
          onChange={onChange}
          className={`${inputClasses} ${errors.subject ? 'border-red-300 focus:ring-red-200' : ''}`}
          aria-invalid={!!errors.subject}
          aria-describedby={errors.subject ? 'subject-error' : undefined}
        >
          {SUBJECT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {t(option.labelKey, (option as { fallback?: string }).fallback ?? option.value)}
            </option>
          ))}
        </select>
        <label htmlFor="contact-subject" className="absolute text-sm text-neutral-500 duration-300 transform -translate-y-4 scale-75 top-2 z-10 origin-[0] bg-white/70 backdrop-blur-sm px-2 start-3 rounded-md">
          {t('contact:form.subject', 'Subject')} *
        </label>
        {errors.subject && (
          <p id="subject-error" className={errorClasses}>{errors.subject}</p>
        )}
      </div>

      {/* Advertising details — only when the subject is "advertising" */}
      {isAdvertising && (
        <div className="rounded-2xl border border-indigo-200 bg-indigo-50/60 p-4 space-y-4">
          <p className="text-sm font-semibold text-indigo-900">
            {t('contact:advertising.heading', 'Where would you like your ad?')}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="ad-page" className="block text-xs font-medium text-indigo-900 mb-1">
                {t('contact:advertising.page', 'Page')}
              </label>
              <select
                id="ad-page"
                name="adPage"
                value={formData.adPage || 'all'}
                onChange={onChange}
                className="w-full px-3 py-2.5 rounded-xl border border-indigo-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              >
                {AD_PAGE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="ad-placement" className="block text-xs font-medium text-indigo-900 mb-1">
                {t('contact:advertising.placement', 'Placement')}
              </label>
              <select
                id="ad-placement"
                name="adPlacement"
                value={formData.adPlacement || 'in-content'}
                onChange={onChange}
                className="w-full px-3 py-2.5 rounded-xl border border-indigo-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              >
                {AD_PLACEMENT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Creative upload */}
          <div>
            <label className="block text-xs font-medium text-indigo-900 mb-1">
              {t('contact:advertising.creative', 'Attach your ad image (optional)')}
            </label>
            <div className="flex items-center gap-3 flex-wrap">
              {formData.adImageUrl ? (
                <div className="relative">
                  <img
                    src={formData.adImageUrl}
                    alt="ad creative preview"
                    className="h-20 rounded-lg border border-indigo-200 object-contain bg-white"
                  />
                  {onAdImageClear && (
                    <button
                      type="button"
                      onClick={onAdImageClear}
                      className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 text-white text-xs flex items-center justify-center shadow"
                      aria-label={t('contact:advertising.removeImage', 'Remove image')}
                    >
                      ✕
                    </button>
                  )}
                </div>
              ) : null}
              <label className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-indigo-300 text-indigo-700 rounded-lg cursor-pointer hover:bg-indigo-50 text-sm font-medium">
                {isAdImageUploading
                  ? t('contact:advertising.uploading', 'Uploading…')
                  : formData.adImageUrl
                  ? t('contact:advertising.replaceImage', 'Replace image')
                  : t('contact:advertising.uploadImage', 'Upload image')}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={isAdImageUploading}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file && onAdImageSelect) onAdImageSelect(file);
                    e.target.value = '';
                  }}
                />
              </label>
            </div>
            <p className="text-xs text-indigo-700/70 mt-1.5">
              {t('contact:advertising.creativeHint', 'PNG or JPG, max 5MB. This helps us place your ad exactly where you want it.')}
            </p>
          </div>
        </div>
      )}

      {/* Message */}
      <div className="relative">
        <textarea
          id="contact-message"
          name="message"
          value={formData.message}
          onChange={onChange}
          rows={5}
          className={`${inputClasses} resize-none ${errors.message ? 'border-red-300 focus:ring-red-200' : ''}`}
          placeholder=" "
          aria-invalid={!!errors.message}
          aria-describedby={errors.message ? 'message-error' : undefined}
        />
        <label htmlFor="contact-message" className={`${labelClasses} peer-placeholder-shown:top-6`}>
          {t('contact:form.message', 'Your Message')} *
        </label>
        <div className="flex justify-between items-center mt-1 mx-1">
          {errors.message ? (
            <p id="message-error" className={errorClasses}>{errors.message}</p>
          ) : (
            <span />
          )}
          <span className="text-xs text-neutral-400">
            {formData.message.length}/2000
          </span>
        </div>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full py-3.5 px-6 bg-gradient-to-r from-primary to-primary-dark text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-primary/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center gap-2 active:scale-[0.98]"
      >
        {isSubmitting ? (
          <>
            <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24" aria-hidden="true">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            {t('contact:form.sending', 'Sending...')}
          </>
        ) : (
          <>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            {t('contact:form.submit', 'Send Message')}
          </>
        )}
      </button>

      <p className="text-xs text-neutral-400 text-center">
        {t('contact:form.privacyNote', 'By submitting, you agree to our Privacy Policy. We will never share your information.')}
      </p>
    </form>
  );
};

export default ContactForm;
