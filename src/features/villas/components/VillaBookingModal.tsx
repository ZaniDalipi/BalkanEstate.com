import React, { useState, useEffect, useMemo, useRef, useId } from 'react';
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
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

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

  // Dialog behaviour: lock the page behind it, close on Escape, keep focus in.
  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    document.body.style.overflow = 'hidden';

    const focusable = () => Array.from(
      dialogRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      ) ?? []
    );

    focusable()[0]?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;
      const items = focusable();
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus?.();
    };
  }, [isOpen, onClose]);

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

  // Apple-minimal field styling: soft inset fill, hairline border, calm gold focus ring
  const inputCls = 'block w-full text-[15px] text-neutral-900 rounded-xl px-3.5 py-3 bg-neutral-100 border border-black/[0.10] placeholder:text-neutral-400 focus:outline-none focus:bg-white focus:border-[#C9A227]/60 focus:ring-[3px] focus:ring-[#C9A227]/15 transition-all duration-200';
  const labelCls = 'block text-[13px] font-medium text-neutral-600 mb-1.5 tracking-[-0.01em]';

  // Liability disclaimer — quiet fine print, not a loud banner
  const Disclaimer = () => (
    <p className="text-[11px] leading-relaxed text-neutral-400">
      {t('villas:booking.disclaimer', 'BalkanEstate is a listings platform only. We are not a party to this booking, handle no payments, and accept no responsibility or liability for the booking, the property, your stay, payments, or any dealings between you and the host. All arrangements are made directly with the host at your own risk.')}
    </p>
  );

  const content = (
    <>
      <style>{`
        @keyframes vbk-fade { from { opacity:0 } to { opacity:1 } }
        @keyframes vbk-pop { from { opacity:0; transform: scale(0.97) translateY(12px) } to { opacity:1; transform: scale(1) translateY(0) } }
      `}</style>
      <div
        className="fixed inset-0 z-[99999] flex items-end sm:items-center justify-center p-0 sm:p-4"
        style={{ backgroundColor: 'rgba(0,0,0,0.28)', backdropFilter: 'blur(14px) saturate(120%)', WebkitBackdropFilter: 'blur(14px) saturate(120%)', animation: 'vbk-fade 0.25s ease-out' }}
        onClick={(e) => { e.stopPropagation(); onClose(); }}
        onMouseDown={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          className="w-full sm:max-w-[440px] sm:rounded-[28px] rounded-t-[28px] max-h-[92vh] overflow-y-auto overscroll-contain"
          style={{
            fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Inter, sans-serif',
            background: 'rgba(255,255,255,0.96)',
            backdropFilter: 'blur(40px) saturate(180%)',
            WebkitBackdropFilter: 'blur(40px) saturate(180%)',
            boxShadow: '0 24px 70px rgba(0,0,0,0.28), 0 2px 8px rgba(0,0,0,0.10), inset 0 1px 0 rgba(255,255,255,0.7)',
            animation: 'vbk-pop 0.34s cubic-bezier(0.32,0.72,0,1)',
          }}
          onClick={e => e.stopPropagation()}
        >
          {/* Header — minimal, frosted, hairline separator */}
          <div className="px-6 pt-5 pb-4 flex items-start justify-between sticky top-0 z-10 border-b border-black/[0.06]"
               style={{ background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}>
            <div className="min-w-0">
              <h2 id={titleId} className="text-[19px] font-semibold text-neutral-900 tracking-[-0.02em] flex items-center gap-1.5">
                <span className="text-[#C9A227] text-[12px]" aria-hidden="true">✦</span>
                {isForRent ? t('villas:booking.title', 'Request to Book') : t('villas:booking.enquireTitle', 'Request Details')}
              </h2>
              <p className="text-[13px] text-neutral-400 line-clamp-1 mt-0.5">{property.title}</p>
            </div>
            <button
              onClick={onClose}
              className="flex items-center justify-center w-8 h-8 rounded-full text-neutral-500 hover:text-neutral-800 flex-shrink-0 -mr-1 transition-colors"
              style={{ background: 'rgba(120,120,128,0.12)' }}
              aria-label={t('common:close', 'Close')}
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          <div className="px-6 py-5">
            {success ? (
              <div className="text-center py-6">
                <div className="mx-auto flex items-center justify-center h-14 w-14 rounded-full mb-4"
                     style={{ background: 'rgba(201,162,39,0.12)' }}>
                  <svg className="h-7 w-7" style={{ color: '#C9A227' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                  </svg>
                </div>
                <h3 className="text-[20px] font-semibold text-neutral-900 tracking-[-0.02em] mb-1.5">
                  {isForRent ? t('villas:booking.successTitle', 'Booking request sent') : t('villas:booking.enquirySuccessTitle', 'Enquiry sent')}
                </h3>
                <p className="text-neutral-500 mb-6 text-[14px] leading-relaxed max-w-[320px] mx-auto">
                  {isForRent
                    ? t('villas:booking.successBody', 'The villa host will call you on {{phone}} to confirm availability and arrange your stay.', { phone: form.phone })
                    : t('villas:booking.enquirySuccessBody', 'The villa owner will call you on {{phone}} with the details and to arrange a viewing.', { phone: form.phone })}
                </p>
                <button
                  onClick={onClose}
                  className="w-full py-3.5 rounded-2xl font-semibold text-[16px] text-white transition-transform active:scale-[0.98]"
                  style={{ background: '#1d1d1f', boxShadow: '0 1px 2px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.12)' }}
                >
                  {t('common:done', 'Done')}
                </button>
                <div className="text-left mt-5 pt-4 border-t border-black/[0.06]"><Disclaimer /></div>
              </div>
            ) : (
              <>
                {/* Villa preview + price */}
                <div className="flex gap-3.5 mb-5 items-center">
                  {property.imageUrl && (
                    <img
                      src={optimizeCloudinaryUrl(property.imageUrl, { width: 160, quality: 'auto', crop: 'fill' })}
                      alt={property.title}
                      loading="lazy"
                      decoding="async"
                      className="w-[68px] h-[68px] rounded-2xl object-cover flex-shrink-0"
                      style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.12)' }}
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-[15px] font-semibold text-neutral-900 tracking-[-0.01em] truncate">{property.title}</p>
                    <p className="text-[13px] text-neutral-400 truncate">{property.city}{property.country ? `, ${property.country}` : ''}</p>
                    {!property.isNegotiable && property.price > 0 ? (
                      <p className="text-[15px] font-semibold mt-0.5 text-neutral-900">
                        {formatPrice(property.price, property.country)}
                        {isForRent && <span className="text-[13px] font-normal text-neutral-400"> {t('villas:booking.perNight', '/ night')}</span>}
                      </p>
                    ) : (
                      <p className="text-[14px] font-semibold mt-0.5 text-neutral-900">{t('villas:booking.byNegotiation', 'By negotiation')}</p>
                    )}
                  </div>
                </div>

                {/* "How it works" — call-you note, quiet frosted row */}
                <div className="flex items-start gap-2.5 mb-5 rounded-2xl p-3.5" style={{ background: 'rgba(120,120,128,0.06)' }}>
                  <svg className="w-4 h-4 mt-0.5 flex-shrink-0 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                  </svg>
                  <p className="text-[12.5px] leading-relaxed text-neutral-500">
                    {isForRent
                      ? t('villas:booking.callYouNote', 'No online payment. Send your request and the villa host calls you directly to confirm dates, price and arrange your stay.')
                      : t('villas:booking.enquireNote', 'No online payment. Send your enquiry and the villa owner calls you directly with the details and to arrange a viewing.')}
                  </p>
                </div>

                {error && (
                  <div className="mb-4 px-3.5 py-3 rounded-xl" style={{ background: 'rgba(255,59,48,0.08)' }}>
                    <p className="text-[13px] text-[#d70015]">{error}</p>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
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

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3.5 px-4 rounded-2xl font-semibold text-[16px] text-white disabled:opacity-40 transition-transform active:scale-[0.98] flex items-center justify-center gap-2"
                    style={{ background: '#1d1d1f', boxShadow: '0 1px 2px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.12)' }}
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
                      isForRent ? t('villas:booking.submit', 'Request booking') : t('villas:booking.enquire', 'Request Details')
                    )}
                  </button>

                  {/* Quiet legal fine print */}
                  <div className="pt-1"><Disclaimer /></div>
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
