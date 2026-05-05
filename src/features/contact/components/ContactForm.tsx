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
}

const SUBJECT_OPTIONS = [
  { value: 'general', labelKey: 'contact:subjects.general' },
  { value: 'buying', labelKey: 'contact:subjects.buying' },
  { value: 'selling', labelKey: 'contact:subjects.selling' },
  { value: 'agency', labelKey: 'contact:subjects.agency' },
  { value: 'support', labelKey: 'contact:subjects.support' },
  { value: 'partnership', labelKey: 'contact:subjects.partnership' },
] as const;

const ContactForm: React.FC<ContactFormProps> = ({
  formData,
  errors,
  isSubmitting,
  submitError,
  onChange,
  onPhoneChange = () => {},
  onSubmit,
}) => {
  const { t } = useTranslation(['contact', 'common']);

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
              {t(option.labelKey, option.value)}
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
