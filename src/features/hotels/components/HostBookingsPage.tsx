import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { useAppContext } from '@/context/AppContext';
import { useHostBookings, useUpdateBookingStatus } from '../hooks';
import { CURRENCY_SYMBOLS, type HotelBooking, type BookingStatus } from '@/src/shared/types/hotel.types';
import { CalendarIcon, UsersIcon, PhoneIcon, EnvelopeIcon, HomeIcon, CheckIcon, XMarkIcon } from '@/constants';

const STATUS_STYLES: Record<BookingStatus, string> = {
  pending: 'bg-amber-100 text-amber-700',
  confirmed: 'bg-emerald-100 text-emerald-700',
  declined: 'bg-red-100 text-red-600',
  cancelled: 'bg-neutral-200 text-neutral-500',
};

const FILTERS: Array<BookingStatus | 'all'> = ['all', 'pending', 'confirmed', 'declined'];

interface HostBookingsPageProps {
  onBack: () => void;
}

const HostBookingsPage: React.FC<HostBookingsPageProps> = ({ onBack }) => {
  const { t, i18n } = useTranslation('hotels');
  const { dispatch } = useAppContext();
  const [filter, setFilter] = useState<BookingStatus | 'all'>('all');
  const { bookings, pendingCount, isLoading } = useHostBookings(true, filter === 'all' ? undefined : filter);
  const { updateStatus, isLoading: updating } = useUpdateBookingStatus();
  const [actingId, setActingId] = useState<string | null>(null);

  const fmt = useCallback((iso: string) => {
    try { return new Date(iso).toLocaleDateString(i18n.language, { day: 'numeric', month: 'short', year: 'numeric' }); }
    catch { return iso; }
  }, [i18n.language]);

  const act = useCallback(async (booking: HotelBooking, status: BookingStatus) => {
    setActingId(booking.id);
    try {
      await updateStatus({ id: booking.id, status });
    } catch (err: any) {
      dispatch({ type: 'SHOW_ALERT', payload: { type: 'error', title: t('form.errors.generic'), message: err?.message || '' } });
    } finally {
      setActingId(null);
    }
  }, [updateStatus, dispatch, t]);

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <button onClick={onBack} className="text-sm text-white/70 hover:text-white font-medium mb-4">
            ← {t('bookings.backToManage')}
          </button>
          <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-2">
            <CalendarIcon className="w-7 h-7" /> {t('bookings.title')}
          </h1>
          <p className="mt-1 text-white/70 text-sm">{t('bookings.subtitle')}</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Filters */}
        <div className="flex items-center gap-2 mb-5 overflow-x-auto no-scrollbar">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`shrink-0 px-3.5 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                filter === f ? 'bg-primary text-white border-primary' : 'bg-white text-neutral-600 border-neutral-200 hover:border-neutral-300'
              }`}
            >
              {t(`bookings.filter.${f}`)}
              {f === 'pending' && pendingCount > 0 && (
                <span className="ml-1.5 text-xs font-bold">{pendingCount}</span>
              )}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-32 rounded-2xl bg-white border border-neutral-200 animate-pulse" />
            ))}
          </div>
        ) : bookings.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-indigo-100 to-cyan-100 flex items-center justify-center">
              <CalendarIcon className="w-8 h-8 text-indigo-400" />
            </div>
            <p className="text-neutral-600 font-medium">{t('bookings.empty')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {bookings.map((b, i) => {
              const symbol = CURRENCY_SYMBOLS[b.currency] || '€';
              return (
                <motion.div
                  key={b.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="bg-white rounded-2xl border border-neutral-200 p-5 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-neutral-900 break-words">{b.guestName}</h3>
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${STATUS_STYLES[b.status]}`}>
                          {t(`bookings.status.${b.status}`)}
                        </span>
                      </div>
                      <p className="mt-0.5 flex items-center gap-1 text-sm text-neutral-500">
                        <HomeIcon className="w-4 h-4" /> {b.hotel?.name} · {b.roomName}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-lg font-extrabold text-neutral-900">{symbol}{b.totalPrice}</p>
                      <p className="text-xs text-neutral-400">{t('detail.booking.nightsCount', { count: b.nights })}</p>
                    </div>
                  </div>

                  {/* Facts */}
                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13px] text-neutral-600">
                    <span className="inline-flex items-center gap-1.5"><CalendarIcon className="w-4 h-4 text-neutral-400" /> {fmt(b.checkIn)} → {fmt(b.checkOut)}</span>
                    <span className="inline-flex items-center gap-1.5"><UsersIcon className="w-4 h-4 text-neutral-400" /> {t('detail.sleeps', { count: b.guests })}</span>
                  </div>

                  {b.message && (
                    <p className="mt-3 text-sm text-neutral-600 bg-neutral-50 rounded-xl p-3 border border-neutral-100">{b.message}</p>
                  )}

                  {/* Contact + actions */}
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <a href={`tel:${b.guestPhone}`} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-300 text-neutral-700 text-sm font-medium hover:bg-neutral-50">
                      <PhoneIcon className="w-4 h-4" /> {b.guestPhone}
                    </a>
                    {b.guestEmail && (
                      <a href={`mailto:${b.guestEmail}`} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-300 text-neutral-700 text-sm font-medium hover:bg-neutral-50">
                        <EnvelopeIcon className="w-4 h-4" /> {t('detail.email')}
                      </a>
                    )}
                    {b.status === 'pending' && (
                      <div className="flex items-center gap-2 ml-auto">
                        <button
                          onClick={() => act(b, 'declined')}
                          disabled={updating && actingId === b.id}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50 disabled:opacity-50"
                        >
                          <XMarkIcon className="w-4 h-4" /> {t('bookings.decline')}
                        </button>
                        <button
                          onClick={() => act(b, 'confirmed')}
                          disabled={updating && actingId === b.id}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
                        >
                          <CheckIcon className="w-4 h-4" /> {t('bookings.confirm')}
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default HostBookingsPage;
