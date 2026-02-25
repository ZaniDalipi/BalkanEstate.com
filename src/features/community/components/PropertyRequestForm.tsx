import React from 'react';
import { useTranslation } from 'react-i18next';
import type { PropertyRequestFormData, PropertyRequestFormErrors } from '../hooks/use-property-request-form';

interface PropertyRequestFormProps {
  formData: PropertyRequestFormData;
  errors: PropertyRequestFormErrors;
  isSubmitting: boolean;
  submitError: string | null;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  onSubmit: (e: React.FormEvent) => void;
}

const inputClasses =
  'block px-4 pb-2.5 pt-4 w-full text-base text-neutral-900 glass-input rounded-xl appearance-none focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 peer transition-all duration-300';

const labelClasses =
  'absolute text-sm text-neutral-500 duration-300 transform -translate-y-4 scale-75 top-2 z-10 origin-[0] bg-white/70 backdrop-blur-sm px-2 peer-focus:px-2 peer-focus:text-primary peer-placeholder-shown:scale-100 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:top-1/2 peer-focus:top-2 peer-focus:scale-75 peer-focus:-translate-y-4 start-3 rounded-md';

const errorClasses = 'mt-1 text-xs text-red-500';

const selectClasses =
  'block px-4 py-3 w-full text-base text-neutral-900 glass-input rounded-xl appearance-none focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all duration-300';

const COUNTRIES = [
  'Albania', 'Bosnia and Herzegovina', 'Bulgaria', 'Croatia', 'Greece',
  'Kosovo', 'Montenegro', 'North Macedonia', 'Romania', 'Serbia',
];

