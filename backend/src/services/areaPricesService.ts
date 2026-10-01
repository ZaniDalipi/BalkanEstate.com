/**
 * Area prices — what homes around a listing ask, and what they sold or let for.
 *
 * Pure helpers only: the controller fetches nearby listings and hands them
 * here, so the maths (distances, medians, quarterly trend) is testable without
 * a database.
 *
 * Every comparison runs on a single "value" per home, chosen by the basis:
 *   - homes for sale and long lets: price per m² (rent per month)
 *   - short stays (rent set per day): the price per night itself — size says
 *     little about what a holiday let earns
 * Rents are compared like with like: a weekly rent is turned into a monthly
 * one, and nightly lets are only ever compared with other nightly lets.
 */

/** Radii tried in turn until enough neighbours are found. */
export const AREA_RADII_KM = [1, 2, 4, 8] as const;

/** Fewer neighbours than this and the next radius is tried. */
export const MIN_NEIGHBOURS = 8;

/** Most neighbours returned for the map and list. */
export const MAX_NEIGHBOURS = 40;

/** How far back the trend reaches. */
export const TREND_QUARTERS = 12;

/** Same factor the rest of the app uses to turn a weekly rent into a monthly one. */
export const WEEKS_PER_MONTH = 4.33;

/** Nightly rents are stored in rental history multiplied by this. */
const NIGHTS_PER_MONTH = 30;

const EARTH_RADIUS_M = 6_371_000;

export type ClosedStatus = 'sold' | 'rented';
export type RentPeriod = 'monthly' | 'weekly' | 'daily';

/** What a property is compared on. */
export interface Basis {
  listingType: 'sale' | 'rent';
  /** Rents only: the unit every rent is shown in. */
  rentUnit?: 'month' | 'night';
  /** 'perSqm' compares price per m²; 'price' compares the price itself. */
  metric: 'perSqm' | 'price';
}

export interface AreaListing {
  _id: unknown;
  title?: string;
  address?: string;
  city?: string;
  price: number;
  sqft?: number;
  beds?: number;
  propertyType: string;
  status: string;
  lat: number;
  lng: number;
  imageUrl?: string;
  createdAt?: Date;
  soldAt?: Date;
  rentedAt?: Date;
  rentPeriod?: string;
  /** Past lets. Only the rent and start date are ever read — tenant details stay private. */
  rentalHistory?: Array<{ startDate?: Date; monthlyRent?: number }>;
}

export interface Neighbour {
  id: string;
  title?: string;
  address?: string;
  city?: string;
  /** Asking price, or current rent in the basis' unit. */
  price: number;
  sqft?: number;
  pricePerSqm: number | null;
  /** What the home is compared on (see Basis). */
  value: number | null;
  beds?: number;
  propertyType: string;
  status: 'active' | ClosedStatus;
  lat: number;
  lng: number;
  distanceM: number;
  imageUrl?: string;
  listedAt?: string;
  /** When it last sold or was let. */
  closedAt?: string;
  /** The price it last sold or let for. */
  closedPrice?: number;
  closedValue?: number | null;
}

export interface TrendPoint {
  /** e.g. "2026-Q3" */
  period: string;
  askingValue: number | null;
  askingCount: number;
  closedValue: number | null;
  closedCount: number;
}

interface PriceEvent {
  at: Date;
  price: number;
}

/** The basis a property is compared on, from its listing type and rent period. */
export const basisFor = (listingType?: string, rentPeriod?: string): Basis => {
  if (listingType !== 'rent') return { listingType: 'sale', metric: 'perSqm' };
  return rentPeriod === 'daily'
    ? { listingType: 'rent', rentUnit: 'night', metric: 'price' }
    : { listingType: 'rent', rentUnit: 'month', metric: 'perSqm' };
};

/**
 * What to compare against when an area has too few homes of the same type.
 * Luxury villas are a curated market: they widen to ordinary villas, never to
 * flats. Every other type widens to all homes nearby (`null`).
 */
