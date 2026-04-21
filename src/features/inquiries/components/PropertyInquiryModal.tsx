import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { sendPropertyInquiry } from '@/services/apiService';
import { Property } from '@/types';
import PhoneInput from '@/src/shared/components/ui/PhoneInput';
import { XMarkIcon, BuildingOfficeIcon } from '@/constants';
import { optimizeCloudinaryUrl } from '@/config/cloudinaryConfig';

interface PropertyInquiryModalProps {
  property: Property;
  isOpen: boolean;
  onClose: () => void;
  defaultName?: string;
  defaultEmail?: string;
  defaultPhone?: string;
}

const PropertyInquiryModal: React.FC<PropertyInquiryModalProps> = ({
  property,
  isOpen,
  onClose,
  defaultName = '',
  defaultEmail = '',
  defaultPhone = '',
}) => {
  const { t } = useTranslation(['property', 'common']);
  const [formData, setFormData] = useState({
    buyerName: defaultName,
    buyerEmail: defaultEmail,
    buyerPhone: defaultPhone,
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  // Ensure we only render portal on client side
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!formData.buyerName.trim()) {
      setError(t('property:inquiry.nameRequired', 'Name is required'));
      return;
    }
    if (!formData.buyerEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.buyerEmail)) {
      setError(t('property:inquiry.validEmailRequired', 'Valid email is required'));
      return;
    }
    if (!formData.message.trim()) {
      setError(t('property:inquiry.messageRequired', 'Message is required'));
      return;
    }

    setIsSubmitting(true);

    try {
      // Build message with property reference (ID and title) for the agent/seller
      let fullMessage = formData.message.trim();
      const refParts: string[] = [];
      if (property.propertyId) refParts.push(property.propertyId);
      if (property.title) refParts.push(property.title);
      if (refParts.length > 0) {
        fullMessage = `[${refParts.join(' - ')}]\n\n${fullMessage}`;
      }

      await sendPropertyInquiry({
        propertyId: property.id,
        buyerName: formData.buyerName.trim(),
        buyerEmail: formData.buyerEmail.trim(),
        buyerPhone: formData.buyerPhone.trim() || undefined,
        message: fullMessage,
      });
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('property:inquiry.sendError', 'Failed to send inquiry. Please try again.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !mounted) return null;

  const floatingInputClasses = "block px-2.5 pb-2.5 pt-4 w-full text-base text-neutral-900 bg-white rounded-lg border border-neutral-300 appearance-none focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent peer";
  const floatingLabelClasses = "absolute text-base text-neutral-500 duration-300 transform -translate-y-4 scale-75 top-2 z-10 origin-[0] bg-white px-2 peer-focus:px-2 peer-focus:text-primary peer-placeholder-shown:scale-100 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:top-1/2 peer-focus:top-2 peer-focus:scale-75 peer-focus:-translate-y-4 start-1";

  const modalContent = (
    <>
      <style>{`
        @keyframes inquiry-modal-fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes inquiry-modal-pop {
          from { opacity: 0; transform: scale(0.95) translateY(10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        .inquiry-modal-backdrop {
          animation: inquiry-modal-fade-in 0.2s ease-out;
        }
        .inquiry-modal-content {
          animation: inquiry-modal-pop 0.3s ease-out;
        }
      `}</style>
      <div
        className="inquiry-modal-backdrop fixed inset-0 z-[99999] flex items-end sm:items-center justify-center p-0 sm:p-4"
        style={{
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          backdropFilter: 'blur(4px)',
        }}
        onClick={onClose}
      >
        <div
          className="inquiry-modal-content bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl shadow-2xl max-h-[90vh] overflow-y-auto"
          onClick={e => e.stopPropagation()}
        >
        {/* Header */}
        <div className="bg-gradient-to-r from-primary to-primary-dark p-4 flex items-center justify-between sticky top-0 z-10">
          <div>
            <h2 className="text-lg font-bold text-white">
              {t('property:inquiry.title', 'Send Inquiry')}
            </h2>
            <p className="text-sm text-white/80 line-clamp-1">
              {property.title}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1 flex-shrink-0"
            aria-label="Close"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <div className="p-4 sm:p-6">
          {success ? (
            <div className="text-center py-8">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
                <svg className="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                {t('property:inquiry.successTitle', 'Inquiry Sent!')}
              </h3>
              <p className="text-gray-600 mb-6">
                {t('property:inquiry.successMessage', 'Your message has been sent to the property owner. They will contact you soon.')}
              </p>
              <button
                onClick={onClose}
                className="px-6 py-2 bg-primary text-white rounded-lg font-semibold hover:bg-primary-dark transition-colors"
              >
                {t('common:close', 'Close')}
              </button>
            </div>
          ) : (
            <>
              {/* Property Preview */}
              <div className="flex gap-3 mb-6 p-3 bg-neutral-50 rounded-lg">
                {property.imageUrl ? (
                <img
                  src={optimizeCloudinaryUrl(property.imageUrl, { width: 160, quality: 'auto', crop: 'fill' })}
                  alt={property.title}
                  loading="lazy"
                  decoding="async"
                  className="w-20 h-20 rounded-lg object-cover"
                />
                ) : (
                <div className="w-20 h-20 rounded-lg bg-gradient-to-br from-neutral-100 via-neutral-200 to-neutral-300 flex items-center justify-center flex-shrink-0">
                  <BuildingOfficeIcon className="w-8 h-8 text-neutral-400" />
                </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-neutral-900 truncate">{property.title}</p>
                  {property.propertyId && (
                    <p className="text-xs font-mono text-neutral-400">ID: {property.propertyId}</p>
                  )}
                  <p className="text-sm text-neutral-500">{property.city}, {property.country}</p>
                  <p className="text-lg font-bold text-primary mt-1">
                    {(property as any).currency || '€'}{property.price.toLocaleString()}
                  </p>
                </div>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Name */}
                <div className="relative">
                  <input
                    type="text"
                    id="buyerName"
                    name="buyerName"
                    value={formData.buyerName}
                    onChange={handleChange}
                    className={floatingInputClasses}
                    placeholder=" "
                    required
                  />
                  <label htmlFor="buyerName" className={floatingLabelClasses}>
                    {t('property:inquiry.yourName', 'Your Name')} *
                  </label>
                </div>

                {/* Email */}
                <div className="relative">
                  <input
                    type="email"
                    id="buyerEmail"
                    name="buyerEmail"
                    value={formData.buyerEmail}
                    onChange={handleChange}
                    className={floatingInputClasses}
                    placeholder=" "
                    required
                  />
                  <label htmlFor="buyerEmail" className={floatingLabelClasses}>
                    {t('property:inquiry.yourEmail', 'Your Email')} *
                  </label>
                </div>

                {/* Phone (optional) */}
                <div>
                  <label className="block text-xs font-medium text-neutral-600 mb-1.5">
                    {t('property:inquiry.yourPhone', 'Your Phone (optional)')}
                  </label>
                  <PhoneInput
                    value={formData.buyerPhone}
                    onChange={(v) => setFormData(prev => ({ ...prev, buyerPhone: v }))}
                  />
                </div>

                {/* Message */}
                <div className="relative">
                  <textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    rows={4}
                    className={`${floatingInputClasses} resize-none`}
                    placeholder=" "
                    required
                  />
                  <label htmlFor="message" className={`${floatingLabelClasses} peer-placeholder-shown:top-6`}>
                    {t('property:inquiry.message', 'Your Message')} *
                  </label>
                </div>

                {/* Quick Message Templates */}
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({
                      ...prev,
                      message: t('property:inquiry.template1', 'Hi, I am interested in this property. Is it still available? I would like to schedule a viewing.')
                    }))}
                    className="text-xs px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 rounded-full text-neutral-700 transition-colors"
                  >
                    {t('property:inquiry.scheduleViewing', 'Schedule viewing')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({
                      ...prev,
                      message: t('property:inquiry.template2', 'Hi, I would like more information about this property. Can you provide details about the neighborhood and nearby amenities?')
                    }))}
                    className="text-xs px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 rounded-full text-neutral-700 transition-colors"
                  >
                    {t('property:inquiry.moreInfo', 'More information')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({
                      ...prev,
                      message: t('property:inquiry.template3', 'Hi, is the price negotiable? I am a serious buyer looking to make a decision soon.')
                    }))}
                    className="text-xs px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 rounded-full text-neutral-700 transition-colors"
                  >
                    {t('property:inquiry.priceQuestion', 'Price negotiable?')}
                  </button>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 px-4 bg-primary text-white rounded-lg font-bold hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      {t('property:inquiry.sending', 'Sending...')}
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      {t('property:inquiry.sendInquiry', 'Send Inquiry')}
                    </>
                  )}
                </button>
              </form>

              <p className="mt-4 text-xs text-neutral-500 text-center">
                {t('property:inquiry.privacyNote', 'By submitting, you agree to be contacted by the property owner regarding this listing.')}
              </p>
            </>
          )}
        </div>
        </div>
      </div>
    </>
  );

  // Use portal to render at document body level, bypassing any parent CSS constraints
  return createPortal(modalContent, document.body);
};

export default PropertyInquiryModal;
