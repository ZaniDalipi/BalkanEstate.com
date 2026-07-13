import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { useHotel } from '../hooks';
import { CURRENCY_SYMBOLS } from '@/src/shared/types/hotel.types';
import {
  MapPinIcon, StarIconSolid, UsersIcon, PhoneIcon, EnvelopeIcon, GlobeAltIcon,
  CheckIcon, CheckBadgeIcon, HomeIcon,
} from '@/constants';
import { optimizeCloudinaryUrl } from '@/config/cloudinaryConfig';

interface HotelDetailPageProps {
  hotelId: string;
  onBack: () => void;
}

const HotelDetailPage: React.FC<HotelDetailPageProps> = ({ hotelId, onBack }) => {
  const { t } = useTranslation('hotels');
  const { hotel, isLoading, error } = useHotel(hotelId);
  const [activeImage, setActiveImage] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-10 w-10 border-4 border-primary/30 border-t-primary rounded-full" />
      </div>
    );
  }

  if (error || !hotel) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-neutral-600">{t('detail.notFound')}</p>
        <button onClick={onBack} className="px-5 py-2.5 rounded-xl bg-primary text-white font-medium">
          {t('detail.backToList')}
        </button>
      </div>
    );
  }

  const currencySymbol = CURRENCY_SYMBOLS[hotel.currency] || '€';
  const gallery = [
    ...(hotel.coverImageUrl ? [{ url: hotel.coverImageUrl }] : []),
    ...(hotel.images || []),
  ];
  const heroImage = activeImage || gallery[0]?.url;

  const maxSleeps = hotel.rooms?.reduce((m, r) => Math.max(m, r.maxGuests || 0), 0) || 0;

  return (
    <div className="min-h-screen bg-neutral-50 pb-16">
      {/* ===== Cinematic hero ===== */}
      <div className="relative h-[52vh] min-h-[360px] w-full overflow-hidden bg-gradient-to-br from-indigo-900 to-slate-900">
        {heroImage ? (
          <motion.img
            key={heroImage}
            src={optimizeCloudinaryUrl(heroImage, { width: 1600, quality: 'auto' })}
            alt={hotel.name}
            initial={{ scale: 1.08, opacity: 0.6 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-white/40">
            <HomeIcon className="w-24 h-24" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-black/40" />

        {/* Floating back button (glass) */}
        <button
          onClick={onBack}
          className="absolute top-5 left-4 sm:left-6 z-10 flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur text-white text-sm font-medium transition-colors"
        >
          ← {t('detail.backToList')}
        </button>

        {/* Badges top-right */}
        <div className="absolute top-5 right-4 sm:right-6 z-10 flex items-center gap-2">
          {hotel.isVerified && (
            <span className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-emerald-500 text-white text-xs font-semibold shadow-lg">
              <CheckBadgeIcon className="w-4 h-4" /> {t('card.verified')}
            </span>
          )}
        </div>

        {/* Title overlay */}
        <div className="absolute inset-x-0 bottom-0 z-10 p-4 sm:p-8">
          <div className="max-w-5xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2.5 py-1 rounded-full bg-white/20 backdrop-blur text-white text-xs font-semibold">
                  {t(`propertyTypes.${hotel.propertyType}`)}
                </span>
                {hotel.starRating ? (
                  <span className="flex items-center gap-0.5 px-2 py-1 rounded-full bg-amber-400/90 text-amber-950 text-xs font-bold">
                    {Array.from({ length: hotel.starRating }).map((_, i) => (
                      <StarIconSolid key={i} className="w-3 h-3" />
                    ))}
                  </span>
                ) : null}
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold text-white drop-shadow-lg">{hotel.name}</h1>
              <p className="mt-1.5 flex items-center gap-1.5 text-white/85 text-sm">
                <MapPinIcon className="w-4 h-4" />
                {hotel.address || `${hotel.city}, ${hotel.country}`}
              </p>
            </motion.div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 -mt-6 relative z-20">
        {/* Colorful quick-stats bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white rounded-2xl shadow-xl shadow-black/5 border border-neutral-100 p-4 mb-6"
        >
          {[
            { icon: <HomeIcon className="w-5 h-5" />, label: t('card.roomsCount', { count: hotel.rooms?.length || 0 }), grad: 'from-blue-500 to-indigo-600' },
            { icon: <UsersIcon className="w-5 h-5" />, label: t('detail.sleeps', { count: maxSleeps }), grad: 'from-emerald-500 to-teal-600' },
            { icon: <CheckIcon className="w-5 h-5" />, label: t('detail.amenitiesCount', { count: hotel.amenities?.length || 0 }), grad: 'from-fuchsia-500 to-purple-600' },
            { icon: <StarIconSolid className="w-5 h-5" />, label: hotel.starRating ? t('detail.starLabel', { count: hotel.starRating }) : t('detail.unrated'), grad: 'from-amber-400 to-orange-500' },
          ].map((s, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${s.grad} text-white flex items-center justify-center shrink-0 shadow-md`}>
                {s.icon}
              </div>
              <span className="text-sm font-medium text-neutral-700 leading-tight">{s.label}</span>
            </div>
          ))}
        </motion.div>

        {/* Thumbnail gallery */}
        {gallery.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-2 mb-6 no-scrollbar">
            {gallery.map((img, i) => (
              <button
                key={i}
                onClick={() => setActiveImage(img.url)}
                className={`shrink-0 h-20 w-28 rounded-xl overflow-hidden border-2 transition-all ${
                  heroImage === img.url ? 'border-primary scale-105 shadow-md' : 'border-transparent opacity-80 hover:opacity-100'
                }`}
              >
                <img
                  src={optimizeCloudinaryUrl(img.url, { width: 200, quality: 'auto', crop: 'fill' })}
                  alt={`${hotel.name} ${i + 1}`}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main */}
          <div className="lg:col-span-2 space-y-6">
            {hotel.description && (
              <div className="bg-white rounded-2xl border border-neutral-200 p-6">
                <h2 className="text-lg font-semibold text-neutral-900 mb-3">{t('detail.about')}</h2>
                <p className="text-neutral-700 whitespace-pre-line leading-relaxed">{hotel.description}</p>
              </div>
            )}

            {/* Rooms */}
            <div className="bg-white rounded-2xl border border-neutral-200 p-6">
              <h2 className="text-lg font-semibold text-neutral-900 mb-4">{t('detail.rooms')}</h2>
              <div className="space-y-4">
                {hotel.rooms?.map((room, i) => (
                  <div
                    key={room._id || i}
                    className="group relative flex flex-col sm:flex-row rounded-2xl border border-neutral-200 overflow-hidden hover:border-primary/40 hover:shadow-lg transition-all"
                  >
                    {/* Left accent bar */}
                    <div className="hidden sm:block w-1.5 bg-gradient-to-b from-cyan-400 to-blue-600" />

                    {/* Content */}
                    <div className="flex-1 min-w-0 p-5">
                      <div className="flex items-start gap-2 flex-wrap">
                        <h3 className="font-semibold text-neutral-900 text-base break-words min-w-0">{room.name}</h3>
                        <span className="px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600 text-[11px] font-medium shrink-0">
                          {t(`roomTypes.${room.roomType}`)}
                        </span>
                      </div>

                      {/* Spec chips */}
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-neutral-50 border border-neutral-200 text-xs text-neutral-600">
                          <UsersIcon className="w-3.5 h-3.5" /> {t('detail.sleeps', { count: room.maxGuests })}
                        </span>
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-neutral-50 border border-neutral-200 text-xs text-neutral-600">
                          {t('detail.bedsCount', { count: room.beds })}
                        </span>
                        {room.bathrooms ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-neutral-50 border border-neutral-200 text-xs text-neutral-600">
                            {t('detail.bathroomsCount', { count: room.bathrooms })}
                          </span>
                        ) : null}
                        {room.sizeSqm ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-neutral-50 border border-neutral-200 text-xs text-neutral-600">
                            {room.sizeSqm} m²
                          </span>
                        ) : null}
                      </div>

                      {room.description && (
                        <p className="mt-3 text-sm text-neutral-600 leading-relaxed break-words line-clamp-3">
                          {room.description}
                        </p>
                      )}

                      {/* Per-room amenities */}
                      {room.amenities && room.amenities.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {room.amenities.map((a) => (
                            <span key={a} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary/5 text-primary text-[11px] font-medium">
                              <CheckIcon className="w-3 h-3" /> {t(`amenities.${a}`)}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Price panel */}
                    <div className="shrink-0 sm:w-44 border-t sm:border-t-0 sm:border-l border-neutral-100 bg-neutral-50/60 p-5 flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 text-right">
                      <div>
                        <p className="text-xs text-neutral-400">{t('card.from')}</p>
                        <p className="text-2xl font-extrabold text-neutral-900 leading-none">
                          {CURRENCY_SYMBOLS[room.currency] || currencySymbol}{room.pricePerNight}
                        </p>
                        <p className="text-xs text-neutral-400 mt-0.5">/ {t('card.night')}</p>
                      </div>
                      <a
                        href={`tel:${hotel.contactPhone}`}
                        className="px-4 py-2 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors whitespace-nowrap"
                      >
                        {t('detail.reserve')}
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Amenities */}
            {hotel.amenities?.length > 0 && (
              <div className="bg-white rounded-2xl border border-neutral-200 p-6">
                <h2 className="text-lg font-semibold text-neutral-900 mb-4">{t('detail.amenities')}</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {hotel.amenities.map((amenity) => (
                    <div key={amenity} className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-neutral-50 border border-neutral-100 text-sm text-neutral-700 hover:border-primary/30 hover:bg-primary/5 transition-colors">
                      <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                        <CheckIcon className="w-3.5 h-3.5" />
                      </span>
                      {t(`amenities.${amenity}`)}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Policies */}
            <div className="bg-white rounded-2xl border border-neutral-200 p-6">
              <h2 className="text-lg font-semibold text-neutral-900 mb-4">{t('detail.policies')}</h2>
              <dl className="grid grid-cols-2 gap-y-3 text-sm">
                {hotel.checkInTime && (<><dt className="text-neutral-500">{t('form.fields.checkIn')}</dt><dd className="text-neutral-900 text-right">{hotel.checkInTime}</dd></>)}
                {hotel.checkOutTime && (<><dt className="text-neutral-500">{t('form.fields.checkOut')}</dt><dd className="text-neutral-900 text-right">{hotel.checkOutTime}</dd></>)}
                {hotel.minNights != null && (<><dt className="text-neutral-500">{t('form.fields.minNights')}</dt><dd className="text-neutral-900 text-right">{hotel.minNights}</dd></>)}
                {hotel.cancellationPolicy && (<><dt className="text-neutral-500">{t('form.fields.cancellationPolicy')}</dt><dd className="text-neutral-900 text-right">{t(`cancellationPolicies.${hotel.cancellationPolicy}`)}</dd></>)}
                <dt className="text-neutral-500">{t('form.fields.petsAllowed')}</dt><dd className="text-neutral-900 text-right">{hotel.petsAllowed ? t('detail.yes') : t('detail.no')}</dd>
                <dt className="text-neutral-500">{t('form.fields.smokingAllowed')}</dt><dd className="text-neutral-900 text-right">{hotel.smokingAllowed ? t('detail.yes') : t('detail.no')}</dd>
              </dl>
              {hotel.houseRules?.length ? (
                <ul className="mt-4 list-disc list-inside text-sm text-neutral-600 space-y-1">
                  {hotel.houseRules.map((rule) => <li key={rule}>{rule}</li>)}
                </ul>
              ) : null}
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="lg:sticky lg:top-6 rounded-2xl overflow-hidden shadow-xl shadow-black/5 border border-neutral-100">
              {/* Gradient price header */}
              <div className="relative bg-gradient-to-br from-indigo-600 via-blue-600 to-cyan-500 p-6 text-white overflow-hidden">
                <div className="absolute -top-8 -right-6 w-28 h-28 bg-white/10 rounded-full blur-2xl" />
                <p className="text-sm text-white/70 relative">{t('card.from')}</p>
                <p className="text-4xl font-extrabold relative">
                  {currencySymbol}{hotel.priceFrom ?? '—'}
                  <span className="text-sm font-normal text-white/70"> / {t('card.night')}</span>
                </p>
                {hotel.minNights ? (
                  <p className="mt-1 text-xs text-white/70 relative">{t('detail.minNightsShort', { count: hotel.minNights })}</p>
                ) : null}
              </div>

              <div className="bg-white p-6">
                <div className="space-y-2">
                  <a href={`tel:${hotel.contactPhone}`} className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold hover:brightness-110 shadow-lg shadow-blue-500/25 transition-all">
                    <PhoneIcon className="w-4 h-4" /> {t('detail.callToBook')}
                  </a>
                  {hotel.contactEmail && (
                    <a href={`mailto:${hotel.contactEmail}`} className="flex items-center justify-center gap-2 w-full py-3 rounded-xl border border-neutral-300 text-neutral-700 font-medium hover:bg-neutral-50 transition-colors">
                      <EnvelopeIcon className="w-4 h-4" /> {t('detail.email')}
                    </a>
                  )}
                  {hotel.website && (
                    <a href={hotel.website} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 w-full py-3 rounded-xl border border-neutral-300 text-neutral-700 font-medium hover:bg-neutral-50 transition-colors">
                      <GlobeAltIcon className="w-4 h-4" /> {t('detail.website')}
                    </a>
                  )}
                </div>

                {/* Trust row */}
                <div className="mt-4 flex items-center justify-center gap-1.5 text-xs text-neutral-400">
                  <CheckBadgeIcon className="w-4 h-4 text-emerald-500" />
                  {t('detail.directBooking')}
                </div>

                {hotel.languagesSpoken?.length ? (
                  <div className="mt-5 pt-5 border-t border-neutral-100">
                    <p className="text-xs text-neutral-400 mb-1">{t('detail.languages')}</p>
                    <p className="text-sm text-neutral-700">{hotel.languagesSpoken.join(', ')}</p>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HotelDetailPage;
