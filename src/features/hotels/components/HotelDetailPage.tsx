import React, { useState, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { useHotel, useHotelFavorites, useToggleHotelFavorite } from '../hooks';
import { CURRENCY_SYMBOLS } from '@/src/shared/types/hotel.types';
import ReservationWidget from './ReservationWidget';
import AmenitiesSection from './AmenitiesSection';
import {
  MapPinIcon, StarIconSolid, UsersIcon, PhoneIcon, EnvelopeIcon, GlobeAltIcon,
  CheckIcon, CheckBadgeIcon, HomeIcon, PhotoIcon, XMarkIcon, HeartIcon, ShareIcon, BedIcon,
} from '@/constants';
import { optimizeCloudinaryUrl } from '@/config/cloudinaryConfig';
import { useAppContext } from '@/context/AppContext';

interface HotelDetailPageProps {
  hotelId: string;
  onBack: () => void;
}

const HotelDetailPage: React.FC<HotelDetailPageProps> = ({ hotelId, onBack }) => {
  const { t } = useTranslation('hotels');
  const { state, dispatch } = useAppContext();
  const { hotel, isLoading, error } = useHotel(hotelId);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [selectedRoomIndex, setSelectedRoomIndex] = useState(0);
  const reserveRef = useRef<HTMLDivElement>(null);
  const { favoritedIds } = useHotelFavorites(state.isAuthenticated);
  const { toggle: toggleFavorite } = useToggleHotelFavorite();

  // Pre-select a room in the reservation widget and scroll to it (from a room card).
  const reserveRoom = useCallback((index: number) => {
    setSelectedRoomIndex(index);
    reserveRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const handleToggleSave = useCallback(() => {
    if (!hotel) return;
    if (!state.isAuthenticated) {
      dispatch({ type: 'TOGGLE_AUTH_MODAL', payload: { isOpen: true, view: 'login' } });
      return;
    }
    toggleFavorite(hotel);
  }, [hotel, state.isAuthenticated, dispatch, toggleFavorite]);

  const handleShare = useCallback(async () => {
    if (!hotel) return;
    const url = window.location.href;
    const shareData = { title: t('detail.shareTitle', { name: hotel.name }), url };
    if (navigator.share) {
      try { await navigator.share(shareData); return; } catch { /* user cancelled or unsupported — fall through */ }
    }
    try {
      await navigator.clipboard.writeText(url);
      dispatch({
        type: 'SHOW_ALERT',
        payload: { type: 'success', title: t('detail.share'), message: t('detail.linkCopied') },
      });
    } catch { /* clipboard unavailable — silently ignore */ }
  }, [hotel, t, dispatch]);

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
  const maxSleeps = hotel.rooms?.reduce((m, r) => Math.max(m, r.maxGuests || 0), 0) || 0;

  // Airbnb-style "why book here" highlights, derived from the listing data.
  const anyFreeCancellation = hotel.rooms?.some((r) => r.freeCancellation);
  const anyBreakfast = hotel.breakfastIncluded || hotel.rooms?.some((r) => r.breakfastIncluded);
  const highlights: Array<{ icon: React.ReactNode; title: string; subtitle: string }> = [];
  if (anyFreeCancellation) highlights.push({ icon: <CheckBadgeIcon className="w-5 h-5" />, title: t('detail.highlights.freeCancellationTitle'), subtitle: t('detail.highlights.freeCancellationSub') });
  if (anyBreakfast) highlights.push({ icon: <CheckIcon className="w-5 h-5" />, title: t('detail.highlights.breakfastTitle'), subtitle: t('detail.highlights.breakfastSub') });
  if (hotel.starRating && hotel.starRating >= 4) highlights.push({ icon: <StarIconSolid className="w-5 h-5" />, title: t('detail.highlights.topRatedTitle', { count: hotel.starRating }), subtitle: t('detail.highlights.topRatedSub') });
  if (hotel.amenities?.includes('reception_24h')) highlights.push({ icon: <HomeIcon className="w-5 h-5" />, title: t('detail.highlights.receptionTitle'), subtitle: t('detail.highlights.receptionSub') });
  if (highlights.length < 3) highlights.push({ icon: <CheckBadgeIcon className="w-5 h-5" />, title: t('detail.highlights.noFeesTitle'), subtitle: t('detail.highlights.noFeesSub') });

  const openLightbox = (i: number) => setLightboxIndex(i);
  const closeLightbox = () => setLightboxIndex(null);
  const prevImage = () => setLightboxIndex((i) => (i == null ? i : (i - 1 + gallery.length) % gallery.length));
  const nextImage = () => setLightboxIndex((i) => (i == null ? i : (i + 1) % gallery.length));

  return (
    <div className="min-h-screen bg-neutral-50 pb-16">
      <div className="max-w-5xl mx-auto px-4 pt-6">
        {/* Header bar */}
        <button onClick={onBack} className="text-sm text-neutral-500 hover:text-primary font-medium mb-3">
          ← {t('detail.backToList')}
        </button>
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                {t(`propertyTypes.${hotel.propertyType}`)}
              </span>
              {hotel.starRating ? (
                <span className="flex items-center gap-0.5 text-amber-400">
                  {Array.from({ length: hotel.starRating }).map((_, i) => (
                    <StarIconSolid key={i} className="w-4 h-4" />
                  ))}
                </span>
              ) : null}
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-neutral-900">{hotel.name}</h1>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-neutral-500">
              <MapPinIcon className="w-4 h-4" />
              {[hotel.address, hotel.neighborhood, hotel.postalCode].filter(Boolean).join(', ') || `${hotel.city}, ${hotel.country}`}
            </p>
          </div>
          {hotel.isVerified && (
            <span className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-emerald-50 text-emerald-600 text-xs font-semibold shrink-0">
              <CheckBadgeIcon className="w-4 h-4" /> {t('card.verified')}
            </span>
          )}
        </div>

        {/* ===== Booking-style photo mosaic ===== */}
        {gallery.length === 0 ? (
          <div className="w-full h-64 rounded-2xl bg-neutral-100 flex items-center justify-center text-neutral-300 mb-6">
            <HomeIcon className="w-16 h-16" />
          </div>
        ) : gallery.length === 1 ? (
          <button onClick={() => openLightbox(0)} className="block w-full mb-6 rounded-2xl overflow-hidden aspect-[16/9]">
            <img src={optimizeCloudinaryUrl(gallery[0].url, { width: 1400, quality: 'auto' })} alt={hotel.name} className="w-full h-full object-cover hover:brightness-95 transition" />
          </button>
        ) : (
          <div className="relative grid grid-cols-4 grid-rows-2 gap-2 h-[280px] sm:h-[420px] rounded-2xl overflow-hidden mb-6">
            <button onClick={() => openLightbox(0)} className="col-span-2 row-span-2 group overflow-hidden">
              <img src={optimizeCloudinaryUrl(gallery[0].url, { width: 1000, quality: 'auto', crop: 'fill' })} alt={hotel.name} className="w-full h-full object-cover group-hover:brightness-95 transition" />
            </button>
            {gallery.slice(1, 5).map((img, i) => {
              const idx = i + 1;
              const isLast = idx === 4 && gallery.length > 5;
              return (
                <button key={idx} onClick={() => openLightbox(idx)} className="relative group overflow-hidden">
                  <img src={optimizeCloudinaryUrl(img.url, { width: 500, quality: 'auto', crop: 'fill' })} alt={`${hotel.name} ${idx + 1}`} className="w-full h-full object-cover group-hover:brightness-95 transition" />
                  {isLast && (
                    <span className="absolute inset-0 bg-black/50 flex items-center justify-center text-white font-semibold text-lg">
                      +{gallery.length - 5}
                    </span>
                  )}
                </button>
              );
            })}
            <button
              onClick={() => openLightbox(0)}
              className="absolute bottom-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/90 hover:bg-white text-neutral-800 text-sm font-medium shadow"
            >
              <PhotoIcon className="w-4 h-4" /> {t('detail.showAllPhotos', { count: gallery.length })}
            </button>
          </div>
        )}
      </div>

      <div className="max-w-5xl mx-auto px-4 relative z-20">
        {/* Quick-stats bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white rounded-2xl border border-neutral-200 p-4 mb-6"
        >
          {[
            { icon: <HomeIcon className="w-5 h-5" />, label: t('card.roomsCount', { count: hotel.rooms?.length || 0 }), color: 'bg-blue-500' },
            { icon: <UsersIcon className="w-5 h-5" />, label: t('detail.sleeps', { count: maxSleeps }), color: 'bg-emerald-500' },
            { icon: <CheckIcon className="w-5 h-5" />, label: t('detail.amenitiesCount', { count: (hotel.amenities?.length || 0) + (hotel.customAmenities?.length || 0) }), color: 'bg-violet-500' },
            { icon: <StarIconSolid className="w-5 h-5" />, label: hotel.starRating ? t('detail.starLabel', { count: hotel.starRating }) : t('detail.unrated'), color: 'bg-amber-500' },
          ].map((s, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl ${s.color} text-white flex items-center justify-center shrink-0`}>
                {s.icon}
              </div>
              <span className="text-sm font-medium text-neutral-700 leading-tight">{s.label}</span>
            </div>
          ))}
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main */}
          <div className="lg:col-span-2 space-y-6">
            {/* Why book here — quick highlights */}
            {highlights.length > 0 && (
              <div className="bg-white rounded-2xl border border-neutral-200 divide-y divide-neutral-100 sm:divide-y-0 sm:grid sm:grid-cols-3 sm:divide-x">
                {highlights.slice(0, 3).map((h, i) => (
                  <div key={i} className="flex items-start gap-3 p-5">
                    <span className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">{h.icon}</span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-neutral-900 leading-tight">{h.title}</p>
                      <p className="mt-0.5 text-xs text-neutral-500 leading-snug">{h.subtitle}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

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
                {hotel.rooms?.map((room, i) => {
                  const bedSummary = room.bedConfiguration && room.bedConfiguration.length > 0
                    ? room.bedConfiguration.map((b) => `${b.quantity} ${t(`bedTypes.${b.bedType}`)}`).join(' · ')
                    : t('detail.bedsCount', { count: room.beds });
                  const roomThumb = room.images?.[0]?.url || hotel.coverImageUrl || hotel.images?.[0]?.url || null;
                  return (
                  <div
                    key={room._id || i}
                    className="group flex flex-col sm:flex-row rounded-2xl border border-neutral-200 bg-white overflow-hidden hover:border-primary/50 hover:shadow-[0_12px_32px_-12px_rgba(2,82,205,0.18)] transition-all"
                  >
                    {/* Room photo */}
                    {roomThumb && (
                      <button
                        type="button"
                        onClick={() => reserveRoom(i)}
                        className="sm:w-48 shrink-0 h-40 sm:h-auto relative overflow-hidden bg-neutral-100"
                        aria-label={room.name}
                      >
                        <img
                          src={optimizeCloudinaryUrl(roomThumb, { width: 500, quality: 'auto', crop: 'fill' })}
                          alt={room.name}
                          loading="lazy"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        {(room.images?.length || 0) > 1 && (
                          <span className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded-md bg-black/55 text-white text-[10px] font-medium">
                            {room.images!.length} <PhotoIcon className="inline w-3 h-3 -mt-0.5" />
                          </span>
                        )}
                      </button>
                    )}

                    {/* Content */}
                    <div className="flex-1 min-w-0 p-5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-neutral-900 text-[15px] break-words min-w-0">{room.name}</h3>
                        <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-semibold shrink-0">
                          {t(`roomTypes.${room.roomType}`)}
                        </span>
                      </div>

                      {/* Spec row — clean inline facts with icons */}
                      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13px] text-neutral-600">
                        <span className="inline-flex items-center gap-1.5">
                          <UsersIcon className="w-4 h-4 text-neutral-400" /> {t('detail.sleeps', { count: room.maxGuests })}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <BedIcon className="w-4 h-4 text-neutral-400" /> {bedSummary}
                        </span>
                        {room.bathrooms ? (
                          <span className="inline-flex items-center gap-1.5">
                            <CheckBadgeIcon className="w-4 h-4 text-neutral-400" /> {t('detail.bathroomsCount', { count: room.bathrooms })}
                          </span>
                        ) : null}
                        {room.sizeSqm ? (
                          <span className="inline-flex items-center gap-1.5">
                            <HomeIcon className="w-4 h-4 text-neutral-400" /> {room.sizeSqm} m²
                          </span>
                        ) : null}
                        {room.view && room.view !== 'none' ? (
                          <span className="inline-flex items-center gap-1.5">
                            <MapPinIcon className="w-4 h-4 text-neutral-400" /> {t(`roomViews.${room.view}`)}
                          </span>
                        ) : null}
                      </div>

                      {/* Booking perks */}
                      {(room.breakfastIncluded || room.freeCancellation || room.nonSmoking) && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {room.breakfastIncluded && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[11px] font-medium">
                              <CheckIcon className="w-3 h-3" /> {t('form.fields.breakfastIncluded')}
                            </span>
                          )}
                          {room.freeCancellation && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[11px] font-medium">
                              <CheckIcon className="w-3 h-3" /> {t('form.fields.freeCancellation')}
                            </span>
                          )}
                          {room.nonSmoking && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-600 text-[11px] font-medium">
                              <CheckIcon className="w-3 h-3" /> {t('form.fields.nonSmoking')}
                            </span>
                          )}
                        </div>
                      )}

                      {room.description && (
                        <p className="mt-3 text-sm text-neutral-600 leading-relaxed break-words line-clamp-3">
                          {room.description}
                        </p>
                      )}

                      {/* Per-room amenities */}
                      {((room.amenities && room.amenities.length > 0) || (room.customAmenities && room.customAmenities.length > 0)) && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {room.amenities?.map((a) => (
                            <span key={a} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary/5 text-primary text-[11px] font-medium">
                              <CheckIcon className="w-3 h-3" /> {t(`amenities.${a}`)}
                            </span>
                          ))}
                          {room.customAmenities?.map((a) => (
                            <span key={a} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 text-[11px] font-medium">
                              <CheckIcon className="w-3 h-3" /> {a}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Price panel */}
                    <div className="shrink-0 sm:w-52 border-t sm:border-t-0 sm:border-l border-neutral-100 bg-gradient-to-br from-neutral-50 to-white p-5 flex sm:flex-col items-end sm:items-stretch justify-between gap-3 sm:text-right">
                      <div>
                        <p className="leading-none">
                          <span className="text-2xl font-extrabold text-neutral-900">{CURRENCY_SYMBOLS[room.currency] || currencySymbol}{room.pricePerNight}</span>
                          <span className="text-sm font-normal text-neutral-400"> / {t('card.night')}</span>
                        </p>
                        {room.freeCancellation && (
                          <p className="mt-1.5 hidden sm:block text-[11px] font-medium text-emerald-600">
                            {t('form.fields.freeCancellation')}
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => reserveRoom(i)}
                        className="px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 shadow-sm shadow-primary/20 hover:shadow-md hover:shadow-primary/25 transition-all whitespace-nowrap"
                      >
                        {t('detail.reserve')}
                      </button>
                    </div>
                  </div>
                  );
                })}
              </div>
            </div>

            {/* Amenities — grouped "What this place offers" with a show-all modal */}
            {((hotel.amenities?.length || 0) > 0 || (hotel.customAmenities?.length || 0) > 0) && (
              <AmenitiesSection amenities={hotel.amenities || []} customAmenities={hotel.customAmenities} />
            )}

            {/* Policies */}
            <div className="bg-white rounded-2xl border border-neutral-200 p-6">
              <h2 className="text-lg font-semibold text-neutral-900 mb-4">{t('detail.policies')}</h2>
              <dl className="grid grid-cols-2 gap-y-3 text-sm">
                {hotel.checkInTime && (<><dt className="text-neutral-500">{t('form.fields.checkIn')}</dt><dd className="text-neutral-900 text-right">{hotel.checkInTime}</dd></>)}
                {hotel.checkOutTime && (<><dt className="text-neutral-500">{t('form.fields.checkOut')}</dt><dd className="text-neutral-900 text-right">{hotel.checkOutTime}</dd></>)}
                {hotel.minNights != null && (<><dt className="text-neutral-500">{t('form.fields.minNights')}</dt><dd className="text-neutral-900 text-right">{hotel.minNights}</dd></>)}
                {hotel.cancellationPolicy && (<><dt className="text-neutral-500">{t('form.fields.cancellationPolicy')}</dt><dd className="text-neutral-900 text-right">{t(`cancellationPolicies.${hotel.cancellationPolicy}`)}</dd></>)}
                {hotel.parkingType && (<><dt className="text-neutral-500">{t('form.fields.parkingType')}</dt><dd className="text-neutral-900 text-right">{t(`parkingTypes.${hotel.parkingType}`)}</dd></>)}
                {hotel.checkInMinAge != null && (<><dt className="text-neutral-500">{t('form.fields.checkInMinAge')}</dt><dd className="text-neutral-900 text-right">{hotel.checkInMinAge}+</dd></>)}
                <dt className="text-neutral-500">{t('form.fields.breakfastIncluded')}</dt><dd className="text-neutral-900 text-right">{hotel.breakfastIncluded ? t('detail.yes') : t('detail.no')}</dd>
                <dt className="text-neutral-500">{t('form.fields.prepaymentRequired')}</dt><dd className="text-neutral-900 text-right">{hotel.prepaymentRequired ? t('detail.yes') : t('detail.no')}</dd>
                <dt className="text-neutral-500">{t('form.fields.petsAllowed')}</dt><dd className="text-neutral-900 text-right">{hotel.petsAllowed ? t('detail.yes') : t('detail.no')}</dd>
                <dt className="text-neutral-500">{t('form.fields.smokingAllowed')}</dt><dd className="text-neutral-900 text-right">{hotel.smokingAllowed ? t('detail.yes') : t('detail.no')}</dd>
              </dl>
              {hotel.paymentMethods?.length ? (
                <div className="mt-4">
                  <p className="text-sm text-neutral-500 mb-1.5">{t('form.fields.paymentMethods')}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {hotel.paymentMethods.map((m) => (
                      <span key={m} className="px-2.5 py-1 rounded-lg bg-neutral-100 text-neutral-700 text-xs font-medium">
                        {t(`paymentMethods.${m}`)}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
              {hotel.houseRules?.length ? (
                <ul className="mt-4 list-disc list-inside text-sm text-neutral-600 space-y-1">
                  {hotel.houseRules.map((rule) => <li key={rule}>{rule}</li>)}
                </ul>
              ) : null}
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1" ref={reserveRef}>
            <div className="lg:sticky lg:top-6 rounded-2xl overflow-hidden shadow-lg shadow-black/5 border border-neutral-200 bg-white">
              {/* Price header */}
              <div className="p-6 border-b border-neutral-100">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-neutral-400">{t('card.from')}</p>
                    <p className="text-4xl font-extrabold text-neutral-900">
                      {currencySymbol}{hotel.priceFrom ?? '—'}
                      <span className="text-sm font-normal text-neutral-400"> / {t('card.night')}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={handleToggleSave}
                      className={`w-10 h-10 rounded-full flex items-center justify-center border transition-colors ${
                        favoritedIds.has(hotel.id)
                          ? 'bg-red-500 border-red-500 text-white'
                          : 'bg-white border-neutral-200 text-neutral-500 hover:text-red-500 hover:border-red-200'
                      }`}
                      aria-label={favoritedIds.has(hotel.id) ? t('detail.saved') : t('detail.save')}
                      aria-pressed={favoritedIds.has(hotel.id)}
                    >
                      <HeartIcon className={`w-4.5 h-4.5 ${favoritedIds.has(hotel.id) ? 'fill-current' : ''}`} />
                    </button>
                    <button
                      type="button"
                      onClick={handleShare}
                      className="w-10 h-10 rounded-full flex items-center justify-center border border-neutral-200 text-neutral-500 hover:text-primary hover:border-primary/30 transition-colors"
                      aria-label={t('detail.share')}
                    >
                      <ShareIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                {hotel.minNights ? (
                  <p className="mt-1 text-xs text-neutral-400">{t('detail.minNightsShort', { count: hotel.minNights })}</p>
                ) : null}
              </div>

              {/* Self-service reservation: dates, guests, live total → request to host */}
              {hotel.rooms?.length ? (
                <ReservationWidget
                  hotel={hotel}
                  selectedRoomIndex={selectedRoomIndex}
                  onSelectRoom={setSelectedRoomIndex}
                />
              ) : null}

              <div className="p-6">
                <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400 mb-2">{t('detail.booking.contactHost')}</p>
                <div className="space-y-2">
                  <a href={`tel:${hotel.contactPhone}`} className="flex items-center justify-center gap-2 w-full py-3 rounded-xl border border-neutral-300 text-neutral-700 font-medium hover:bg-neutral-50 transition-colors">
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

      {/* ===== Mobile sticky reserve bar (Airbnb/Booking pattern) ===== */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur border-t border-neutral-200 px-4 py-3 flex items-center justify-between gap-3">
        <div>
          <p className="leading-none">
            <span className="text-lg font-extrabold text-neutral-900">{currencySymbol}{hotel.priceFrom ?? '—'}</span>
            <span className="text-xs font-normal text-neutral-400"> / {t('card.night')}</span>
          </p>
          {hotel.minNights ? (
            <p className="text-[11px] text-neutral-400">{t('detail.minNightsShort', { count: hotel.minNights })}</p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => reserveRoom(selectedRoomIndex)}
          className="px-6 py-2.5 rounded-xl bg-primary text-white font-semibold hover:bg-primary/90 transition-colors shadow-sm shadow-primary/20"
        >
          {t('detail.reserve')}
        </button>
      </div>

      {/* ===== Lightbox ===== */}
      <AnimatePresence>
        {lightboxIndex !== null && gallery[lightboxIndex] && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center"
            onClick={closeLightbox}
          >
            <motion.img
              key={lightboxIndex}
              src={optimizeCloudinaryUrl(gallery[lightboxIndex].url, { width: 1600, quality: 'auto' })}
              alt={`${hotel.name} ${lightboxIndex + 1}`}
              initial={{ scale: 0.96, opacity: 0.5 }}
              animate={{ scale: 1, opacity: 1 }}
              className="relative z-0 max-h-[85vh] max-w-[92vw] object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
            <button onClick={closeLightbox} className="absolute top-4 right-4 z-20 p-2 rounded-full bg-white/15 hover:bg-white/30 text-white" aria-label="Close">
              <XMarkIcon className="w-6 h-6" />
            </button>
            <span className="absolute top-5 left-5 z-20 text-white/80 text-sm font-medium">
              {lightboxIndex + 1} / {gallery.length}
            </span>
            {gallery.length > 1 && (
              <button
                onClick={(e) => { e.stopPropagation(); prevImage(); }}
                className="absolute left-3 sm:left-6 z-20 p-3 rounded-full bg-white/15 hover:bg-white/30 text-white text-2xl leading-none"
                aria-label="Previous"
              >‹</button>
            )}
            {gallery.length > 1 && (
              <button
                onClick={(e) => { e.stopPropagation(); nextImage(); }}
                className="absolute right-3 sm:right-6 z-20 p-3 rounded-full bg-white/15 hover:bg-white/30 text-white text-2xl leading-none"
                aria-label="Next"
              >›</button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default HotelDetailPage;
