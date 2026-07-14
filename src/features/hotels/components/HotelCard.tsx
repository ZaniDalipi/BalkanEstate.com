import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import type { Hotel } from '@/src/shared/types/hotel.types';
import { CURRENCY_SYMBOLS } from '@/src/shared/types/hotel.types';
import { MapPinIcon, StarIconSolid, UsersIcon, CheckBadgeIcon, EyeIcon, HomeIcon, HeartIcon } from '@/constants';
import { optimizeCloudinaryUrl } from '@/config/cloudinaryConfig';

interface HotelCardProps {
  hotel: Hotel;
  onClick: (hotel: Hotel) => void;
  /** Shows the save/heart toggle when provided. */
  isSaved?: boolean;
  onToggleSave?: (hotel: Hotel) => void;
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

const HotelCard: React.FC<HotelCardProps> = ({ hotel, onClick, isSaved, onToggleSave }) => {
  const { t } = useTranslation('hotels');

  const gradient = PROPERTY_TYPE_GRADIENTS[hotel.propertyType] || PROPERTY_TYPE_GRADIENTS.hotel;
  const currencySymbol = CURRENCY_SYMBOLS[hotel.currency] || '€';
  const maxGuests = hotel.rooms?.reduce((max, r) => Math.max(max, r.maxGuests || 0), 0) || 0;
  const allAmenityLabels = [
    ...(hotel.amenities || []).map((a) => t(`amenities.${a}`)),
    ...(hotel.customAmenities || []),
  ];
  const previewAmenities = allAmenityLabels.slice(0, 3);
  const extraAmenities = Math.max(0, allAmenityLabels.length - previewAmenities.length);

  const coverSrc = hotel.coverImageUrl
    ? optimizeCloudinaryUrl(hotel.coverImageUrl, { width: 600, quality: 'auto', crop: 'fill' })
    : hotel.images?.[0]?.url
      ? optimizeCloudinaryUrl(hotel.images[0].url, { width: 600, quality: 'auto', crop: 'fill' })
      : null;

  return (
    <motion.button
      type="button"
      onClick={() => onClick(hotel)}
      whileHover={{ y: -6 }}
      transition={{ type: 'spring', stiffness: 300, damping: 22 }}
      className="group text-left w-full bg-white rounded-2xl overflow-hidden border border-neutral-200 hover:border-primary/30 hover:shadow-2xl hover:shadow-neutral-300/50 transition-shadow duration-300 focus:outline-none focus:ring-2 focus:ring-primary/30"
      aria-label={t('card.viewAria', { name: hotel.name })}
    >
      {/* Cover */}
      <div className={`relative h-52 bg-gradient-to-br ${gradient} overflow-hidden`}>
        {coverSrc ? (
          <img
            src={coverSrc}
            alt={hotel.name}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-white/80">
            <HomeIcon className="w-14 h-14" />
          </div>
        )}
        {/* gradient scrim for legibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-black/10" />

        <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-white/90 backdrop-blur-sm text-neutral-800 text-xs font-semibold shadow-sm">
          {t(`propertyTypes.${hotel.propertyType}`)}
        </span>

        <div className="absolute top-3 right-3 flex flex-col items-end gap-2">
          {onToggleSave && (
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleSave(hotel); }}
              className={`w-8 h-8 rounded-full flex items-center justify-center shadow-sm backdrop-blur-sm transition-colors ${
                isSaved ? 'bg-red-500 text-white' : 'bg-white/90 text-neutral-600 hover:bg-white hover:text-red-500'
              }`}
              aria-label={isSaved ? t('card.unsave') : t('card.save')}
              aria-pressed={isSaved}
            >
              <HeartIcon className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
            </button>
          )}
          {hotel.isVerified && (
            <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-500 text-white text-xs font-semibold shadow-sm">
              <CheckBadgeIcon className="w-3.5 h-3.5" />
              {t('card.verified')}
            </span>
          )}
        </div>

        {hotel.starRating ? (
          <span className="absolute bottom-3 left-3 flex items-center gap-0.5 px-2 py-1 rounded-lg bg-white/90 backdrop-blur-sm text-amber-500 text-xs font-bold shadow-sm">
            {Array.from({ length: hotel.starRating }).map((_, i) => (
              <StarIconSolid key={i} className="w-3.5 h-3.5" />
            ))}
          </span>
        ) : null}

        {/* Price ribbon */}
        <div className="absolute bottom-3 right-3 px-3 py-1.5 rounded-xl bg-white/95 backdrop-blur-sm shadow-md text-right">
          <span className="block text-[10px] leading-none text-neutral-400 font-medium">{t('card.from')}</span>
          <span className="text-base font-extrabold text-neutral-900 leading-tight">
            {currencySymbol}{hotel.priceFrom ?? '—'}
            <span className="text-[10px] font-normal text-neutral-400"> /{t('card.night')}</span>
          </span>
        </div>
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

        {/* Amenity preview */}
        {previewAmenities.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {previewAmenities.map((a, i) => (
              <span key={`${a}-${i}`} className="px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-600 text-[11px] font-medium">
                {a}
              </span>
            ))}
            {extraAmenities > 0 && (
              <span className="px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-500 text-[11px] font-medium">
                +{extraAmenities}
              </span>
            )}
          </div>
        )}

        <div className="mt-4 flex items-center gap-3 text-xs text-neutral-500 border-t border-neutral-100 pt-3">
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
          <span className="flex items-center gap-1 ml-auto text-primary font-medium group-hover:underline">
            {t('card.viewDetails')}
          </span>
        </div>
      </div>
    </motion.button>
  );
};

export default HotelCard;
