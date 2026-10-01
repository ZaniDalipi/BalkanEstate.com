/**
 * How a home that sold or is let looks on a map.
 *
 * Sold and let homes stay on the site as the price history of their area. On
 * a map they must never read as homes still on the market: their pill is a
 * muted stone and their price carries the word "Sold" or "Rented". Shared by
 * the Leaflet and Google map markers so the two can never disagree.
 */

import i18n from 'i18next';

export const CLOSED_MARKER_COLOR = '#57534e';

export const isClosedListing = (property: { status?: string }): boolean =>
  property.status === 'sold' || property.status === 'rented';

/** "Sold €125K", "Rented €650" — or the price alone for a home on the market. */
export const closedMarkerLabel = (property: { status?: string }, price: string): string => {
  if (property.status === 'sold') return `${i18n.t('property:sold', 'Sold')} ${price}`;
  if (property.status === 'rented') return `${i18n.t('property:rented', 'Rented')} ${price}`;
  return price;
};
