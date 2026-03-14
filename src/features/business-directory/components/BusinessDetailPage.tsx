import React from 'react';
import { useTranslation } from 'react-i18next';
import { useBusinessListing } from '../hooks';
import { Animated } from '@/src/components/ui/Animations';
import {
  PhoneIcon,
  MapPinIcon,
  EnvelopeIcon,
  GlobeAltIcon,
  ClockIcon,
  CheckBadgeIcon,
  BuildingStorefrontIcon,
  UserIcon,
} from '@/constants';

interface BusinessDetailPageProps {
  listingId: string;
  onBack: () => void;
}

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;

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

const BusinessDetailPage: React.FC<BusinessDetailPageProps> = ({ listingId, onBack }) => {
  const { t } = useTranslation('businessDirectory');
  const { listing, isLoading, error } = useBusinessListing(listingId);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-50">
        <div className="h-48 bg-neutral-200 animate-pulse" />
        <div className="max-w-4xl mx-auto px-4 -mt-16 relative z-10">
          <div className="bg-white rounded-2xl p-6 shadow-lg animate-pulse">
            <div className="flex gap-5">
              <div className="w-24 h-24 rounded-2xl bg-neutral-200" />
              <div className="flex-1 space-y-3">
                <div className="h-8 bg-neutral-200 rounded w-64" />
                <div className="h-4 bg-neutral-200 rounded w-32" />
                <div className="h-4 bg-neutral-200 rounded w-full" />
              </div>
            </div>
          </div>
        </div>
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

  const gradient = CATEGORY_GRADIENTS[listing.category] || CATEGORY_GRADIENTS.other;
  const isIndividual = listing.listingType === 'individual';

  // Check if currently open (simple heuristic based on current day)
  const now = new Date();
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const todayKey = dayNames[now.getDay()];
  const todayHours = listing.businessHours?.[todayKey as keyof typeof listing.businessHours];
  const isOpenToday = !!todayHours && todayHours.toLowerCase() !== 'closed';

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Gradient banner */}
      <div className={`h-48 sm:h-56 bg-gradient-to-r ${gradient} relative overflow-hidden`}>
        {/* Pattern overlay */}
        <div className="absolute inset-0 opacity-15">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="detail-grid" width="30" height="30" patternUnits="userSpaceOnUse">
                <path d="M 30 0 L 0 0 0 30" fill="none" stroke="white" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#detail-grid)" />
          </svg>
        </div>
        <div className="absolute top-10 right-[10%] w-60 h-60 bg-white/10 rounded-full blur-3xl" />

        {/* Back button */}
        <div className="relative z-10 max-w-4xl mx-auto px-4 pt-6">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1.5 text-sm text-white/80 hover:text-white font-medium transition-colors bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-white/20"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
            {t('detail.backToDirectory')}
          </button>
        </div>
      </div>

      {/* Main content overlapping banner */}
      <div className="max-w-4xl mx-auto px-4 -mt-20 relative z-10 pb-12">
        {/* Header card */}
        <Animated variant="fadeInUp">
          <div className="bg-white rounded-2xl border border-neutral-200 p-6 shadow-xl mb-6">
            <div className="flex flex-col sm:flex-row items-start gap-5">
              {/* Logo */}
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-white flex items-center justify-center flex-shrink-0 overflow-hidden border-4 border-white shadow-lg -mt-14 sm:-mt-16">
                {listing.logoUrl ? (
                  <img src={listing.logoUrl} alt={listing.name} className="w-full h-full object-cover rounded-xl" />
                ) : (
                  <div className={`w-full h-full bg-gradient-to-br ${gradient} flex items-center justify-center rounded-xl`}>
                    <span className="text-3xl font-bold text-white">
                      {listing.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <h1 className="text-2xl font-bold text-neutral-900">{listing.name}</h1>
                  {listing.isVerified && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-full text-xs font-semibold">
                      <CheckBadgeIcon className="w-3.5 h-3.5" />
                      {t('verified')}
                    </span>
                  )}
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                    isIndividual
                      ? 'bg-violet-50 text-violet-600'
                      : 'bg-blue-50 text-blue-600'
                  }`}>
                    {isIndividual ? <UserIcon className="w-3 h-3" /> : <BuildingStorefrontIcon className="w-3 h-3" />}
                    {isIndividual ? t('types.individual') : t('types.business')}
                  </span>
                </div>
                <span className="inline-block px-3 py-1 text-sm font-medium bg-primary/10 text-primary rounded-full mb-3">
                  {t(`categories.${listing.category}`)}
                </span>

                {/* Open/Closed indicator */}
                {listing.businessHours && (
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`inline-flex items-center gap-1.5 text-sm font-medium ${isOpenToday ? 'text-emerald-600' : 'text-neutral-400'}`}>
                      <span className={`w-2 h-2 rounded-full ${isOpenToday ? 'bg-emerald-500 animate-pulse' : 'bg-neutral-300'}`} />
                      {isOpenToday ? t('detail.openNow') : t('detail.closedNow')}
                    </span>
                  </div>
                )}

                {listing.description && (
                  <p className="text-neutral-600 leading-relaxed">{listing.description}</p>
                )}
              </div>
            </div>
          </div>
        </Animated>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Services */}
            {listing.services.length > 0 && (
              <Animated variant="fadeInUp" delay={100}>
                <div className="bg-white rounded-2xl border border-neutral-200 p-6 hover:shadow-lg transition-shadow">
                  <h2 className="text-lg font-semibold text-neutral-900 mb-4">{t('detail.services')}</h2>
                  <div className="flex flex-wrap gap-2">
                    {listing.services.map((service) => (
                      <span
                        key={service}
                        className="px-3 py-1.5 bg-gradient-to-r from-primary/5 to-blue-500/5 text-neutral-700 rounded-lg text-sm border border-primary/10 font-medium"
                      >
                        {service}
                      </span>
                    ))}
                  </div>
                </div>
              </Animated>
            )}

            {/* Business hours */}
            {listing.businessHours && Object.values(listing.businessHours).some(Boolean) && (
              <Animated variant="fadeInUp" delay={200}>
                <div className="bg-white rounded-2xl border border-neutral-200 p-6 hover:shadow-lg transition-shadow">
                  <h2 className="text-lg font-semibold text-neutral-900 mb-4 flex items-center gap-2">
                    <ClockIcon className="w-5 h-5 text-neutral-400" />
                    {t('detail.businessHours')}
                  </h2>
                  <div className="space-y-2">
                    {DAYS.map((day) => {
                      const hours = listing.businessHours?.[day];
                      const isToday = day === todayKey;
                      return (
                        <div
                          key={day}
                          className={`flex justify-between text-sm py-1.5 px-3 rounded-lg transition-colors ${
                            isToday ? 'bg-primary/5 border border-primary/10' : ''
                          }`}
                        >
                          <span className={`font-medium ${isToday ? 'text-primary' : 'text-neutral-700'}`}>
                            {t(`days.${day}`)}
                            {isToday && <span className="ml-1 text-[10px] uppercase tracking-wider text-primary/60">({t('detail.today')})</span>}
                          </span>
                          <span className={hours ? (isToday ? 'text-primary font-medium' : 'text-neutral-600') : 'text-neutral-400'}>
                            {hours || t('detail.closed')}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </Animated>
            )}
          </div>

          {/* Right column */}
          <div className="space-y-6">
            <Animated variant="fadeInUp" delay={150}>
              <div className="bg-white rounded-2xl border border-neutral-200 p-6 hover:shadow-lg transition-shadow">
                <h2 className="text-lg font-semibold text-neutral-900 mb-4">{t('detail.contactInfo')}</h2>
                <div className="space-y-4">
                  {/* Phone */}
                  <a
                    href={`tel:${listing.contactPhone}`}
                    className="flex items-center gap-3 text-neutral-700 hover:text-primary transition-colors group/contact"
                  >
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover/contact:bg-primary/20 transition-colors">
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
                      className="flex items-center gap-3 text-neutral-700 hover:text-primary transition-colors group/contact"
                    >
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover/contact:bg-primary/20 transition-colors">
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
                      className="flex items-center gap-3 text-neutral-700 hover:text-primary transition-colors group/contact"
                    >
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover/contact:bg-primary/20 transition-colors">
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
            </Animated>

            {/* Social media */}
            {listing.socialMedia && Object.values(listing.socialMedia).some(Boolean) && (
              <Animated variant="fadeInUp" delay={250}>
                <div className="bg-white rounded-2xl border border-neutral-200 p-6 hover:shadow-lg transition-shadow">
                  <h2 className="text-lg font-semibold text-neutral-900 mb-4">{t('detail.socialMedia')}</h2>
                  <div className="space-y-3">
                    {listing.socialMedia.facebook && (
                      <a
                        href={listing.socialMedia.facebook}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-neutral-600 hover:text-blue-600 transition-colors font-medium"
                      >
                        Facebook
                      </a>
                    )}
                    {listing.socialMedia.instagram && (
                      <a
                        href={listing.socialMedia.instagram}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-neutral-600 hover:text-pink-600 transition-colors font-medium"
                      >
                        Instagram
                      </a>
                    )}
                    {listing.socialMedia.linkedin && (
                      <a
                        href={listing.socialMedia.linkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-neutral-600 hover:text-blue-700 transition-colors font-medium"
                      >
                        LinkedIn
                      </a>
                    )}
                  </div>
                </div>
              </Animated>
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
