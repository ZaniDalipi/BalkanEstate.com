import React, { useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useReducedMotion } from 'framer-motion';
import { optimizeImageUrl } from '@/config/mediaConfig';
import { API_URL } from '@/src/shared/api/config';
import Footer from '@/components/shared/Footer';
import { SEO } from '@/src/components/seo';
import type { BusinessListing } from '@/src/shared/types/businessListing.types';
import { useNow } from '../../hooks/useNow';
import { useScrolledPast } from '../../hooks/useScrolledPast';
import { useShareAndCopy } from '../../hooks/useShareAndCopy';
import { useVisitorLocation } from '../../hooks/useVisitorLocation';
import { useBusinessPlace } from '../../hooks/useBusinessPlace';
import { haversineKm } from '../../utils/travel';
import { getOpenStatus } from '../../utils/businessHours';
import { categoryLabel } from '../../utils/categoryStyle';
import { contactChannels, quickActions } from '../../utils/contactChannels';
import { businessJsonLd } from '../../utils/businessJsonLd';
import { BusinessAboutSection } from './BusinessAboutSection';
import { BusinessBanner } from './BusinessBanner';
import { BusinessContactSection } from './BusinessContactSection';
import { BusinessFactsSection } from './BusinessFactsSection';
import { BusinessHoursSection } from './BusinessHoursSection';
import { BusinessIdentityCard } from './BusinessIdentityCard';
import { BusinessLocationSection } from './BusinessLocationSection';
import { BusinessMobileActionBar } from './BusinessMobileActionBar';
import { BusinessOwnerSection } from './BusinessOwnerSection';
import { BusinessQuickActions } from './BusinessQuickActions';
import { DetailToast } from './DetailToast';
import { SimilarBusinesses } from './SimilarBusinesses';

interface BusinessProfileProps {
  listing: BusinessListing;
  isOwner: boolean;
  onBack: () => void;
  onEdit: () => void;
}

/**
 * The business profile, laid out like a place card: cover, identity and the
 * action row first; then the story and facts on the left and how to reach
 * them on the right (stacked on phones and tablets, with a bottom bar).
 */
export const BusinessProfile: React.FC<BusinessProfileProps> = ({ listing, isOwner, onBack, onEdit }) => {
  const { t } = useTranslation('businessDirectory');
  const now = useNow();
  const actionsRef = useRef<HTMLDivElement>(null);
  const actionsPast = useScrolledPast(actionsRef);
  const { toast, share, copy } = useShareAndCopy(listing.name);
  const { location, locate } = useVisitorLocation();
  const reduceMotion = useReducedMotion();
  const jumpTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });

  const status = getOpenStatus(listing.businessHours, now);
  const channels = useMemo(() => contactChannels(listing), [listing]);
  const category = categoryLabel(listing, t);
  // The same 1200×630 share card the link-preview crawlers get (cover + logo + name).
  const shareCard = `${API_URL}/og/business/${encodeURIComponent(listing.id)}/image.jpg?v=${Date.parse(listing.updatedAt).toString(36)}`;
  const photo = optimizeImageUrl(listing.bannerUrl || listing.logoUrl, { width: 1200 });
  const tint = optimizeImageUrl(listing.bannerUrl, { width: 160 });
  const { place, isLocating: isLocatingPlace } = useBusinessPlace(listing);
  // Only a real pin or address is close enough to quote a distance from.
  const distanceKm = location.status === 'ready' && place && place.precision !== 'city' ? haversineKm(location.position, place.position) : null;

  return (
    // Room for the bottom contact bar. Below md the app's scroll container
    // already reserves 3.5rem + the home-indicator inset, so only top that up.
    <div className="liquid-backdrop relative min-h-screen overflow-x-clip pb-10 md:pb-28 lg:pb-0">
      <SEO
        title={`${listing.name} – ${category}, ${listing.city}`}
        description={listing.description?.slice(0, 160) || `${listing.name}: ${category} in ${listing.city}, ${listing.country}.`}
        image={shareCard}
        jsonLd={businessJsonLd(listing, typeof window !== 'undefined' ? window.location.href : '', photo)}
      />
      {/* Ambient tint: the cover photo, blurred, behind the glass. */}
      {tint && (
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[700px] overflow-hidden [mask-image:linear-gradient(to_bottom,black_30%,transparent)]" aria-hidden="true">
          <img src={tint} alt="" className="h-full w-full scale-125 object-cover opacity-45 blur-3xl saturate-150" />
        </div>
      )}

      {/* The app's own header sits above: the mobile bar (title + history-aware back) or the desktop pills. */}
      <div className="relative mx-auto max-w-6xl sm:px-6 sm:pt-4 sm:pr-[max(1.5rem,env(safe-area-inset-right))]">
        <BusinessBanner listing={listing} isOwner={isOwner} onBack={onBack} onEdit={onEdit} />
        <BusinessIdentityCard
          listing={listing}
          status={status}
          now={now}
          distanceKm={distanceKm}
          onDistanceClick={() => jumpTo('business-location')}
        >
          <BusinessQuickActions ref={actionsRef} actions={quickActions(channels)} onShare={share} />
        </BusinessIdentityCard>

        <div className="mt-5 grid gap-5 px-3 sm:mt-6 sm:px-0 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start lg:gap-6">
          <div className="min-w-0 space-y-5">
            <BusinessAboutSection listing={listing} />
            <BusinessFactsSection listing={listing} now={now} />
            <BusinessOwnerSection listing={listing} />
          </div>
          <aside className="min-w-0 space-y-5" aria-label={t('detail.contactInfo', 'Contact')}>
            <BusinessContactSection listing={listing} channels={channels} onCopy={copy} />
            <BusinessHoursSection hours={listing.businessHours} status={status} now={now} />
          </aside>
        </div>

        {/* Location gets the full width: a big map, with the route beside it on desktop. */}
        <div className="mt-5 px-3 sm:mt-6 sm:px-0">
          <BusinessLocationSection listing={listing} place={place} isLocatingPlace={isLocatingPlace} location={location} onLocate={locate} onCopy={copy} />
        </div>

        <SimilarBusinesses listing={listing} />
      </div>

      <div className="relative mt-10">
        <Footer />
      </div>
      <BusinessMobileActionBar visible={actionsPast && !isOwner} name={listing.name} status={status} channels={channels} />
      <DetailToast toast={toast} />
    </div>
  );
};
