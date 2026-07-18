import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CURRENCY_SYMBOLS, type Hotel } from '@/src/shared/types/hotel.types';
import { CheckIcon, UsersIcon, CalendarIcon } from '@/constants';

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

/**
 * Self-service reservation widget. The guest picks dates, guests and a room,
 * sees a live nightly breakdown + total, and sends a fully pre-filled booking
 * request straight to the host (WhatsApp → email → phone). No account, no fee —
 * simpler than an OTA, and the host gets every detail in one message.
 */
const ReservationWidget: React.FC<ReservationWidgetProps> = ({ hotel, selectedRoomIndex, onSelectRoom }) => {
  const { t, i18n } = useTranslation('hotels');
  const rooms = hotel.rooms || [];
  const room = rooms[selectedRoomIndex] || rooms[0];

  const today = useMemo(() => new Date(), []);
  const minNights = hotel.minNights && hotel.minNights > 0 ? hotel.minNights : 1;

  const [checkIn, setCheckIn] = useState(() => toISO(addDays(today, 1)));
  const [checkOut, setCheckOut] = useState(() => toISO(addDays(today, 1 + minNights)));
  const [guests, setGuests] = useState(1);

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

  const requestMessage = useMemo(() => {
    const lines = [
      t('detail.booking.messageIntro', { name: hotel.name }),
      `• ${t('detail.booking.roomLabel')}: ${room?.name ?? ''}`,
      `• ${t('detail.booking.checkIn')}: ${fmtDate(checkIn)}`,
      `• ${t('detail.booking.checkOut')}: ${fmtDate(checkOut)}`,
      `• ${t('detail.booking.nights')}: ${nights}`,
      `• ${t('detail.booking.guests')}: ${guests}`,
      `• ${t('detail.booking.estimatedTotal')}: ${symbol}${subtotal}`,
    ];
    return lines.join('\n');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hotel.name, room, checkIn, checkOut, nights, guests, symbol, subtotal, t, i18n.language]);

  const handleRequest = () => {
    if (!canRequest) return;
    const waDigits = onlyDigits(hotel.whatsapp) || onlyDigits(hotel.contactPhone);
    if (hotel.whatsapp && waDigits) {
      window.open(`https://wa.me/${waDigits}?text=${encodeURIComponent(requestMessage)}`, '_blank', 'noopener');
      return;
    }
    if (hotel.contactEmail) {
      const subject = t('detail.booking.emailSubject', { name: hotel.name });
      window.location.href = `mailto:${hotel.contactEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(requestMessage)}`;
      return;
    }
    if (waDigits) {
      window.location.href = `https://wa.me/${waDigits}?text=${encodeURIComponent(requestMessage)}`;
      return;
    }
    window.location.href = `tel:${hotel.contactPhone}`;
  };

  const dateInputClass = 'w-full bg-transparent text-sm font-medium text-neutral-900 outline-none';

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
            className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 text-sm text-neutral-900 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
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

      {/* CTA */}
      <button
        type="button"
        onClick={handleRequest}
        disabled={!canRequest}
        className="mt-4 w-full py-3 rounded-xl bg-primary text-white font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        <CalendarIcon className="w-4 h-4" /> {t('detail.booking.requestToBook')}
      </button>
      <p className="mt-2 flex items-center justify-center gap-1.5 text-center text-[11px] text-neutral-400">
        <CheckIcon className="w-3.5 h-3.5 text-emerald-500" /> {t('detail.booking.noChargeNote')}
      </p>
    </div>
  );
};

export default ReservationWidget;
