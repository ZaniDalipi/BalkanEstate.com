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

/** Nights in each rent period, to compare villas let by the night, week or month. */
const NIGHTS_PER_PERIOD: Record<RentPeriod, number> = { daily: 1, weekly: 7, monthly: 30 };

interface PricedVilla {
  price: number;
  listingType?: string;
  rentPeriod?: RentPeriod;
}

const isRental = (villa: PricedVilla): boolean => villa.listingType !== 'sale';

/** What one night costs at a villa's rent: €3,000 a month is €100 a night. */
export const nightlyRate = (villa: PricedVilla): number =>
  villa.price / NIGHTS_PER_PERIOD[villa.rentPeriod ?? 'monthly'];

/**
 * The figure villas are compared on: a rental's nightly rate, a sale's price.
 * The price filter and the "from" prices use it, so a villa let by the month
 * is weighed against nightly lets on the same footing.
 */
export const comparablePrice = (villa: PricedVilla): number =>
  isRental(villa) ? nightlyRate(villa) : villa.price;

/** Whether a villa falls inside a min / max price; either end may be open. */
export const inVillaPriceRange = (villa: PricedVilla, min: number | null, max: number | null): boolean => {
  if (min == null && max == null) return true;
  const value = comparablePrice(villa);
  return (min == null || value >= min) && (max == null || value <= max);
};

/** The cheapest villa by comparable price, to quote "from …" in its own period. */
export const cheapestVilla = <T extends PricedVilla>(villas: T[]): T | null => {
  let best: T | null = null;
  for (const villa of villas) {
    if (!(villa.price > 0)) continue;
    if (!best || comparablePrice(villa) < comparablePrice(best)) best = villa;
  }
  return best;
};
