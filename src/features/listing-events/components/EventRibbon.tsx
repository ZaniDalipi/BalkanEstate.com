import React from 'react';
import { useTranslation } from 'react-i18next';
import { formatPrice } from '@/utils/currency';
import { nextListingEvent } from '../utils/listingEvents';
import { eventRelative, eventWhen } from '../utils/eventFormat';
import type { EventSource } from '../types';
import EventIcon from './EventIcon';

interface EventRibbonProps {
  property: EventSource & { country?: string };
  className?: string;
}

const STYLE = {
  openHouse: 'bg-emerald-600/90',
  auction: 'bg-amber-600/95',
} as const;

/**
 * "Open house · Sat 11:00–13:00" or "Auction · Fri 21 Nov 18:00 · from €80,000"
 * on a result card. Nothing when the listing has neither.
 */
const EventRibbon: React.FC<EventRibbonProps> = ({ property, className = '' }) => {
  const { t, i18n } = useTranslation('property');
  const event = nextListingEvent(property, new Date());
  if (!event) return null;

  const { day, time } = eventWhen(event, i18n.language);
  const rel = eventRelative(event, new Date());
  const relText = rel ? t(`openHouse.when.${rel}`, { defaultValue: rel === 'now' ? 'Happening now' : rel === 'today' ? 'Today' : 'Tomorrow' }) : day;
  const label = event.kind === 'openHouse'
    ? t('listingEvents.ribbonOpenHouse', { when: `${relText} ${time}`, defaultValue: 'Open house · {{when}}' })
    : t('listingEvents.ribbonAuction', { when: `${relText} ${time}`, defaultValue: 'Auction · {{when}}' });
  const price = event.kind === 'auction' && event.startingPrice
    ? ` · ${t('listingEvents.from', { price: formatPrice(event.startingPrice, property.country), defaultValue: 'from {{price}}' })}`
    : '';

  return (
    <span
      data-testid="event-ribbon"
      data-kind={event.kind}
      className={`inline-flex max-w-full items-center gap-1 rounded-full px-2 py-[3px] text-[10px] font-semibold text-white backdrop-blur-sm ${STYLE[event.kind]} ${className}`}
    >
      <EventIcon kind={event.kind} className="h-3 w-3 flex-shrink-0" />
      <span className="truncate">{label}{price}</span>
    </span>
  );
};

export default EventRibbon;
