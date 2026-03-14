import React from 'react';
import { useTranslation } from 'react-i18next';
import type { BusinessListing } from '@/src/shared/types/businessListing.types';
import { PhoneIcon, MapPinIcon, CheckBadgeIcon } from '@/constants';

interface BusinessCardProps {
  listing: BusinessListing;
  onClick: (listing: BusinessListing) => void;
}

const BusinessCard: React.FC<BusinessCardProps> = ({ listing, onClick }) => {
  const { t } = useTranslation('businessDirectory');

  return (
    <button
      type="button"
      onClick={() => onClick(listing)}
      className="w-full text-left bg-white rounded-xl border border-neutral-200 hover:border-primary/30 hover:shadow-lg transition-all duration-200 overflow-hidden group"
    >
      {/* Header with logo and category */}
      <div className="p-4 pb-3">
        <div className="flex items-start gap-3">
          {/* Logo */}
          <div className="w-14 h-14 rounded-xl bg-neutral-100 flex items-center justify-center flex-shrink-0 overflow-hidden border border-neutral-200">
            {listing.logoUrl ? (
              <img
                src={listing.logoUrl}
                alt={listing.name}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            ) : (
              <span className="text-2xl font-bold text-neutral-400">
                {listing.name.charAt(0).toUpperCase()}
              </span>
            )}
          </div>

          {/* Name and category */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="font-semibold text-neutral-900 truncate group-hover:text-primary transition-colors">
                {listing.name}
              </h3>
              {listing.isVerified && (
                <span className="flex-shrink-0 text-primary" title={t('verified')}>
                  <CheckBadgeIcon className="w-4 h-4" />
                </span>
              )}
            </div>
            <span className="inline-block mt-1 px-2 py-0.5 text-xs font-medium bg-primary/10 text-primary rounded-full">
              {t(`categories.${listing.category}`)}
            </span>
          </div>
        </div>
      </div>

      {/* Description */}
      {listing.description && (
        <div className="px-4 pb-3">
          <p className="text-sm text-neutral-600 line-clamp-2">
            {listing.description}
          </p>
        </div>
      )}

      {/* Services tags */}
      {listing.services.length > 0 && (
        <div className="px-4 pb-3 flex flex-wrap gap-1">
          {listing.services.slice(0, 3).map((service) => (
            <span
              key={service}
              className="px-2 py-0.5 text-xs bg-neutral-100 text-neutral-600 rounded-md"
            >
              {service}
            </span>
          ))}
          {listing.services.length > 3 && (
            <span className="px-2 py-0.5 text-xs text-neutral-400">
              +{listing.services.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Footer with location and phone */}
      <div className="px-4 py-3 border-t border-neutral-100 flex items-center justify-between text-sm text-neutral-500">
        <span className="flex items-center gap-1 truncate">
          <MapPinIcon className="w-3.5 h-3.5 flex-shrink-0" />
          {listing.city}, {listing.country}
        </span>
        <span className="flex items-center gap-1 flex-shrink-0">
          <PhoneIcon className="w-3.5 h-3.5" />
          {listing.contactPhone}
        </span>
      </div>
    </button>
  );
};

export default BusinessCard;
