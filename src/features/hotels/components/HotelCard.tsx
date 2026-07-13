import React from 'react';
import { useTranslation } from 'react-i18next';
import type { Hotel } from '@/src/shared/types/hotel.types';
import { CURRENCY_SYMBOLS } from '@/src/shared/types/hotel.types';
import { MapPinIcon, StarIconSolid, UsersIcon, CheckBadgeIcon, EyeIcon, HomeIcon } from '@/constants';
import { optimizeCloudinaryUrl } from '@/config/cloudinaryConfig';

interface HotelCardProps {
  hotel: Hotel;
  onClick: (hotel: Hotel) => void;
}

const PROPERTY_TYPE_GRADIENTS: Record<string, string> = {
  hotel: 'from-blue-500 to-indigo-600',
  guesthouse: 'from-amber-500 to-orange-600',
  apartment: 'from-emerald-500 to-teal-600',
  hostel: 'from-purple-500 to-fuchsia-600',
  villa: 'from-rose-500 to-pink-600',
  resort: 'from-cyan-500 to-sky-600',
  bed_and_breakfast: 'from-lime-500 to-green-600',
  private_room: 'from-violet-500 to-indigo-600',
};

const HotelCard: React.FC<HotelCardProps> = ({ hotel, onClick }) => {
  const { t } = useTranslation('hotels');

  const gradient = PROPERTY_TYPE_GRADIENTS[hotel.propertyType] || PROPERTY_TYPE_GRADIENTS.hotel;
  const currencySymbol = CURRENCY_SYMBOLS[hotel.currency] || '€';
  const maxGuests = hotel.rooms?.reduce((max, r) => Math.max(max, r.maxGuests || 0), 0) || 0;

  const coverSrc = hotel.coverImageUrl
    ? optimizeCloudinaryUrl(hotel.coverImageUrl, { width: 600, quality: 'auto', crop: 'fill' })
    : hotel.images?.[0]?.url
      ? optimizeCloudinaryUrl(hotel.images[0].url, { width: 600, quality: 'auto', crop: 'fill' })
      : null;

  return (
    <button
      type="button"
      onClick={() => onClick(hotel)}
      className="group text-left w-full bg-white rounded-2xl overflow-hidden border border-neutral-200 hover:border-primary/40 hover:shadow-xl transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-primary/30"
      aria-label={t('card.viewAria', { name: hotel.name })}
    >
      {/* Cover */}
      <div className={`relative h-48 bg-gradient-to-br ${gradient} overflow-hidden`}>
        {coverSrc ? (
          <img
            src={coverSrc}
            alt={hotel.name}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-white/80">
            <HomeIcon className="w-14 h-14" />
          </div>
        )}

        {/* Property type chip */}
        <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-black/50 backdrop-blur-sm text-white text-xs font-medium">
          {t(`propertyTypes.${hotel.propertyType}`)}
        </span>

        {hotel.isVerified && (
          <span className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-500 text-white text-xs font-semibold">
            <CheckBadgeIcon className="w-3.5 h-3.5" />
            {t('card.verified')}
          </span>
        )}

        {/* Star rating */}
        {hotel.starRating ? (
          <span className="absolute bottom-3 left-3 flex items-center gap-0.5 px-2 py-1 rounded-lg bg-white/90 text-amber-500 text-xs font-bold">
            {Array.from({ length: hotel.starRating }).map((_, i) => (
              <StarIconSolid key={i} className="w-3.5 h-3.5" />
            ))}
          </span>
        ) : null}
      </div>

      {/* Body */}
      <div className="p-4">
        <h3 className="font-semibold text-neutral-900 text-base line-clamp-1 group-hover:text-primary transition-colors">
          {hotel.name}
        </h3>

        <p className="mt-1 flex items-center gap-1 text-sm text-neutral-500">
          <MapPinIcon className="w-4 h-4 shrink-0" />
          <span className="line-clamp-1">{hotel.city}, {hotel.country}</span>
        </p>

        <div className="mt-3 flex items-center gap-3 text-xs text-neutral-500">
          <span className="flex items-center gap-1">
            <HomeIcon className="w-4 h-4" />
            {t('card.roomsCount', { count: hotel.rooms?.length || 0 })}
          </span>
          {maxGuests > 0 && (
            <span className="flex items-center gap-1">
              <UsersIcon className="w-4 h-4" />
              {t('card.sleepsCount', { count: maxGuests })}
            </span>
          )}
          <span className="flex items-center gap-1">
            <EyeIcon className="w-4 h-4" />
            {hotel.views}
          </span>
        </div>

        <div className="mt-4 flex items-end justify-between border-t border-neutral-100 pt-3">
          <div>
            <span className="text-xs text-neutral-400">{t('card.from')}</span>
            <p className="text-lg font-bold text-neutral-900">
              {currencySymbol}{hotel.priceFrom ?? '—'}
              <span className="text-xs font-normal text-neutral-400"> / {t('card.night')}</span>
            </p>
          </div>
          <span className="text-sm font-medium text-primary group-hover:underline">
            {t('card.viewDetails')}
          </span>
        </div>
      </div>
    </button>
  );
};

export default HotelCard;
