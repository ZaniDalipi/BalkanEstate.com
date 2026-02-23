/**
 * ContactForm Component
 * Glass-styled contact form with floating labels and validation
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import type { ContactFormData, ContactFormErrors } from '../types';

interface ContactFormProps {
  formData: ContactFormData;
  errors: ContactFormErrors;
  isSubmitting: boolean;
  submitError: string | null;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  onSubmit: (e: React.FormEvent) => void;
}

const BALKAN_COUNTRY_CODES = [
  { code: '+383', country: 'XK', label: 'Kosovo', flag: '\u{1F1FD}\u{1F1F0}' },
  { code: '+355', country: 'AL', label: 'Albania', flag: '\u{1F1E6}\u{1F1F1}' },
  { code: '+381', country: 'RS', label: 'Serbia', flag: '\u{1F1F7}\u{1F1F8}' },
  { code: '+389', country: 'MK', label: 'N. Macedonia', flag: '\u{1F1F2}\u{1F1F0}' },
  { code: '+387', country: 'BA', label: 'Bosnia', flag: '\u{1F1E7}\u{1F1E6}' },
  { code: '+382', country: 'ME', label: 'Montenegro', flag: '\u{1F1F2}\u{1F1EA}' },
  { code: '+385', country: 'HR', label: 'Croatia', flag: '\u{1F1ED}\u{1F1F7}' },
  { code: '+386', country: 'SI', label: 'Slovenia', flag: '\u{1F1F8}\u{1F1EE}' },
  { code: '+359', country: 'BG', label: 'Bulgaria', flag: '\u{1F1E7}\u{1F1EC}' },
  { code: '+40',  country: 'RO', label: 'Romania', flag: '\u{1F1F7}\u{1F1F4}' },
  { code: '+30',  country: 'GR', label: 'Greece', flag: '\u{1F1EC}\u{1F1F7}' },
] as const;

const PHONE_FORMAT_PATTERNS: Record<string, number[]> = {
  '+383': [2, 3, 4],
  '+355': [2, 3, 4],
  '+381': [2, 3, 4],
  '+389': [2, 3, 3],
  '+387': [2, 3, 3],
  '+382': [2, 3, 3],
  '+385': [2, 3, 4],
  '+386': [2, 3, 2, 2],
  '+359': [2, 3, 4],
  '+40':  [3, 3, 3],
  '+30':  [3, 3, 4],
};

const getPhonePlaceholder = (countryCode: string): string => {
  const pattern = PHONE_FORMAT_PATTERNS[countryCode] || [3, 3, 4];
  return pattern.map(n => 'X'.repeat(n)).join(' ');
};

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

      {/* Phone (optional) with country code */}
      <div className="relative">
        <div className={`flex items-stretch rounded-xl overflow-hidden glass-input focus-within:ring-2 focus-within:ring-primary/30 focus-within:border-primary/50 transition-all duration-300 ${errors.phone ? 'border-red-300 focus-within:ring-red-200' : ''}`}>
          <select
            name="countryCode"
            value={formData.countryCode}
            onChange={onChange}
            className="bg-transparent pl-3 pr-1 py-3 text-sm text-neutral-700 border-r border-neutral-200/60 focus:outline-none cursor-pointer appearance-none"
            aria-label={t('contact:form.countryCode', 'Country code')}
          >
            {BALKAN_COUNTRY_CODES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.flag} {c.code}
              </option>
            ))}
          </select>
          <input
            type="tel"
            id="contact-phone"
            name="phone"
            value={formData.phone}
            onChange={onChange}
            className="flex-1 bg-transparent px-3 py-3 text-base text-neutral-900 focus:outline-none placeholder:text-neutral-400"
            placeholder={getPhonePlaceholder(formData.countryCode)}
            autoComplete="tel-national"
            aria-invalid={!!errors.phone}
            aria-describedby={errors.phone ? 'phone-error' : undefined}
          />
        </div>
        <label className="absolute text-sm text-neutral-500 duration-300 transform -translate-y-4 scale-75 top-0 z-10 origin-[0] bg-white/70 backdrop-blur-sm px-2 start-3 rounded-md">
          {t('contact:form.phone', 'Phone (optional)')}
        </label>
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