export const fallbackTypesFor = (propertyType: string): string[] | null =>
  propertyType === 'luxury-villa' ? ['luxury-villa', 'villa'] : null;

/** Round money: whole euros, but keep a decimal on small figures like €8.5/m². */
export const roundMoney = (v: number): number => (Math.abs(v) >= 100 ? Math.round(v) : Math.round(v * 10) / 10);

/** Great-circle distance in metres. */
export const distanceMeters = (aLat: number, aLng: number, bLat: number, bLng: number): number => {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(bLat - aLat);
  const dLng = rad(bLng - aLng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(aLat)) * Math.cos(rad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
};

/** A lat/lng box that contains the circle of `radiusKm` around the point. */
export const boundingBox = (lat: number, lng: number, radiusKm: number) => {
  const dLat = radiusKm / 111.32;
  const dLng = radiusKm / (111.32 * Math.max(Math.cos((lat * Math.PI) / 180), 0.01));
  return { minLat: lat - dLat, maxLat: lat + dLat, minLng: lng - dLng, maxLng: lng + dLng };
};

export const median = (values: number[]): number | null => {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

/** Price per m², or null when the area is unknown. */
export const pricePerSqm = (price: number, sqft?: number): number | null =>
  sqft && sqft > 0 && price > 0 ? roundMoney(price / sqft) : null;

/** A listing's price in the basis' unit: a weekly rent becomes a monthly one. */
export const normalizePrice = (price: number, rentPeriod: string | undefined, basis: Basis): number =>
  basis.rentUnit === 'month' && rentPeriod === 'weekly' ? roundMoney(price * WEEKS_PER_MONTH) : price;

/** The value a price is compared on, for a home of `sqft` m². */
export const valueOf = (price: number, sqft: number | undefined, basis: Basis): number | null =>
  basis.metric === 'price' ? (price > 0 ? roundMoney(price) : null) : pricePerSqm(price, sqft);

/** "2026-Q3" for a date. */
export const quarterOf = (date: Date): string =>
  `${date.getUTCFullYear()}-Q${Math.floor(date.getUTCMonth() / 3) + 1}`;

/** The last `count` quarters up to and including the one `now` is in, oldest first. */
export const lastQuarters = (count: number, now: Date = new Date()): string[] => {
  const out: string[] = [];
  let year = now.getUTCFullYear();
  let q = Math.floor(now.getUTCMonth() / 3);
  for (let i = 0; i < count; i++) {
    out.unshift(`${year}-Q${q + 1}`);
    q -= 1;
    if (q < 0) {
      q = 3;
      year -= 1;
    }
  }
  return out;
};

/**
 * Every time a home sold or was let, with the price in the basis' unit.
 * A rental can have many: each past let from its history, plus the current one.
 */
export const closedEvents = (l: AreaListing, basis: Basis): PriceEvent[] => {
  if (basis.listingType === 'sale') {
    return l.status === 'sold' && l.soldAt ? [{ at: new Date(l.soldAt), price: l.price }] : [];
  }
  const events: PriceEvent[] = [];
  for (const entry of l.rentalHistory ?? []) {
    if (!entry.startDate || !(entry.monthlyRent && entry.monthlyRent > 0)) continue;
    const price = basis.rentUnit === 'night' ? entry.monthlyRent / NIGHTS_PER_MONTH : entry.monthlyRent;
    events.push({ at: new Date(entry.startDate), price: roundMoney(price) });
  }
  if (l.status === 'rented' && l.rentedAt) {
    events.push({ at: new Date(l.rentedAt), price: normalizePrice(l.price, l.rentPeriod, basis) });
  }
  return events;
};

/** Shape a listing for the response, measured from the centre. */
export const toNeighbour = (l: AreaListing, centerLat: number, centerLng: number, basis: Basis): Neighbour => {
  const price = normalizePrice(l.price, l.rentPeriod, basis);
  const latest = closedEvents(l, basis).sort((a, b) => b.at.getTime() - a.at.getTime())[0];
  return {
    id: String(l._id),
    title: l.title,
    address: l.address,
    city: l.city,
    price,
    sqft: l.sqft,
    pricePerSqm: pricePerSqm(price, l.sqft),
    value: valueOf(price, l.sqft, basis),
    beds: l.beds,
    propertyType: l.propertyType,
    status: l.status === 'sold' || l.status === 'rented' ? l.status : 'active',
    lat: l.lat,
    lng: l.lng,
    distanceM: Math.round(distanceMeters(centerLat, centerLng, l.lat, l.lng)),
    imageUrl: l.imageUrl,
    listedAt: l.createdAt ? new Date(l.createdAt).toISOString() : undefined,
    closedAt: latest ? latest.at.toISOString() : undefined,
    closedPrice: latest?.price,
    closedValue: latest ? valueOf(latest.price, l.sqft, basis) : undefined,
  };
};

/**
 * Median value per quarter: asking prices by the quarter a home was listed,
 * closed prices by the quarter it sold or was let. Quarters with no data stay
 * in the series as nulls so the chart's time axis is even.
 */
export const buildTrend = (listings: AreaListing[], basis: Basis, now: Date = new Date()): TrendPoint[] => {
  const quarters = lastQuarters(TREND_QUARTERS, now);
  const asking = new Map<string, number[]>();
  const closed = new Map<string, number[]>();
  const push = (map: Map<string, number[]>, at: Date, value: number | null) => {
    if (value === null) return;
    const key = quarterOf(at);
    const list = map.get(key);
    if (list) list.push(value);
    else map.set(key, [value]);
  };

  for (const l of listings) {
    if (l.createdAt) push(asking, new Date(l.createdAt), valueOf(normalizePrice(l.price, l.rentPeriod, basis), l.sqft, basis));
    for (const e of closedEvents(l, basis)) push(closed, e.at, valueOf(e.price, l.sqft, basis));
  }

  const roundOrNull = (v: number | null) => (v === null ? null : roundMoney(v));
  return quarters.map((period) => {
    const a = asking.get(period) ?? [];
    const c = closed.get(period) ?? [];
    return {
      period,
      askingValue: roundOrNull(median(a)),
      askingCount: a.length,
      closedValue: roundOrNull(median(c)),
      closedCount: c.length,
    };
  });
};

export interface AreaStats {
  /** Homes on the market now. */
  activeCount: number;
  /** Homes that have sold, or been let at least once. */
  closedCount: number;
  medianAskingValue: number | null;
  /** Median of each home's latest sale or let. */
  medianClosedValue: number | null;
  medianAskingPrice: number | null;
  /** Median value of every neighbour — what the subject is compared with. */
  medianValue: number | null;
  /** How the subject's value compares to the neighbourhood median, in percent. */
  subjectVsMedianPct: number | null;
}

/** Summary figures for the neighbours, compared against the subject's value. */
export const buildStats = (neighbours: Neighbour[], subjectValue: number | null): AreaStats => {
  const active = neighbours.filter((n) => n.status === 'active');
  const closed = neighbours.filter((n) => n.status !== 'active' || n.closedAt);
  const known = (values: Array<number | null | undefined>) => values.filter((v): v is number => typeof v === 'number');
  const roundOrNull = (v: number | null) => (v === null ? null : roundMoney(v));

  // Compare against every neighbour, on the market or not: a street where
  // everything has sold still has a price.
  const reference = median(known(neighbours.map((n) => n.value)));

  return {
    activeCount: active.length,
    closedCount: closed.length,
    medianAskingValue: roundOrNull(median(known(active.map((n) => n.value)))),
    medianClosedValue: roundOrNull(median(known(closed.map((n) => n.closedValue)))),
    medianAskingPrice: roundOrNull(median(active.map((n) => n.price))),
    medianValue: roundOrNull(reference),
    subjectVsMedianPct:
      subjectValue !== null && reference
        ? Math.round(((subjectValue - reference) / reference) * 1000) / 10
        : null,
  };
};