const PropertyRequestForm: React.FC<PropertyRequestFormProps> = ({
  formData,
  errors,
  isSubmitting,
  submitError,
  onChange,
  onSubmit,
}) => {
  const { t } = useTranslation('community');

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {submitError && (
        <div className="p-3 bg-red-50/80 backdrop-blur-sm border border-red-200/60 rounded-xl" role="alert">
          <p className="text-red-700 text-sm">{submitError}</p>
        </div>
      )}

      {/* Name */}
      <div className="relative">
        <input
          type="text"
          id="request-name"
          name="name"
          value={formData.name}
          onChange={onChange}
          className={`${inputClasses} ${errors.name ? 'border-red-300 focus:ring-red-200' : ''}`}
          placeholder=" "
          aria-invalid={!!errors.name}
          aria-describedby={errors.name ? 'name-error' : undefined}
        />
        <label htmlFor="request-name" className={labelClasses}>
          {t('form.name', 'Your Name')} *
        </label>
        {errors.name && <p id="name-error" className={errorClasses}>{errors.name}</p>}
      </div>

      {/* Email & Phone */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="relative">
          <input
            type="email"
            id="request-email"
            name="email"
            value={formData.email}
            onChange={onChange}
            className={`${inputClasses} ${errors.email ? 'border-red-300 focus:ring-red-200' : ''}`}
            placeholder=" "
            aria-invalid={!!errors.email}
          />
          <label htmlFor="request-email" className={labelClasses}>
            {t('form.email', 'Email')}
          </label>
          {errors.email && <p className={errorClasses}>{errors.email}</p>}
        </div>
        <div className="relative">
          <input
            type="text"
            id="request-telegram"
            name="telegramUsername"
            value={formData.telegramUsername}
            onChange={onChange}
            className={inputClasses}
            placeholder=" "
          />
          <label htmlFor="request-telegram" className={labelClasses}>
            {t('form.telegram', 'Telegram Username')}
          </label>
        </div>
      </div>

      {/* Listing Type & Property Type */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1.5">
            {t('form.listingType', 'Looking to')} *
          </label>
          <select
            name="listingType"
            value={formData.listingType}
            onChange={onChange}
            className={selectClasses}
          >
            <option value="sale">{t('form.buy', 'Buy')}</option>
            <option value="rent">{t('form.rent', 'Rent')}</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1.5">
            {t('form.propertyType', 'Property Type')}
          </label>
          <select
            name="propertyType"
            value={formData.propertyType}
            onChange={onChange}
            className={selectClasses}
          >
            <option value="any">{t('form.anyType', 'Any Type')}</option>
            <option value="apartment">{t('form.apartment', 'Apartment')}</option>
            <option value="house">{t('form.house', 'House')}</option>
            <option value="villa">{t('form.villa', 'Villa')}</option>
            <option value="land">{t('form.land', 'Land')}</option>
            <option value="other">{t('form.other', 'Other')}</option>
          </select>
        </div>
      </div>

      {/* Location */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1.5">
            {t('form.country', 'Country')}
          </label>
          <select
            name="country"
            value={formData.country}
            onChange={onChange}
            className={selectClasses}
          >
            <option value="">{t('form.anyCountry', 'Any Country')}</option>
            {COUNTRIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div className="relative">
          <input
            type="text"
            id="request-city"
            name="city"
            value={formData.city}
            onChange={onChange}
            className={inputClasses}
            placeholder=" "
          />
          <label htmlFor="request-city" className={labelClasses}>
            {t('form.city', 'City')}
          </label>
        </div>
      </div>

      {/* Budget */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="relative">
          <input
            type="number"
            id="request-minPrice"
            name="minPrice"
            value={formData.minPrice}
            onChange={onChange}
            className={inputClasses}
            placeholder=" "
            min="0"
          />
          <label htmlFor="request-minPrice" className={labelClasses}>
            {t('form.minBudget', 'Min Budget (EUR)')}
          </label>
        </div>
        <div className="relative">
          <input
            type="number"
            id="request-maxPrice"
            name="maxPrice"
            value={formData.maxPrice}
            onChange={onChange}
            className={`${inputClasses} ${errors.maxPrice ? 'border-red-300 focus:ring-red-200' : ''}`}
            placeholder=" "
            min="0"
          />
          <label htmlFor="request-maxPrice" className={labelClasses}>
            {t('form.maxBudget', 'Max Budget (EUR)')}
          </label>
          {errors.maxPrice && <p className={errorClasses}>{errors.maxPrice}</p>}
        </div>
      </div>

      {/* Bedrooms */}
      <div className="relative w-full sm:w-1/2">
        <input
          type="number"
          id="request-minBeds"
          name="minBeds"
          value={formData.minBeds}
          onChange={onChange}
          className={inputClasses}
          placeholder=" "
          min="0"
          max="20"
        />
        <label htmlFor="request-minBeds" className={labelClasses}>
          {t('form.minBeds', 'Min Bedrooms')}
        </label>
      </div>

      {/* Additional Notes */}
      <div className="relative">
        <textarea
          id="request-notes"
          name="additionalNotes"
          value={formData.additionalNotes}
          onChange={onChange}
          rows={4}
          className={`${inputClasses} resize-none ${errors.additionalNotes ? 'border-red-300 focus:ring-red-200' : ''}`}
          placeholder=" "
          maxLength={2000}
          aria-invalid={!!errors.additionalNotes}
        />
        <label htmlFor="request-notes" className={labelClasses}>
          {t('form.notes', 'Additional Details')}
        </label>
        <span className="text-xs text-neutral-400 mt-1 block text-right">
          {formData.additionalNotes.length}/2000
        </span>
        {errors.additionalNotes && <p className={errorClasses}>{errors.additionalNotes}</p>}
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full py-3.5 px-6 bg-primary hover:bg-primary/90 text-white font-semibold rounded-xl shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {isSubmitting ? (
          <>
            <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            {t('form.submitting', 'Submitting...')}
          </>
        ) : (
          <>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
            </svg>
            {t('form.submit', 'Submit Request')}
          </>
        )}
      </button>
    </form>
  );
};

export default PropertyRequestForm;
