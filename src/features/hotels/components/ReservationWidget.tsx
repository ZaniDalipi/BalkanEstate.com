import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CURRENCY_SYMBOLS, type Hotel } from '@/src/shared/types/hotel.types';
import { CheckIcon, UsersIcon, CalendarIcon } from '@/constants';
import { useAppContext } from '@/context/AppContext';
import { useCreateBooking } from '../hooks';

interface ReservationWidgetProps {
  hotel: Hotel;
  /** Index of the room the guest is reserving (kept in the parent so room cards can preselect). */
  selectedRoomIndex: number;
  onSelectRoom: (index: number) => void;
}

const toISO = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (d: Date, days: number) => {
  const next = new Date(d);
  next.setDate(next.getDate() + days);
  return next;
};
const nightsBetween = (from: string, to: string): number => {
  if (!from || !to) return 0;
  const ms = new Date(to).getTime() - new Date(from).getTime();
  return ms > 0 ? Math.round(ms / 86_400_000) : 0;
};
const onlyDigits = (v?: string) => (v || '').replace(/[^\d]/g, '');

type Step = 'select' | 'details' | 'sent';

/**
 * Self-service reservation widget. The guest picks dates, guests and a room,
 * sees a live nightly breakdown + total, then submits a booking request that
 * is persisted for the host (and can also be sent straight to them on
 * WhatsApp). No account, no fee — simpler than an OTA.
 */
