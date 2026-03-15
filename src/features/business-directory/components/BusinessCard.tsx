import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import type { BusinessListing } from '@/src/shared/types/businessListing.types';
import { PhoneIcon, MapPinIcon, CheckBadgeIcon, UserIcon, BuildingStorefrontIcon, EnvelopeIcon, GlobeAltIcon, EyeIcon } from '@/constants';
import MagneticTiltCard from './MagneticTiltCard';

interface BusinessCardProps {
  listing: BusinessListing;
  onClick: (listing: BusinessListing) => void;
}

// Category gradient banners
const CATEGORY_GRADIENTS: Record<string, string> = {
  construction: 'from-amber-500 to-orange-600',
  renovation: 'from-blue-500 to-cyan-600',
  cleaning: 'from-emerald-400 to-teal-600',
  moving: 'from-purple-500 to-indigo-600',
  interior_design: 'from-pink-500 to-rose-600',
  architecture: 'from-slate-500 to-zinc-700',
  plumbing: 'from-sky-500 to-blue-600',
  electrical: 'from-yellow-500 to-amber-600',
  landscaping: 'from-green-500 to-emerald-700',
  security: 'from-red-500 to-rose-700',
  real_estate_law: 'from-indigo-500 to-violet-700',
  insurance: 'from-cyan-500 to-blue-700',
  home_inspection: 'from-orange-400 to-red-600',
  pest_control: 'from-lime-500 to-green-700',
  painting: 'from-fuchsia-500 to-purple-700',
  roofing: 'from-stone-500 to-neutral-700',
  hvac: 'from-blue-400 to-indigo-600',
  furniture: 'from-amber-400 to-yellow-600',
  appliances: 'from-gray-500 to-slate-700',
  other: 'from-primary to-blue-600',
};

