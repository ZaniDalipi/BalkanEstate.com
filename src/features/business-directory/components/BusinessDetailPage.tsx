import React from 'react';
import { useTranslation } from 'react-i18next';
import { useBusinessListing } from '../hooks';
import {
  PhoneIcon,
  MapPinIcon,
  EnvelopeIcon,
  GlobeAltIcon,
  ClockIcon,
  CheckBadgeIcon,
  BuildingStorefrontIcon,
} from '@/constants';

interface BusinessDetailPageProps {
  listingId: string;
  onBack: () => void;
}

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;

const BusinessDetailPage: React.FC<BusinessDetailPageProps> = ({ listingId, onBack }) => {
  const { t } = useTranslation('businessDirectory');
  const { listing, isLoading, error } = useBusinessListing(listingId);

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 animate-pulse">
        <div className="h-6 bg-neutral-200 rounded w-24 mb-8" />
        <div className="flex gap-6">
          <div className="w-24 h-24 rounded-2xl bg-neutral-200" />
          <div className="flex-1">
            <div className="h-8 bg-neutral-200 rounded w-64 mb-3" />
            <div className="h-4 bg-neutral-200 rounded w-32 mb-2" />
            <div className="h-4 bg-neutral-200 rounded w-48" />
          </div>
        </div>
        <div className="mt-8 h-24 bg-neutral-200 rounded" />
      </div>
    );
  }

  if (error || !listing) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <BuildingStorefrontIcon className="w-16 h-16 text-neutral-300 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-neutral-700 mb-2">{t('detail.notFound')}</h2>
        <button type="button" onClick={onBack} className="mt-4 text-primary font-medium hover:underline">
          {t('detail.backToDirectory')}
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Back button */}
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1 text-sm text-neutral-500 hover:text-primary font-medium mb-6 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          {t('detail.backToDirectory')}
        </button>

        {/* Header */}
        <div className="bg-white rounded-2xl border border-neutral-200 p-6 mb-6">
          <div className="flex flex-col sm:flex-row items-start gap-5">
            {/* Logo */}
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-neutral-100 flex items-center justify-center flex-shrink-0 overflow-hidden border border-neutral-200">
              {listing.logoUrl ? (
                <img src={listing.logoUrl} alt={listing.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-4xl font-bold text-neutral-300">
                  {listing.name.charAt(0).toUpperCase()}
                </span>
              )}
            </div>

            {/* Info */}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-2xl font-bold text-neutral-900">{listing.name}</h1>
                {listing.isVerified && (
                  <CheckBadgeIcon className="w-6 h-6 text-primary flex-shrink-0" />
                )}
              </div>
              <span className="inline-block px-3 py-1 text-sm font-medium bg-primary/10 text-primary rounded-full mb-3">
                {t(`categories.${listing.category}`)}
              </span>
              {listing.description && (
                <p className="text-neutral-600 leading-relaxed">{listing.description}</p>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column - Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Services */}
            {listing.services.length > 0 && (
              <div className="bg-white rounded-2xl border border-neutral-200 p-6">
                <h2 className="text-lg font-semibold text-neutral-900 mb-4">{t('detail.services')}</h2>
                <div className="flex flex-wrap gap-2">
                  {listing.services.map((service) => (
                    <span
                      key={service}
                      className="px-3 py-1.5 bg-neutral-100 text-neutral-700 rounded-lg text-sm"
                    >
                      {service}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Business hours */}
            {listing.businessHours && Object.values(listing.businessHours).some(Boolean) && (
              <div className="bg-white rounded-2xl border border-neutral-200 p-6">
                <h2 className="text-lg font-semibold text-neutral-900 mb-4 flex items-center gap-2">
                  <ClockIcon className="w-5 h-5 text-neutral-400" />
                  {t('detail.businessHours')}
                </h2>
                <div className="space-y-2">
                  {DAYS.map((day) => {
                    const hours = listing.businessHours?.[day];
                    return (
                      <div key={day} className="flex justify-between text-sm">
                        <span className="font-medium text-neutral-700 capitalize">{t(`days.${day}`)}</span>
                        <span className={hours ? 'text-neutral-600' : 'text-neutral-400'}>
                          {hours || t('detail.closed')}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Right column - Contact info */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-neutral-200 p-6">
              <h2 className="text-lg font-semibold text-neutral-900 mb-4">{t('detail.contactInfo')}</h2>
              <div className="space-y-4">
                {/* Phone */}
                <a
                  href={`tel:${listing.contactPhone}`}
                  className="flex items-center gap-3 text-neutral-700 hover:text-primary transition-colors"
                >
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <PhoneIcon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <div className="text-xs text-neutral-500">{t('detail.phone')}</div>
                    <div className="font-medium">{listing.contactPhone}</div>
                  </div>
                </a>

                {/* Email */}
                {listing.contactEmail && (
                  <a
                    href={`mailto:${listing.contactEmail}`}
                    className="flex items-center gap-3 text-neutral-700 hover:text-primary transition-colors"
                  >
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <EnvelopeIcon className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <div className="text-xs text-neutral-500">{t('detail.email')}</div>
                      <div className="font-medium truncate">{listing.contactEmail}</div>
                    </div>
                  </a>
                )}

                {/* Website */}
                {listing.website && (
                  <a
                    href={listing.website.startsWith('http') ? listing.website : `https://${listing.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 text-neutral-700 hover:text-primary transition-colors"
                  >
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <GlobeAltIcon className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <div className="text-xs text-neutral-500">{t('detail.website')}</div>
                      <div className="font-medium truncate">{listing.website}</div>
                    </div>
                  </a>
                )}

                {/* Location */}
                <div className="flex items-center gap-3 text-neutral-700">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <MapPinIcon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <div className="text-xs text-neutral-500">{t('detail.location')}</div>
                    <div className="font-medium">
                      {listing.address && `${listing.address}, `}
                      {listing.city}, {listing.country}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Social media */}
            {listing.socialMedia && Object.values(listing.socialMedia).some(Boolean) && (
              <div className="bg-white rounded-2xl border border-neutral-200 p-6">
                <h2 className="text-lg font-semibold text-neutral-900 mb-4">{t('detail.socialMedia')}</h2>
                <div className="space-y-3">
                  {listing.socialMedia.facebook && (
                    <a
                      href={listing.socialMedia.facebook}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-neutral-600 hover:text-primary transition-colors"
                    >
                      <span className="font-medium">Facebook</span>
                    </a>
                  )}
                  {listing.socialMedia.instagram && (
                    <a
                      href={listing.socialMedia.instagram}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-neutral-600 hover:text-primary transition-colors"
                    >
                      <span className="font-medium">Instagram</span>
                    </a>
                  )}
                  {listing.socialMedia.linkedin && (
                    <a
                      href={listing.socialMedia.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-neutral-600 hover:text-primary transition-colors"
                    >
                      <span className="font-medium">LinkedIn</span>
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Views */}
            <div className="text-center text-sm text-neutral-400">
              {t('detail.views', { count: listing.views })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BusinessDetailPage;
