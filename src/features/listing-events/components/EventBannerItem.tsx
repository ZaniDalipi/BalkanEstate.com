import React from 'react';
import { useTranslation } from 'react-i18next';
import { buildOpenHouseIcs, downloadIcs } from '@/src/features/open-houses/utils/openHouseIcs';
import { directionsUrl, eventRelative, eventWhen } from '../utils/eventFormat';
import type { ListingEvent } from '../types';
import AuctionDetails from './AuctionDetails';
import Countdown from './Countdown';
import EventIcon from './EventIcon';

interface EventBannerItemProps {
  event: ListingEvent;
  property: { id: string; title?: string; address?: string; city?: string; country?: string; lat?: number; lng?: number };
  now: Date;
  onGoToOpenHouse: () => void;
}

const BTN = 'inline-flex min-h-[44px] items-center rounded-lg px-3 text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1';

/** One open house or auction: when, a countdown, and what to do about it. */
const EventBannerItem: React.FC<EventBannerItemProps> = ({ event, property, now, onGoToOpenHouse }) => {
  const { t, i18n } = useTranslation('property');
  const isOh = event.kind === 'openHouse';
  const { day, time } = eventWhen(event, i18n.language);
  const rel = eventRelative(event, now);
  const title = isOh ? t('openHouse.title', { defaultValue: 'Open house' }) : t('listingEvents.auction', { defaultValue: 'Auction' });
  const location = [property.address, property.city, property.country].filter(Boolean).join(', ');
  const inPerson = isOh || event.mode === 'in_person';

  const addToCalendar = () => downloadIcs(isOh ? 'open-house.ics' : 'auction.ics', buildOpenHouseIcs({
    id: `${event.kind}-${property.id}-${event.startsAt}`,
    title: `${title}: ${property.title ?? ''}`.trim(),
    location: !isOh && event.mode === 'in_person' && event.location ? event.location : location,
    url: window.location.href,
    startsAt: event.startsAt,
    endsAt: event.endsAt ?? new Date(Date.parse(event.startsAt) + 60 * 60 * 1000).toISOString(),
  }));

  return (
    <li className={`rounded-xl border p-3 ${isOh ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className={`inline-flex items-center gap-1.5 font-bold ${isOh ? 'text-emerald-800' : 'text-amber-900'}`}>
          <EventIcon kind={event.kind} className="h-4 w-4" />
          {title}
        </span>
        <span className="text-sm font-medium text-neutral-800">
          {rel ? `${t(`openHouse.when.${rel}`, { defaultValue: rel })} · ` : ''}{day} · {time}
        </span>
        {rel !== 'now' && <Countdown target={event.startsAt} now={now} />}
      </div>
      {!isOh && <AuctionDetails auction={event} country={property.country} />}
      <div className="mt-2 flex flex-wrap gap-2">
        {isOh && (
          <button type="button" onClick={onGoToOpenHouse} className={`${BTN} bg-emerald-600 text-white hover:bg-emerald-700 focus-visible:ring-emerald-500`}>
            {t('openHouse.rsvp', { defaultValue: "I'm coming" })}
          </button>
        )}
        <button type="button" onClick={addToCalendar} className={`${BTN} text-neutral-700 hover:bg-white focus-visible:ring-neutral-400`}>
          {t('openHouse.addToCalendar', { defaultValue: 'Add to calendar' })}
        </button>
        {inPerson && property.lat != null && property.lng != null && (
          <a href={directionsUrl(property.lat, property.lng)} target="_blank" rel="noopener noreferrer" className={`${BTN} text-neutral-700 hover:bg-white focus-visible:ring-neutral-400`}>
            {t('listingEvents.directions', { defaultValue: 'Directions' })}
          </a>
        )}
      </div>
    </li>
  );
};

export default EventBannerItem;
