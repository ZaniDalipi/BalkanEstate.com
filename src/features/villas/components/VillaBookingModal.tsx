import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { sendPropertyInquiry } from '@/services/apiService';
import { Property } from '@/types';
import { formatPrice } from '@/utils/currency';
import PhoneInput from '@/src/shared/components/ui/PhoneInput';
import { XMarkIcon } from '@/constants';
import { optimizeCloudinaryUrl } from '@/config/cloudinaryConfig';
import { validateName, validateEmail, validatePhone, sanitizeText } from '@/shared/utils/validation';

interface VillaBookingModalProps {
  property: Property;
  isOpen: boolean;
  onClose: () => void;
  defaultName?: string;
  defaultEmail?: string;
  defaultPhone?: string;
}

const todayISO = (): string => new Date().toISOString().split('T')[0];
const addDaysISO = (iso: string, days: number): string => {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
};
const nightsBetween = (a: string, b: string): number => {
  if (!a || !b) return 0;
  const ms = new Date(b).getTime() - new Date(a).getTime();
  return ms > 0 ? Math.round(ms / 86_400_000) : 0;
};

/**
 * Booking-style "Request to Book" for luxury villas. This is a request only:
 * BalkanEstate takes no payment and is not a party to the stay — the host
 * receives the request (with the guest's phone) and calls the guest back to
 * confirm. The liability disclaimer is shown before submit and on success.
 */
