import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
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

  return (
    <div className="min-h-screen bg-neutral-50 pb-16">
      <div className="max-w-5xl mx-auto px-4 py-6">
        <button
          onClick={onBack}
          className="mb-4 text-sm text-neutral-500 hover:text-primary font-medium"
        >
          ← {t('detail.backToList')}
        </button>

        {/* Hero */}
        <div className="relative rounded-2xl overflow-hidden bg-neutral-200 aspect-[16/9] mb-3">
          {heroImage ? (
            <img
              src={optimizeCloudinaryUrl(heroImage, { width: 1200, quality: 'auto' })}
              alt={hotel.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-neutral-400">
              <HomeIcon className="w-16 h-16" />
            </div>
          )}
        </div>

        {gallery.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-2 mb-6">
            {gallery.map((img, i) => (
              <button
                key={i}
                onClick={() => setActiveImage(img.url)}
                className={`shrink-0 h-20 w-28 rounded-lg overflow-hidden border-2 ${
                  heroImage === img.url ? 'border-primary' : 'border-transparent'
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
            <div className="bg-white rounded-2xl border border-neutral-200 p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span className="inline-block px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium mb-2">
                    {t(`propertyTypes.${hotel.propertyType}`)}
                  </span>
                  <h1 className="text-2xl font-bold text-neutral-900">{hotel.name}</h1>
                  <p className="mt-1 flex items-center gap-1 text-sm text-neutral-500">
                    <MapPinIcon className="w-4 h-4" />
                    {hotel.address || `${hotel.city}, ${hotel.country}`}
                  </p>
                </div>
                {hotel.isVerified && (
                  <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-50 text-emerald-600 text-xs font-semibold shrink-0">
                    <CheckBadgeIcon className="w-4 h-4" /> {t('card.verified')}
                  </span>
                )}
              </div>

              {hotel.starRating ? (
                <div className="mt-3 flex items-center gap-0.5 text-amber-400">
                  {Array.from({ length: hotel.starRating }).map((_, i) => (
                    <StarIconSolid key={i} className="w-5 h-5" />
                  ))}
                </div>
              ) : null}

              {hotel.description && (
                <p className="mt-4 text-neutral-700 whitespace-pre-line leading-relaxed">{hotel.description}</p>
              )}
            </div>

            {/* Rooms */}
            <div className="bg-white rounded-2xl border border-neutral-200 p-6">
              <h2 className="text-lg font-semibold text-neutral-900 mb-4">{t('detail.rooms')}</h2>
              <div className="space-y-3">
                {hotel.rooms?.map((room, i) => (
                  <div key={room._id || i} className="flex items-center justify-between gap-4 rounded-xl border border-neutral-200 p-4">
                    <div>
                      <p className="font-medium text-neutral-900">{room.name}</p>
                      <p className="text-xs text-neutral-500 mt-0.5">{t(`roomTypes.${room.roomType}`)}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-neutral-500">
                        <span className="flex items-center gap-1"><UsersIcon className="w-4 h-4" /> {t('detail.sleeps', { count: room.maxGuests })}</span>
                        <span>{t('detail.bedsCount', { count: room.beds })}</span>
                        {room.sizeSqm ? <span>{room.sizeSqm} m²</span> : null}
                      </div>
                      {room.description && <p className="mt-2 text-sm text-neutral-600">{room.description}</p>}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-lg font-bold text-neutral-900">
                        {CURRENCY_SYMBOLS[room.currency] || currencySymbol}{room.pricePerNight}
                      </p>
                      <p className="text-xs text-neutral-400">/ {t('card.night')}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Amenities */}
            {hotel.amenities?.length > 0 && (
              <div className="bg-white rounded-2xl border border-neutral-200 p-6">
                <h2 className="text-lg font-semibold text-neutral-900 mb-4">{t('detail.amenities')}</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {hotel.amenities.map((amenity) => (
                    <span key={amenity} className="flex items-center gap-2 text-sm text-neutral-700">
                      <CheckIcon className="w-4 h-4 text-emerald-500" /> {t(`amenities.${amenity}`)}
                    </span>
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
            <div className="bg-white rounded-2xl border border-neutral-200 p-6 lg:sticky lg:top-6">
              <p className="text-sm text-neutral-400">{t('card.from')}</p>
              <p className="text-3xl font-bold text-neutral-900">
                {currencySymbol}{hotel.priceFrom ?? '—'}
                <span className="text-sm font-normal text-neutral-400"> / {t('card.night')}</span>
              </p>

              <div className="mt-5 space-y-2">
                <a href={`tel:${hotel.contactPhone}`} className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-primary text-white font-semibold hover:bg-primary/90 transition-colors">
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
  );
};

export default HotelDetailPage;