const BusinessCard: React.FC<BusinessCardProps> = ({ listing, onClick }) => {
  const { t } = useTranslation('businessDirectory');
  const gradient = CATEGORY_GRADIENTS[listing.category] || CATEGORY_GRADIENTS.other;
  const isIndividual = listing.listingType === 'individual';

  // Quick action handlers (stop propagation to prevent card click)
  const handleQuickCall = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(`tel:${listing.contactPhone}`, '_self');
  };
  const handleQuickEmail = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (listing.contactEmail) window.open(`mailto:${listing.contactEmail}`, '_self');
  };
  const handleQuickWebsite = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (listing.website) window.open(listing.website, '_blank', 'noopener,noreferrer');
  };

  return (
    <MagneticTiltCard>
      <button
        type="button"
        onClick={() => onClick(listing)}
        className="w-full text-left bg-white rounded-2xl sm:rounded-3xl shadow-md shadow-neutral-200/60 hover:shadow-xl hover:shadow-neutral-300/50 overflow-hidden border border-neutral-100/80 group transition-all duration-500"
      >
        {/* Category gradient banner */}
        <div className={`h-20 sm:h-24 bg-gradient-to-r ${gradient} relative overflow-hidden`}>
          {/* Animated mesh pattern overlay */}
          <div className="absolute inset-0 opacity-[0.15]">
            <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id={`card-mesh-${listing.id}`} width="20" height="20" patternUnits="userSpaceOnUse">
                  <circle cx="3" cy="3" r="1.5" fill="white" />
                  <circle cx="13" cy="13" r="0.8" fill="white" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill={`url(#card-mesh-${listing.id})`} />
            </svg>
          </div>

          {/* Shine sweep on hover */}
          <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent" />

          {/* Quick contact actions - slide up from bottom on hover */}
          <div className="absolute bottom-2 right-3 flex items-center gap-1.5 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 ease-out z-10">
            <motion.button
              type="button"
              onClick={handleQuickCall}
              className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center hover:bg-white/40 transition-colors"
              whileHover={{ scale: 1.15 }}
              whileTap={{ scale: 0.9 }}
              aria-label={t('quickActions.call')}
              title={t('quickActions.call')}
            >
              <PhoneIcon className="w-3.5 h-3.5 text-white" />
            </motion.button>
            {listing.contactEmail && (
              <motion.button
                type="button"
                onClick={handleQuickEmail}
                className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center hover:bg-white/40 transition-colors"
                whileHover={{ scale: 1.15 }}
                whileTap={{ scale: 0.9 }}
                aria-label={t('quickActions.email')}
                title={t('quickActions.email')}
              >
                <EnvelopeIcon className="w-3.5 h-3.5 text-white" />
              </motion.button>
            )}
            {listing.website && (
              <motion.button
                type="button"
                onClick={handleQuickWebsite}
                className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center hover:bg-white/40 transition-colors"
                whileHover={{ scale: 1.15 }}
                whileTap={{ scale: 0.9 }}
                aria-label={t('quickActions.website')}
                title={t('quickActions.website')}
              >
                <GlobeAltIcon className="w-3.5 h-3.5 text-white" />
              </motion.button>
            )}
          </div>

          {/* Listing type badge */}
          <div className="absolute top-3 right-3">
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider backdrop-blur-md shadow-sm ${
              isIndividual
                ? 'bg-violet-500/30 text-white border border-violet-300/30'
                : 'bg-white/20 text-white border border-white/20'
            }`}>
              {isIndividual ? <UserIcon className="w-3 h-3" /> : <BuildingStorefrontIcon className="w-3 h-3" />}
              {isIndividual ? t('types.individual') : t('types.business')}
            </span>
          </div>

          {/* Verified badge on banner */}
          {listing.isVerified && (
            <div className="absolute top-3 left-3">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-500/30 backdrop-blur-md rounded-lg text-white text-[10px] font-bold border border-emerald-300/30 shadow-sm">
                <CheckBadgeIcon className="w-3 h-3" />
                {t('verified')}
              </span>
            </div>
          )}
        </div>

        {/* Overlapping logo */}
        <div className="px-4 sm:px-5 -mt-8 relative z-10">
          <div className="w-14 h-14 rounded-xl bg-white flex items-center justify-center flex-shrink-0 overflow-hidden border-[3px] border-white shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-105 ring-1 ring-neutral-100/50">
            {listing.logoUrl ? (
              <img
                src={listing.logoUrl}
                alt={listing.name}
                className="w-full h-full object-cover rounded-lg"
                loading="lazy"
              />
            ) : (
              <div className={`w-full h-full bg-gradient-to-br ${gradient} flex items-center justify-center rounded-lg`}>
                <span className="text-xl font-bold text-white drop-shadow-sm">
                  {listing.name.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-4 pt-3 sm:px-5">
          {/* Name */}
          <div className="flex items-center gap-1.5 mb-1.5">
            <h3 className="font-bold text-neutral-900 truncate group-hover:text-primary transition-colors duration-300 text-[15px]">
              {listing.name}
            </h3>
            {listing.isVerified && (
              <CheckBadgeIcon className="w-4 h-4 text-primary flex-shrink-0" />
            )}
          </div>

          {/* Category chip */}
          <span className="inline-block px-2.5 py-0.5 text-xs font-semibold bg-primary/8 text-primary rounded-full mb-2.5 border border-primary/10">
            {t(`categories.${listing.category}`)}
          </span>

          {/* Description */}
          {listing.description && (
            <p className="text-sm text-neutral-500 line-clamp-2 mb-3 leading-relaxed">
              {listing.description}
            </p>
          )}

          {/* Services tags */}
          {listing.services.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {listing.services.slice(0, 3).map((service) => (
                <span
                  key={service}
                  className="px-2 py-0.5 text-[11px] font-medium bg-neutral-50 text-neutral-600 rounded-md border border-neutral-100"
                >
                  {service}
                </span>
              ))}
              {listing.services.length > 3 && (
                <span className="px-2 py-0.5 text-[11px] text-neutral-400 font-medium">
                  +{listing.services.length - 3}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-5 py-3 border-t border-neutral-100/80 flex items-center justify-between text-sm text-neutral-500 bg-gradient-to-r from-neutral-50/80 to-neutral-50/30">
          <span className="flex items-center gap-1.5 truncate">
            <MapPinIcon className="w-3.5 h-3.5 flex-shrink-0 text-neutral-400" />
            <span className="truncate text-xs">{listing.city}, {listing.country}</span>
          </span>
          {listing.views != null && listing.views > 0 ? (
            <span className="flex items-center gap-1 flex-shrink-0 text-neutral-400 text-xs">
              <EyeIcon className="w-3.5 h-3.5" />
              {listing.views}
            </span>
          ) : (
            <span className="flex items-center gap-1.5 flex-shrink-0 text-primary font-medium text-xs">
              <PhoneIcon className="w-3.5 h-3.5" />
              {listing.contactPhone}
            </span>
          )}
        </div>
      </button>
    </MagneticTiltCard>
  );
};

export default BusinessCard;