const VillaBookingModal: React.FC<VillaBookingModalProps> = ({
  property,
  isOpen,
  onClose,
  defaultName = '',
  defaultEmail = '',
  defaultPhone = '',
}) => {
  const { t } = useTranslation(['villas', 'common']);
  // Rentals collect stay dates + guests; for-sale villas are a viewing/details
  // enquiry (no dates). The host still calls the enquirer back either way.
  const isForRent = property.listingType !== 'sale';
  const [mounted, setMounted] = useState(false);
  const [form, setForm] = useState({
    checkIn: '',
    checkOut: '',
    guests: 2,
    name: defaultName,
    email: defaultEmail,
    phone: defaultPhone,
    notes: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Reset when reopened
  useEffect(() => {
    if (isOpen) {
      setSuccess(false);
      setError(null);
    }
  }, [isOpen]);

  const nights = useMemo(() => nightsBetween(form.checkIn, form.checkOut), [form.checkIn, form.checkOut]);
  const showEstimate = !property.isNegotiable && property.price > 0 && nights > 0;
  const estimateTotal = showEstimate ? property.price * nights : 0;

  const update = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate at the boundary (shared validation utils)
    const nameCheck = validateName(form.name, t('villas:booking.name', 'Full name'));
    if (!nameCheck.isValid) { setError(nameCheck.error!); return; }
    const phoneCheck = validatePhone(form.phone);
    if (!phoneCheck.isValid) { setError(phoneCheck.error!); return; }
    const emailCheck = validateEmail(form.email);
    if (!emailCheck.isValid) { setError(emailCheck.error!); return; }
    if (isForRent && (!form.checkIn || !form.checkOut || nights <= 0)) {
      setError(t('villas:booking.errDates', 'Please choose valid check-in and check-out dates.'));
      return;
    }

    setIsSubmitting(true);
    try {
      // Compose a request the host/seller receives as an inquiry
      const ref = [property.propertyId, property.title].filter(Boolean).join(' - ');
      const heading = isForRent
        ? t('villas:booking.requestHeading', 'LUXURY VILLA BOOKING REQUEST')
        : t('villas:booking.enquiryHeading', 'LUXURY VILLA SALE ENQUIRY');
      const lines = [
        `★ ${heading}`,
        ref ? `[${ref}]` : '',
        ...(isForRent ? [
          `${t('villas:booking.checkIn', 'Check-in')}: ${form.checkIn}`,
          `${t('villas:booking.checkOut', 'Check-out')}: ${form.checkOut}`,
          `${t('villas:booking.nights', 'Nights')}: ${nights}`,
          `${t('villas:booking.guests', 'Guests')}: ${form.guests}`,
        ] : []),
        `${t('villas:booking.callGuestAt', 'Please call the guest at')}: ${form.phone}`,
        form.notes.trim() ? `${t('villas:booking.notes', 'Notes')}: ${sanitizeText(form.notes.trim())}` : '',
      ].filter(Boolean);

      await sendPropertyInquiry({
        propertyId: property.id,
        buyerName: form.name.trim(),
        buyerEmail: form.email.trim(),
        buyerPhone: form.phone.trim() || undefined,
        message: lines.join('\n'),
      });
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('villas:booking.sendError', 'Could not send your request. Please try again.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !mounted) return null;

  const inputCls = 'block w-full text-sm text-neutral-900 bg-white rounded-lg border border-neutral-300 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#E8B820] focus:border-transparent';
  const labelCls = 'block text-xs font-semibold text-neutral-600 mb-1.5';

  // Liability disclaimer — shown in the form and on the success screen
  const Disclaimer = () => (
    <div className="rounded-xl border border-amber-300/70 bg-amber-50 p-3">
      <p className="text-[11px] font-bold text-amber-900 mb-0.5 flex items-center gap-1">
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
        </svg>
        {t('villas:booking.disclaimerTitle', 'Please note')}
      </p>
      <p className="text-[11px] leading-relaxed text-amber-800">
        {t('villas:booking.disclaimer', 'BalkanEstate is a listings platform only. We are not a party to this booking, handle no payments, and accept no responsibility or liability for the booking, the property, your stay, payments, or any dealings between you and the host. All arrangements are made directly with the host at your own risk.')}
      </p>
    </div>
  );

  const content = (
    <>
      <style>{`
        @keyframes vbk-fade { from { opacity:0 } to { opacity:1 } }
        @keyframes vbk-pop { from { opacity:0; transform: scale(0.96) translateY(10px) } to { opacity:1; transform: scale(1) translateY(0) } }
      `}</style>
      <div
        className="fixed inset-0 z-[99999] flex items-end sm:items-center justify-center p-0 sm:p-4"
        style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', animation: 'vbk-fade 0.2s ease-out' }}
        onClick={onClose}
      >
        <div
          className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl shadow-2xl max-h-[92vh] overflow-y-auto"
          style={{ animation: 'vbk-pop 0.3s ease-out' }}
          onClick={e => e.stopPropagation()}
        >
          {/* Header — onyx + gold to match the villa brand */}
          <div className="p-4 flex items-center justify-between sticky top-0 z-10"
               style={{ background: 'linear-gradient(135deg, #141009 0%, #332C22 100%)' }}>
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-[#F7E7A6] flex items-center gap-1.5">
                <span style={{ fontSize: '10px' }}>✦</span>
                {isForRent ? t('villas:booking.title', 'Request to Book') : t('villas:booking.enquireTitle', 'Request Details')}
              </h2>
              <p className="text-sm text-white/60 line-clamp-1">{property.title}</p>
            </div>
            <button onClick={onClose} className="text-white/70 hover:text-white p-1 flex-shrink-0" aria-label={t('common:close', 'Close')}>
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>

          <div className="p-4 sm:p-6">
            {success ? (
              <div className="text-center py-6">
                <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full mb-4"
                     style={{ background: 'rgba(232,184,32,0.15)' }}>
                  <svg className="h-8 w-8" style={{ color: '#B8860B' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  {isForRent ? t('villas:booking.successTitle', 'Booking request sent') : t('villas:booking.enquirySuccessTitle', 'Enquiry sent')}
                </h3>
                <p className="text-gray-600 mb-5 text-sm leading-relaxed">
                  {isForRent
                    ? t('villas:booking.successBody', 'The villa host will call you on {{phone}} to confirm availability and arrange your stay.', { phone: form.phone })
                    : t('villas:booking.enquirySuccessBody', 'The villa owner will call you on {{phone}} with the details and to arrange a viewing.', { phone: form.phone })}
                </p>
                <div className="text-left mb-5"><Disclaimer /></div>
                <button
                  onClick={onClose}
                  className="px-6 py-2.5 rounded-lg font-semibold text-white transition-opacity hover:opacity-90"
                  style={{ background: 'linear-gradient(135deg, #B8860B 0%, #E8B820 100%)' }}
                >
                  {t('common:close', 'Close')}
                </button>
              </div>
            ) : (
              <>
                {/* Villa preview + price */}
                <div className="flex gap-3 mb-5 p-3 bg-neutral-50 rounded-xl">
                  {property.imageUrl && (
                    <img
                      src={optimizeCloudinaryUrl(property.imageUrl, { width: 160, quality: 'auto', crop: 'fill' })}
                      alt={property.title}
                      loading="lazy"
                      decoding="async"
                      className="w-20 h-20 rounded-lg object-cover flex-shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-neutral-900 truncate">{property.title}</p>
                    <p className="text-sm text-neutral-500 truncate">{property.city}{property.country ? `, ${property.country}` : ''}</p>
                    {!property.isNegotiable && property.price > 0 ? (
                      <p className="text-base font-bold mt-1" style={{ color: '#B8860B' }}>
                        {formatPrice(property.price, property.country)}
                        {isForRent && <span className="text-xs font-semibold text-neutral-400"> {t('villas:booking.perNight', '/ night')}</span>}
                      </p>
                    ) : (
                      <p className="text-sm font-bold mt-1" style={{ color: '#B8860B' }}>{t('villas:booking.byNegotiation', 'By negotiation')}</p>
                    )}
                  </div>
                </div>

                {/* "How it works" — call-you note */}
                <div className="flex items-start gap-2 mb-4 rounded-xl border border-[#E8B820]/30 bg-[#FFFBEE] p-3">
                  <span className="text-lg leading-none">📞</span>
                  <p className="text-[12px] leading-relaxed text-neutral-700">
                    {isForRent
                      ? t('villas:booking.callYouNote', 'No online payment. Send your request and the villa host calls you directly to confirm dates, price and arrange your stay.')
                      : t('villas:booking.enquireNote', 'No online payment. Send your enquiry and the villa owner calls you directly with the details and to arrange a viewing.')}
                  </p>
                </div>

                {error && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-700 text-sm">{error}</p>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  {isForRent && (<>
                  {/* Dates */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelCls} htmlFor="vbk-in">{t('villas:booking.checkIn', 'Check-in')} *</label>
                      <input
                        id="vbk-in" type="date" className={inputCls}
                        min={todayISO()}
                        value={form.checkIn}
                        onChange={(e) => {
                          const v = e.target.value;
                          update('checkIn', v);
                          if (form.checkOut && nightsBetween(v, form.checkOut) <= 0) update('checkOut', addDaysISO(v, 1));
                        }}
                        required
                      />
                    </div>
                    <div>
                      <label className={labelCls} htmlFor="vbk-out">{t('villas:booking.checkOut', 'Check-out')} *</label>
                      <input
                        id="vbk-out" type="date" className={inputCls}
                        min={form.checkIn ? addDaysISO(form.checkIn, 1) : addDaysISO(todayISO(), 1)}
                        value={form.checkOut}
                        onChange={(e) => update('checkOut', e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  {/* Guests + nights/estimate */}
                  <div className="grid grid-cols-2 gap-3 items-end">
                    <div>
                      <label className={labelCls} htmlFor="vbk-guests">{t('villas:booking.guests', 'Guests')} *</label>
                      <select id="vbk-guests" className={inputCls} value={form.guests}
                              onChange={(e) => update('guests', Number(e.target.value))}>
                        {Array.from({ length: 20 }, (_, i) => i + 1).map(n => (
                          <option key={n} value={n}>{n} {n === 1 ? t('villas:booking.guest', 'guest') : t('villas:booking.guestsPlural', 'guests')}</option>
                        ))}
                      </select>
                    </div>
                    <div className="text-right">
                      {nights > 0 && (
                        <p className="text-xs text-neutral-500">
                          {nights} {nights === 1 ? t('villas:booking.night', 'night') : t('villas:booking.nightsPlural', 'nights')}
                          {showEstimate && (
                            <span className="block text-sm font-bold text-neutral-800">
                              ≈ {formatPrice(estimateTotal, property.country)}
                            </span>
                          )}
                        </p>
                      )}
                    </div>
                  </div>
                  {showEstimate && (
                    <p className="-mt-2 text-[11px] text-neutral-400">
                      {t('villas:booking.estimateNote', 'Estimate only — the host confirms the final price when they call.')}
                    </p>
                  )}
                  </>)}

                  {/* Name */}
                  <div>
                    <label className={labelCls} htmlFor="vbk-name">{t('villas:booking.name', 'Full name')} *</label>
                    <input id="vbk-name" type="text" className={inputCls} value={form.name}
                           onChange={(e) => update('name', e.target.value)} placeholder={t('villas:booking.namePh', 'Your full name')} required />
                  </div>

                  {/* Phone — the host calls this number */}
                  <div>
                    <label className={labelCls}>{t('villas:booking.phone', 'Phone number')} * <span className="font-normal text-neutral-400">— {t('villas:booking.phoneHint', 'the host will call this number')}</span></label>
                    <PhoneInput value={form.phone} onChange={(v) => update('phone', v)} />
                  </div>

                  {/* Email */}
                  <div>
                    <label className={labelCls} htmlFor="vbk-email">{t('villas:booking.email', 'Email')} *</label>
                    <input id="vbk-email" type="email" className={inputCls} value={form.email}
                           onChange={(e) => update('email', e.target.value)} placeholder={t('villas:booking.emailPh', 'you@example.com')} required />
                  </div>

                  {/* Notes */}
                  <div>
                    <label className={labelCls} htmlFor="vbk-notes">{t('villas:booking.notes', 'Notes for the host')} <span className="font-normal text-neutral-400">({t('common:optional', 'optional')})</span></label>
                    <textarea id="vbk-notes" rows={2} className={`${inputCls} resize-none`} value={form.notes}
                              onChange={(e) => update('notes', e.target.value)}
                              placeholder={t('villas:booking.notesPh', 'Arrival time, special requests…')} />
                  </div>

                  <Disclaimer />

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3 px-4 rounded-lg font-bold text-white disabled:opacity-50 transition-opacity hover:opacity-90 flex items-center justify-center gap-2"
                    style={{ background: 'linear-gradient(135deg, #141009 0%, #4a3d1f 55%, #B8860B 100%)' }}
                  >
                    {isSubmitting ? (
                      <>
                        <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        {t('villas:booking.sending', 'Sending…')}
                      </>
                    ) : (
                      <>✦ {t('villas:booking.submit', 'Request booking')}</>
                    )}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );

  return createPortal(content, document.body);
};

export default VillaBookingModal;