const ReservationWidget: React.FC<ReservationWidgetProps> = ({ hotel, selectedRoomIndex, onSelectRoom }) => {
  const { t, i18n } = useTranslation('hotels');
  const { state } = useAppContext();
  const currentUser = state.currentUser;
  const { createBooking, isLoading: submitting } = useCreateBooking();

  const rooms = hotel.rooms || [];
  const room = rooms[selectedRoomIndex] || rooms[0];

  const today = useMemo(() => new Date(), []);
  const minNights = hotel.minNights && hotel.minNights > 0 ? hotel.minNights : 1;

  const [checkIn, setCheckIn] = useState(() => toISO(addDays(today, 1)));
  const [checkOut, setCheckOut] = useState(() => toISO(addDays(today, 1 + minNights)));
  const [guests, setGuests] = useState(1);
  const [step, setStep] = useState<Step>('select');

  // Guest contact (prefilled from the signed-in user where possible)
  const [guestName, setGuestName] = useState(currentUser?.name ?? '');
  const [guestPhone, setGuestPhone] = useState(currentUser?.phone ?? '');
  const [guestEmail, setGuestEmail] = useState(currentUser?.email ?? '');
  const [message, setMessage] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const nights = nightsBetween(checkIn, checkOut);
  const symbol = room ? CURRENCY_SYMBOLS[room.currency] || CURRENCY_SYMBOLS[hotel.currency] || '€' : '€';
  const subtotal = room && nights > 0 ? nights * room.pricePerNight : 0;

  const belowMinNights = nights > 0 && nights < minNights;
  const aboveMaxNights = hotel.maxNights != null && nights > hotel.maxNights;
  const tooManyGuests = !!room && guests > room.maxGuests;
  const canRequest = !!room && nights > 0 && !belowMinNights && !aboveMaxNights && !tooManyGuests;

  const fmtDate = (iso: string) => {
    if (!iso) return '';
    try { return new Date(iso).toLocaleDateString(i18n.language, { day: 'numeric', month: 'short', year: 'numeric' }); }
    catch { return iso; }
  };

  const buildMessage = () => [
    t('detail.booking.messageIntro', { name: hotel.name }),
    `• ${t('detail.booking.roomLabel')}: ${room?.name ?? ''}`,
    `• ${t('detail.booking.checkIn')}: ${fmtDate(checkIn)}`,
    `• ${t('detail.booking.checkOut')}: ${fmtDate(checkOut)}`,
    `• ${t('detail.booking.nights')}: ${nights}`,
    `• ${t('detail.booking.guests')}: ${guests}`,
    `• ${t('detail.booking.estimatedTotal')}: ${symbol}${subtotal}`,
    message ? `\n${message}` : '',
  ].filter(Boolean).join('\n');

  const openHostChannel = () => {
    const text = buildMessage();
    const waDigits = onlyDigits(hotel.whatsapp) || onlyDigits(hotel.contactPhone);
    if (hotel.whatsapp && waDigits) {
      window.open(`https://wa.me/${waDigits}?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
    } else if (hotel.contactEmail) {
      window.location.href = `mailto:${hotel.contactEmail}?subject=${encodeURIComponent(t('detail.booking.emailSubject', { name: hotel.name }))}&body=${encodeURIComponent(text)}`;
    } else if (waDigits) {
      window.location.href = `https://wa.me/${waDigits}?text=${encodeURIComponent(text)}`;
    } else {
      window.location.href = `tel:${hotel.contactPhone}`;
    }
  };

  const handleSend = async () => {
    setFormError(null);
    if (!guestName.trim()) { setFormError(t('detail.booking.nameRequired')); return; }
    if (onlyDigits(guestPhone).length < 6) { setFormError(t('detail.booking.phoneRequired')); return; }
    try {
      await createBooking({
        hotelId: hotel.id,
        roomName: room.name,
        checkIn,
        checkOut,
        guests,
        guestName: guestName.trim(),
        guestPhone: guestPhone.trim(),
        guestEmail: guestEmail.trim() || undefined,
        message: message.trim() || undefined,
      });
      setStep('sent');
    } catch (err: any) {
      setFormError(err?.message || t('detail.booking.sendError'));
    }
  };

  const dateInputClass = 'w-full bg-transparent text-sm font-medium text-neutral-900 outline-none';
  const fieldClass = 'w-full rounded-xl border border-neutral-300 px-3 py-2.5 text-sm text-neutral-900 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20';

  // ---- Success state ----
  if (step === 'sent') {
    return (
      <div className="p-6 border-b border-neutral-100 text-center">
        <div className="mx-auto mb-3 w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
          <CheckIcon className="w-7 h-7" />
        </div>
        <h3 className="text-base font-bold text-neutral-900">{t('detail.booking.sentTitle')}</h3>
        <p className="mt-1 text-sm text-neutral-500">{t('detail.booking.sentBody')}</p>
        <button
          type="button"
          onClick={openHostChannel}
          className="mt-4 w-full py-3 rounded-xl bg-primary text-white font-semibold hover:bg-primary/90 transition-colors"
        >
          {t('detail.booking.messageHost')}
        </button>
      </div>
    );
  }

  return (
    <div className="p-5 border-b border-neutral-100">
      {/* Date range */}
      <div className="grid grid-cols-2 rounded-xl border border-neutral-300 overflow-hidden">
        <label className="p-3 border-r border-neutral-300 cursor-pointer">
          <span className="block text-[11px] font-semibold uppercase tracking-wide text-neutral-400">{t('detail.booking.checkIn')}</span>
          <input
            type="date"
            value={checkIn}
            min={toISO(today)}
            onChange={(e) => {
              const v = e.target.value;
              setCheckIn(v);
              if (nightsBetween(v, checkOut) < 1) setCheckOut(toISO(addDays(new Date(v), minNights)));
            }}
            className={dateInputClass}
          />
        </label>
        <label className="p-3 cursor-pointer">
          <span className="block text-[11px] font-semibold uppercase tracking-wide text-neutral-400">{t('detail.booking.checkOut')}</span>
          <input
            type="date"
            value={checkOut}
            min={toISO(addDays(new Date(checkIn || toISO(today)), 1))}
            onChange={(e) => setCheckOut(e.target.value)}
            className={dateInputClass}
          />
        </label>
      </div>

      {/* Guests */}
      <div className="mt-2 flex items-center justify-between rounded-xl border border-neutral-300 px-3 py-2.5">
        <span className="flex items-center gap-2 text-sm text-neutral-600">
          <UsersIcon className="w-4 h-4 text-neutral-400" /> {t('detail.booking.guests')}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setGuests((g) => Math.max(1, g - 1))}
            disabled={guests <= 1}
            className="w-7 h-7 rounded-lg border border-neutral-300 text-neutral-600 hover:border-primary hover:text-primary disabled:opacity-30 flex items-center justify-center"
            aria-label={t('form.fields.decreaseQuantity')}
          >−</button>
          <span className="w-8 text-center text-sm font-semibold tabular-nums">{guests}</span>
          <button
            type="button"
            onClick={() => setGuests((g) => Math.min(30, g + 1))}
            className="w-7 h-7 rounded-lg border border-neutral-300 text-neutral-600 hover:border-primary hover:text-primary flex items-center justify-center"
            aria-label={t('form.fields.increaseQuantity')}
          >+</button>
        </div>
      </div>

      {/* Room selector */}
      {rooms.length > 1 && (
        <div className="mt-2">
          <select
            value={selectedRoomIndex}
            onChange={(e) => onSelectRoom(Number(e.target.value))}
            className={fieldClass}
          >
            {rooms.map((r, i) => (
              <option key={r._id || i} value={i}>
                {r.name} — {CURRENCY_SYMBOLS[r.currency] || symbol}{r.pricePerNight}/{t('card.night')}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Warnings */}
      {(belowMinNights || aboveMaxNights || tooManyGuests) && (
        <div className="mt-2 space-y-1">
          {belowMinNights && <p className="text-xs text-amber-600">{t('detail.booking.minNightsWarning', { count: minNights })}</p>}
          {aboveMaxNights && <p className="text-xs text-amber-600">{t('detail.booking.maxNightsWarning', { count: hotel.maxNights })}</p>}
          {tooManyGuests && <p className="text-xs text-amber-600">{t('detail.booking.guestsWarning', { count: room?.maxGuests || 0 })}</p>}
        </div>
      )}

      {/* Price breakdown */}
      {room && nights > 0 && (
        <div className="mt-4 space-y-1.5 text-sm">
          <div className="flex items-center justify-between text-neutral-600">
            <span>{symbol}{room.pricePerNight} × {t('detail.booking.nightsCount', { count: nights })}</span>
            <span>{symbol}{subtotal}</span>
          </div>
          <div className="flex items-center justify-between pt-1.5 border-t border-neutral-100 font-semibold text-neutral-900">
            <span>{t('detail.booking.estimatedTotal')}</span>
            <span>{symbol}{subtotal}</span>
          </div>
        </div>
      )}

      {/* Guest details (revealed on request) */}
      {step === 'details' && (
        <div className="mt-4 space-y-2">
          <input
            type="text"
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
            placeholder={t('detail.booking.yourName')}
            className={fieldClass}
          />
          <input
            type="tel"
            value={guestPhone}
            onChange={(e) => setGuestPhone(e.target.value)}
            placeholder={t('detail.booking.yourPhone')}
            className={fieldClass}
          />
          <input
            type="email"
            value={guestEmail}
            onChange={(e) => setGuestEmail(e.target.value)}
            placeholder={t('detail.booking.yourEmail')}
            className={fieldClass}
          />
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={2}
            maxLength={1000}
            placeholder={t('detail.booking.messagePlaceholder')}
            className={fieldClass}
          />
          {formError && <p className="text-xs text-red-600">{formError}</p>}
        </div>
      )}

      {/* CTA */}
      {step === 'select' ? (
        <button
          type="button"
          onClick={() => setStep('details')}
          disabled={!canRequest}
          className="mt-4 w-full py-3 rounded-xl bg-primary text-white font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <CalendarIcon className="w-4 h-4" /> {t('detail.booking.requestToBook')}
        </button>
      ) : (
        <button
          type="button"
          onClick={handleSend}
          disabled={submitting}
          className="mt-4 w-full py-3 rounded-xl bg-primary text-white font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {submitting ? t('detail.booking.sending') : t('detail.booking.sendRequest')}
        </button>
      )}
      <p className="mt-2 flex items-center justify-center gap-1.5 text-center text-[11px] text-neutral-400">
        <CheckIcon className="w-3.5 h-3.5 text-emerald-500" /> {t('detail.booking.noChargeNote')}
      </p>
    </div>
  );
};

export default ReservationWidget;
