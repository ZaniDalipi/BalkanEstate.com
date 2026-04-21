import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { sendAgentInquiry } from '@/services/apiService';
import { XMarkIcon, UserCircleIcon } from '@/constants';
import PhoneInput from '@/src/shared/components/ui/PhoneInput';

interface Agent {
  id: string;
  userId?: string;
  agentId?: string;
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

type InquiryType = 'buy' | 'sell' | 'market' | '';

const MAX_MESSAGE_LENGTH = 1000;

const AgentInquiryModal: React.FC<AgentInquiryModalProps> = ({
  agent,
  isOpen,
  onClose,
  defaultName = '',
  defaultEmail = '',
  defaultPhone = '',
}) => {
  const { t } = useTranslation(['agents', 'common']);
  const [inquiryType, setInquiryType] = useState<InquiryType>('');
  const [formData, setFormData] = useState({
    buyerName: defaultName,
    buyerEmail: defaultEmail,
    buyerPhone: defaultPhone,
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);

  // Lock background scroll when modal is open
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [isOpen]);

  // Focus first input after open (skip on touch devices to avoid keyboard jump)
  useEffect(() => {
    if (isOpen && !success && window.matchMedia('(pointer: fine)').matches) {
      const t = setTimeout(() => firstInputRef.current?.focus(), 150);
      return () => clearTimeout(t);
    }
  }, [isOpen, success]);

  const inquiryTypes: { key: InquiryType; icon: string; label: string; template: string }[] = [
    {
      key: 'buy',
      icon: '🏠',
      label: t('agents:inquiry.findProperty', 'Looking for property'),
      template: t('agents:inquiry.template1', 'Hi, I am looking for a property in your area. Can you help me find suitable options based on my requirements?'),
    },
    {
      key: 'sell',
      icon: '📋',
      label: t('agents:inquiry.sellProperty', 'Selling property'),
      template: t('agents:inquiry.template2', 'Hi, I am interested in selling my property. Could you provide a market valuation and discuss your services?'),
    },
    {
      key: 'market',
      icon: '📊',
      label: t('agents:inquiry.marketInfo', 'Market information'),
      template: t('agents:inquiry.template3', 'Hi, I would like to learn more about the real estate market in your area. Can we schedule a consultation?'),
    },
  ];

  const handleTypeSelect = (type: InquiryType) => {
    setInquiryType(type);
    const found = inquiryTypes.find(it => it.key === type);
    if (found && !formData.message) {
      setFormData(prev => ({ ...prev, message: found.template }));
    }
    setError(null);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name === 'message' && value.length > MAX_MESSAGE_LENGTH) return;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

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
      const agentId = String(agent.userId || agent.agentId || agent.id || '');
      if (!agentId) {
        throw new Error(t('agents:inquiry.agentIdentificationError', 'Unable to identify agent'));
      }
      await sendAgentInquiry({
        agentId,
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

  // 16px font-size on inputs prevents iOS Safari auto-zoom on focus
  const inputClasses = [
    'w-full px-3.5 py-3 text-base leading-snug',
    'text-neutral-900 bg-white',
    'border border-neutral-300 rounded-xl',
    'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
    'placeholder:text-neutral-400',
    'transition-shadow',
    // Prevent double-tap zoom on touch
    'touch-action-manipulation',
  ].join(' ');

  return (
    // Backdrop — tap outside to close
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('agents:inquiry.title', 'Contact Agent')}
      className="fixed inset-0 z-[5000] flex flex-col justify-end sm:items-center sm:justify-center bg-black/50"
      style={{ WebkitTapHighlightColor: 'transparent' }}
      onClick={onClose}
    >
      {/*
        Mobile  : full-width bottom sheet, rounded top corners, safe-area bottom padding
        Tablet+ : centred card, max-w-lg, fully rounded
      */}
      <div
        className={[
          // Base
          'bg-white flex flex-col',
          'w-full',
          // Mobile: bottom sheet, no side radius
          'rounded-t-2xl',
          // max-height uses dvh so the browser chrome doesn't cut off content
          // when the browser UI (address bar) is visible
          'max-h-[92dvh] sm:max-h-[90dvh]',
          // Tablet/desktop: centred card, fully rounded
          'sm:rounded-2xl sm:max-w-lg sm:mx-4',
          // Shadow
          'shadow-2xl',
          // Bottom-sheet slide on mobile, fade on tablet+
          'animate-sheet-up',
        ].join(' ')}
        // Stop backdrop click from closing
        onClick={e => e.stopPropagation()}
      >
        {/* ── Drag handle (mobile visual cue) ── */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden flex-shrink-0">
          <div className="w-10 h-1 bg-neutral-300 rounded-full" />
        </div>

        {/* ── Header ── */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-4 sm:px-5 py-3.5 flex items-center justify-between flex-shrink-0 sm:rounded-t-2xl">
          <div className="flex items-center gap-3 min-w-0">
            {agent.avatarUrl ? (
              <img
                src={agent.avatarUrl}
                alt={agent.name}
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover ring-2 ring-white/30 flex-shrink-0"
              />
            ) : (
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                <UserCircleIcon className="w-6 h-6 sm:w-7 sm:h-7 text-white/80" />
              </div>
            )}
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold text-white leading-tight truncate">
                {t('agents:inquiry.title', 'Contact Agent')}
              </h2>
              <p className="text-xs text-white/75 leading-tight truncate">
                {agent.name}{agent.agencyName ? ` · ${agent.agencyName}` : ''}
              </p>
            </div>
          </div>
          {/* Close — min 44×44 touch target */}
          <button
            onClick={onClose}
            className="flex-shrink-0 flex items-center justify-center w-11 h-11 -mr-2 text-white/70 hover:text-white rounded-xl hover:bg-white/10 active:bg-white/20 transition-colors"
            aria-label={t('common:close', 'Close')}
            style={{ touchAction: 'manipulation' }}
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* ── Scrollable body ── */}
        <div
          className="overflow-y-auto flex-1 overscroll-contain"
          // Safe-area bottom padding so content isn't hidden behind home indicator
          style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        >
          {success ? (
            <div className="text-center py-12 px-6">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
                <svg className="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-neutral-900 mb-2">
                {t('agents:inquiry.successTitle', 'Message Sent!')}
              </h3>
              <p className="text-neutral-500 text-sm mb-6 max-w-xs mx-auto">
                {t('agents:inquiry.successMessage', 'Your message has been sent to the agent. They will contact you soon.')}
              </p>
              <button
                onClick={onClose}
                className="px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 active:bg-blue-800 transition-colors text-sm min-h-[44px]"
                style={{ touchAction: 'manipulation' }}
              >
                {t('common:close', 'Close')}
              </button>
            </div>
          ) : (
            <div className="p-4 sm:p-5">

              {/* ── Inquiry type cards ── */}
              <div className="mb-4 sm:mb-5">
                <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-2.5">
                  {t('agents:inquiry.whatAbout', "What's this about?")}
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {inquiryTypes.map(({ key, icon, label }) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => handleTypeSelect(key)}
                      // min-h-[64px] ensures 44px+ touch target even with small text
                      className={[
                        'flex flex-col items-center justify-center gap-1.5 min-h-[64px] p-2.5 sm:p-3',
                        'rounded-xl border-2 text-center transition-all',
                        'text-xs font-medium leading-tight',
                        'active:scale-95',
                        inquiryType === key
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-neutral-200 bg-white text-neutral-600 hover:border-blue-300 hover:bg-blue-50/50',
                      ].join(' ')}
                      style={{ touchAction: 'manipulation' }}
                    >
                      <span className="text-xl sm:text-lg leading-none">{icon}</span>
                      <span>{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* ── Error banner ── */}
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2">
                  <svg className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-3.5">

                {/* Name + Email — stacked on mobile, side-by-side on tablet+ */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="ai-buyerName" className="block text-xs font-medium text-neutral-700 mb-1.5">
                      {t('agents:inquiry.yourName', 'Your Name')} <span className="text-red-500" aria-hidden>*</span>
                    </label>
                    <input
                      ref={firstInputRef}
                      type="text"
                      id="ai-buyerName"
                      name="buyerName"
                      value={formData.buyerName}
                      onChange={handleChange}
                      className={inputClasses}
                      placeholder={t('agents:inquiry.namePlaceholder', 'John Smith')}
                      autoComplete="name"
                      required
                      style={{ touchAction: 'manipulation' }}
                    />
                  </div>
                  <div>
                    <label htmlFor="ai-buyerEmail" className="block text-xs font-medium text-neutral-700 mb-1.5">
                      {t('agents:inquiry.yourEmail', 'Your Email')} <span className="text-red-500" aria-hidden>*</span>
                    </label>
                    <input
                      type="email"
                      id="ai-buyerEmail"
                      name="buyerEmail"
                      value={formData.buyerEmail}
                      onChange={handleChange}
                      className={inputClasses}
                      placeholder="you@example.com"
                      autoComplete="email"
                      inputMode="email"
                      required
                      style={{ touchAction: 'manipulation' }}
                    />
                  </div>
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1.5">
                    {t('agents:inquiry.yourPhone', 'Phone')}
                    <span className="text-neutral-400 font-normal ml-1">({t('common:optional', 'optional')})</span>
                  </label>
                  <PhoneInput
                    value={formData.buyerPhone}
                    onChange={(v) => setFormData(prev => ({ ...prev, buyerPhone: v }))}
                  />
                </div>

                {/* Message + counter */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="ai-message" className="block text-xs font-medium text-neutral-700">
                      {t('agents:inquiry.message', 'Your Message')} <span className="text-red-500" aria-hidden>*</span>
                    </label>
                    <span className={`text-xs tabular-nums ${formData.message.length > MAX_MESSAGE_LENGTH * 0.9 ? 'text-orange-500' : 'text-neutral-400'}`}>
                      {formData.message.length}/{MAX_MESSAGE_LENGTH}
                    </span>
                  </div>
                  <textarea
                    id="ai-message"
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    // 3 rows on mobile (saves vertical space), 4 on tablet+
                    rows={3}
                    className={`${inputClasses} resize-none sm:rows-4`}
                    placeholder={t('agents:inquiry.messagePlaceholder', 'Tell the agent what you need help with...')}
                    required
                    style={{ touchAction: 'manipulation' }}
                  />
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  // min-h-[52px] — generous touch target; slightly taller on mobile
                  className="w-full min-h-[52px] sm:min-h-[48px] px-4 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 text-base sm:text-sm mt-1"
                  style={{ touchAction: 'manipulation' }}
                >
                  {isSubmitting ? (
                    <>
                      <svg className="animate-spin h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      {t('agents:inquiry.sending', 'Sending...')}
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                      {t('agents:inquiry.sendMessage', 'Send Message')}
                    </>
                  )}
                </button>
              </form>

              <p className="mt-3 text-xs text-neutral-400 text-center leading-relaxed">
                {t('agents:inquiry.privacyNote', 'By submitting, you agree to be contacted by the agent regarding your inquiry.')}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AgentInquiryModal;
