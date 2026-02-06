import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { sendAgentInquiry } from '@/services/apiService';
import { XMarkIcon, UserCircleIcon } from '@/constants';

interface Agent {
  id: string;
  name: string;
  avatarUrl?: string;
  agencyName?: string;
  city?: string;
  country?: string;
}

interface AgentInquiryModalProps {
  agent: Agent;
  isOpen: boolean;
  onClose: () => void;
  defaultName?: string;
  defaultEmail?: string;
  defaultPhone?: string;
}

const AgentInquiryModal: React.FC<AgentInquiryModalProps> = ({
  agent,
  isOpen,
  onClose,
  defaultName = '',
  defaultEmail = '',
  defaultPhone = '',
}) => {
  const { t } = useTranslation(['agents', 'common']);
  const [formData, setFormData] = useState({
    buyerName: defaultName,
    buyerEmail: defaultEmail,
    buyerPhone: defaultPhone,
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      setError(t('agents:inquiry.nameRequired', 'Name is required'));
      return;
    }
    if (!formData.buyerEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.buyerEmail)) {
      setError(t('agents:inquiry.validEmailRequired', 'Valid email is required'));
      return;
    }
    if (!formData.message.trim()) {
      setError(t('agents:inquiry.messageRequired', 'Message is required'));
      return;
    }

    setIsSubmitting(true);

    try {
      await sendAgentInquiry({
        agentId: agent.id,
        buyerName: formData.buyerName.trim(),
        buyerEmail: formData.buyerEmail.trim(),
        buyerPhone: formData.buyerPhone.trim() || undefined,
        message: formData.message.trim(),
      });
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('agents:inquiry.sendError', 'Failed to send inquiry. Please try again.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const floatingInputClasses = "block px-2.5 pb-2.5 pt-4 w-full text-base text-neutral-900 bg-white rounded-lg border border-neutral-300 appearance-none focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent peer";
  const floatingLabelClasses = "absolute text-base text-neutral-500 duration-300 transform -translate-y-4 scale-75 top-2 z-10 origin-[0] bg-white px-2 peer-focus:px-2 peer-focus:text-primary peer-placeholder-shown:scale-100 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:top-1/2 peer-focus:top-2 peer-focus:scale-75 peer-focus:-translate-y-4 start-1";

  return (
    <div
      className="fixed inset-0 z-[5000] flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl shadow-xl overflow-hidden max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-4 flex items-center justify-between sticky top-0 z-10">
          <div>
            <h2 className="text-lg font-bold text-white">
              {t('agents:inquiry.title', 'Contact Agent')}
            </h2>
            <p className="text-sm text-white/80">
              {agent.name}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1"
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
                {t('agents:inquiry.successTitle', 'Message Sent!')}
              </h3>
              <p className="text-gray-600 mb-6">
                {t('agents:inquiry.successMessage', 'Your message has been sent to the agent. They will contact you soon.')}
              </p>
              <button
                onClick={onClose}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
              >
                {t('common:close', 'Close')}
              </button>
            </div>
          ) : (
            <>
              {/* Agent Preview */}
              <div className="flex gap-4 mb-6 p-4 bg-neutral-50 rounded-lg">
                {agent.avatarUrl ? (
                  <img
                    src={agent.avatarUrl}
                    alt={agent.name}
                    loading="lazy"
                    decoding="async"
                    className="w-16 h-16 rounded-full object-cover ring-2 ring-neutral-200"
                  />
                ) : (
                  <UserCircleIcon className="w-16 h-16 text-neutral-300" />
                )}
                <div className="flex-1">
                  <p className="font-bold text-lg text-neutral-900">{agent.name}</p>
                  {agent.agencyName && (
                    <p className="text-sm text-neutral-600">{agent.agencyName}</p>
                  )}
                  {(agent.city || agent.country) && (
                    <p className="text-sm text-neutral-500">
                      {[agent.city, agent.country].filter(Boolean).join(', ')}
                    </p>
                  )}
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
                    {t('agents:inquiry.yourName', 'Your Name')} *
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
                    {t('agents:inquiry.yourEmail', 'Your Email')} *
                  </label>
                </div>

                {/* Phone (optional) */}
                <div className="relative">
                  <input
                    type="tel"
                    id="buyerPhone"
                    name="buyerPhone"
                    value={formData.buyerPhone}
                    onChange={handleChange}
                    className={floatingInputClasses}
                    placeholder=" "
                  />
                  <label htmlFor="buyerPhone" className={floatingLabelClasses}>
                    {t('agents:inquiry.yourPhone', 'Your Phone (optional)')}
                  </label>
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
                    {t('agents:inquiry.message', 'Your Message')} *
                  </label>
                </div>

                {/* Quick Message Templates */}
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({
                      ...prev,
                      message: t('agents:inquiry.template1', 'Hi, I am looking for a property in your area. Can you help me find suitable options based on my requirements?')
                    }))}
                    className="text-xs px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 rounded-full text-neutral-700 transition-colors"
                  >
                    {t('agents:inquiry.findProperty', 'Looking for property')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({
                      ...prev,
                      message: t('agents:inquiry.template2', 'Hi, I am interested in selling my property. Could you provide a market valuation and discuss your services?')
                    }))}
                    className="text-xs px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 rounded-full text-neutral-700 transition-colors"
                  >
                    {t('agents:inquiry.sellProperty', 'Selling property')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({
                      ...prev,
                      message: t('agents:inquiry.template3', 'Hi, I would like to learn more about the real estate market in your area. Can we schedule a consultation?')
                    }))}
                    className="text-xs px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 rounded-full text-neutral-700 transition-colors"
                  >
                    {t('agents:inquiry.marketInfo', 'Market information')}
                  </button>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      {t('agents:inquiry.sending', 'Sending...')}
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      {t('agents:inquiry.sendMessage', 'Send Message')}
                    </>
                  )}
                </button>
              </form>

              <p className="mt-4 text-xs text-neutral-500 text-center">
                {t('agents:inquiry.privacyNote', 'By submitting, you agree to be contacted by the agent regarding your inquiry.')}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AgentInquiryModal;
