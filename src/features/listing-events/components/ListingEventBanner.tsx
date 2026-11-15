import React from 'react';
import { useTranslation } from 'react-i18next';
import { useOpenHouses } from '@/src/features/open-houses/hooks/useOpenHouses';
import { useNow } from '../hooks/useNow';
import { listingEvents } from '../utils/listingEvents';
import type { EventSource } from '../types';
import EventBannerItem from './EventBannerItem';

interface ListingEventBannerProps {
  property: EventSource & { id: string; title?: string; address?: string; city?: string; country?: string; lat?: number; lng?: number; status?: string };
}

const HOUR_MS = 60 * 60 * 1000;

/** Bring the (visible copy of the) open house card into view. */
function scrollToOpenHouse(): void {
  const all = Array.from(document.querySelectorAll<HTMLElement>('[data-open-house-section]'));
  const target = all.find((el) => el.offsetParent !== null) ?? all[0];
  target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  target?.querySelector<HTMLButtonElement>('button')?.focus({ preventScroll: true });
}

/**
 * Top of the listing page: the upcoming open house and/or auction with a
 * live countdown. Renders nothing for the usual listing without either.
 */
const ListingEventBanner: React.FC<ListingEventBannerProps> = ({ property }) => {
  const { t } = useTranslation('property');
  // The listing page loads open houses itself (shared with the RSVP card).
  const { data: openHouses } = useOpenHouses(property.id);
  const source: EventSource = {
    nextOpenHouse: openHouses?.[0] ? { startsAt: openHouses[0].startsAt, endsAt: openHouses[0].endsAt } : property.nextOpenHouse,
    auction: property.auction,
  };
  const first = listingEvents(source, new Date())[0];
  const soon = first ? Date.parse(first.startsAt) - Date.now() < HOUR_MS : false;
  // Seconds only matter in the last hour; otherwise a minute tick is plenty.
  const now = useNow(first ? (soon ? 1000 : 60_000) : null);
  if (property.status === 'sold' || property.status === 'rented') return null;
  const events = listingEvents(source, now);
  if (events.length === 0) return null;

  return (
    <section aria-label={t('listingEvents.bannerLabel', { defaultValue: 'Open house and auction dates' })} className="mx-4 lg:mx-0">
      <ul className="space-y-2">
        {events.map((e) => (
          <EventBannerItem key={`${e.kind}-${e.startsAt}`} event={e} property={property} now={now} onGoToOpenHouse={scrollToOpenHouse} />
        ))}
      </ul>
    </section>
  );
};

export default ListingEventBanner;
