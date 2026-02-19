/**
 * Z360 Virtual Tour URL Input Component
 *
 * A specialized input field for 360 virtual tour URLs with:
 * - Z360 URL validation and hints
 * - Preview button
 * - Support for multiple 360 tour providers
 */

import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { isZ360TourUrl, validateZ360Url, is360TourUrl, Z360_CONFIG } from '../utils/z360Tour';

interface Z360TourInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  label?: string;
  showZ360Hint?: boolean;
  showPreview?: boolean;
  error?: string;
}

export const Z360TourInput: React.FC<Z360TourInputProps> = ({
  value,
  onChange,
  placeholder,
  className = '',
  label,
  showZ360Hint = true,
  showPreview = true,
  error,
}) => {
  const { t } = useTranslation(['newListing', 'seller', 'common']);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);

  // Validate the URL
  const urlValidation = value ? is360TourUrl(value) : { isValid: false, provider: null };
  const isZ360 = urlValidation.provider === 'z360';
  const z360Validation = isZ360 ? validateZ360Url(value) : null;

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  }, [onChange]);

  const handleOpenZ360 = useCallback(() => {
    window.open(Z360_CONFIG.baseUrl, '_blank', 'noopener,noreferrer');
  }, []);

  const handlePreview = useCallback(() => {
    if (value && urlValidation.isValid) {
      setIsPreviewOpen(true);
    }
  }, [value, urlValidation.isValid]);

  const handleClosePreview = useCallback(() => {
    setIsPreviewOpen(false);
  }, []);

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Label */}
      {label && (
        <label className="block text-sm font-medium text-neutral-700">
          {label}
        </label>
      )}

      {/* Input with icons */}
      <div className="relative">
        <input
          type="url"
          value={value}
          onChange={handleChange}
          onFocus={() => setInputFocused(true)}
          onBlur={() => setInputFocused(false)}
          placeholder={placeholder || t('virtualTour.virtualTour360Placeholder')}
          className={`
            w-full px-4 py-3 pr-24 rounded-lg border transition-all
            ${error
              ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
              : value && urlValidation.isValid
                ? 'border-green-300 focus:border-green-500 focus:ring-green-200'
                : 'border-neutral-300 focus:border-purple-500 focus:ring-purple-200'
            }
            focus:outline-none focus:ring-2
          `}
        />

        {/* Action buttons */}
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {/* Provider badge */}
          {value && urlValidation.isValid && (
            <span className={`
              text-xs px-2 py-1 rounded font-medium
              ${isZ360 ? 'bg-purple-100 text-purple-700' : 'bg-neutral-100 text-neutral-600'}
            `}>
              {isZ360 ? 'Z360' : urlValidation.provider?.toUpperCase() || '360'}
            </span>
          )}

          {/* Preview button */}
          {showPreview && value && urlValidation.isValid && (
            <button
              type="button"
              onClick={handlePreview}
              className="p-1.5 text-neutral-500 hover:text-purple-600 transition-colors"
              title="Preview tour"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Error message */}
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      {/* Z360 validation message */}
      {isZ360 && z360Validation && !z360Validation.isValid && value && (
        <p className="text-sm text-amber-600">
          {z360Validation.error}
        </p>
      )}

      {/* Z360 hint */}
      {showZ360Hint && (inputFocused || !value) && (
        <div className="flex items-center gap-2 text-sm text-neutral-500">
          <img
            src="/images/partners/z360-logo.svg"
            alt="Z360"
            className="h-4 w-auto opacity-60"
          />
          <span>{t('virtualTour.z360Hint', 'Create tours at z360-virtual-tour.vercel.app')}</span>
          <button
            type="button"
            onClick={handleOpenZ360}
            className="text-purple-600 hover:text-purple-800 underline"
          >
            {t('newListing:virtualTour.openZ360')}
          </button>
        </div>
      )}

      {/* Preview Modal */}
      {isPreviewOpen && value && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={handleClosePreview}
        >
          <div
            className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-2">
                {isZ360 && (
                  <img src="/images/partners/z360-logo.svg" alt="Z360" className="h-6" />
                )}
                <h3 className="font-semibold text-neutral-800">{t('newListing:virtualTour.tourPreview')}</h3>
              </div>
              <button
                onClick={handleClosePreview}
                className="p-2 hover:bg-neutral-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* iframe */}
            <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
              <iframe
                src={value}
                className="absolute top-0 left-0 w-full h-full border-0"
                allowFullScreen
                allow="xr-spatial-tracking; gyroscope; accelerometer; vr"
                title="360° Virtual Tour Preview"
              />
            </div>

            {/* Footer */}
            <div className="p-4 border-t bg-neutral-50 flex justify-between items-center">
              <a
                href={value}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-purple-600 hover:text-purple-800 flex items-center gap-1"
              >
                {t('newListing:virtualTour.openInNewTab')}
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
              <button
                onClick={handleClosePreview}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                {t('common:done')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Z360TourInput;
