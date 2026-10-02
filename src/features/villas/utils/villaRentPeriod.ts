import type { RentPeriod } from '@/types';

/**
 * The suffix after a villa's rent, from the period its owner priced it in:
 * "/ night", "/ week" or "/ month".
 *
 * New villa rentals are priced per night (the listing form sets it), but a
 * villa can be let weekly or monthly, and a card claiming "/ night" for a
 * monthly rent misquotes the price thirty times over. An unset period reads as
 * monthly — what the server stores by default, and how the property page and
 * map pins already read it.
 */
export const villaRentSuffix = (rentPeriod?: RentPeriod): { key: string; fallback: string } => {
  switch (rentPeriod) {
    case 'daily':
      return { key: 'villas:booking.perNight', fallback: '/ night' };
    case 'weekly':
      return { key: 'villas:booking.perWeek', fallback: '/ week' };
    default:
      return { key: 'villas:booking.perMonth', fallback: '/ month' };
  }
};
