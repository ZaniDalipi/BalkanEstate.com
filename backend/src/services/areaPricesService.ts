/**
 * Area prices — what homes around a listing ask and sell for.
 *
 * Pure helpers only: the controller fetches nearby listings and hands them
 * here, so the maths (distances, medians, quarterly trend) is testable without
 * a database.
 */

/** Radii tried in turn until enough neighbours are found. */
export const AREA_RADII_KM = [1, 2, 4, 8] as const;

/** Fewer neighbours than this and the next radius is tried. */
export const MIN_NEIGHBOURS = 8;

/** Most neighbours returned for the map and list. */
export const MAX_NEIGHBOURS = 40;

/** How far back the trend reaches. */
export const TREND_QUARTERS = 12;

const EARTH_RADIUS_M = 6_371_000;

export type ClosedStatus = 'sold' | 'rented';

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
}

export interface Neighbour {
  id: string;
  title?: string;
  address?: string;
  city?: string;
  price: number;
  sqft?: number;
  pricePerSqm: number | null;
  beds?: number;
  propertyType: string;
  status: 'active' | ClosedStatus;
  lat: number;
  lng: number;
  distanceM: number;
  imageUrl?: string;
  listedAt?: string;
  closedAt?: string;
}

export interface TrendPoint {
  /** e.g. "2026-Q3" */
  period: string;
  askingPricePerSqm: number | null;
  askingCount: number;
  closedPricePerSqm: number | null;
  closedCount: number;
}

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
  sqft && sqft > 0 && price > 0 ? Math.round(price / sqft) : null;

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

const closedDate = (l: AreaListing): Date | undefined => (l.status === 'sold' ? l.soldAt : l.rentedAt);

/** Shape a listing for the response, measured from the centre. */
export const toNeighbour = (l: AreaListing, centerLat: number, centerLng: number): Neighbour => {
  const closed = closedDate(l);
  return {
    id: String(l._id),
    title: l.title,
    address: l.address,
    city: l.city,
    price: l.price,
    sqft: l.sqft,
    pricePerSqm: pricePerSqm(l.price, l.sqft),
    beds: l.beds,
    propertyType: l.propertyType,
    status: l.status === 'sold' || l.status === 'rented' ? l.status : 'active',
    lat: l.lat,
    lng: l.lng,
    distanceM: Math.round(distanceMeters(centerLat, centerLng, l.lat, l.lng)),
    imageUrl: l.imageUrl,
    listedAt: l.createdAt ? new Date(l.createdAt).toISOString() : undefined,
    closedAt: closed ? new Date(closed).toISOString() : undefined,
  };
};

/**
 * Median €/m² per quarter: asking prices by the quarter a home was listed,
 * closed prices by the quarter it sold (or was rented). Quarters with no data
 * stay in the series as nulls so the chart's time axis is even.
 */
export const buildTrend = (listings: AreaListing[], now: Date = new Date()): TrendPoint[] => {
  const quarters = lastQuarters(TREND_QUARTERS, now);
  const asking = new Map<string, number[]>();
  const closed = new Map<string, number[]>();
  const push = (map: Map<string, number[]>, key: string, value: number) => {
    const list = map.get(key);
    if (list) list.push(value);
    else map.set(key, [value]);
  };

  for (const l of listings) {
    const ppsqm = pricePerSqm(l.price, l.sqft);
    if (ppsqm === null) continue;
    if (l.createdAt) push(asking, quarterOf(new Date(l.createdAt)), ppsqm);
    const closedAt = closedDate(l);
    if (closedAt) push(closed, quarterOf(new Date(closedAt)), ppsqm);
  }

  return quarters.map((period) => {
    const a = asking.get(period) ?? [];
    const c = closed.get(period) ?? [];
    const am = median(a);
    const cm = median(c);
    return {
      period,
      askingPricePerSqm: am === null ? null : Math.round(am),
      askingCount: a.length,
      closedPricePerSqm: cm === null ? null : Math.round(cm),
      closedCount: c.length,
    };
  });
};

export interface AreaStats {
  activeCount: number;
  closedCount: number;
  medianAskingPricePerSqm: number | null;
  medianClosedPricePerSqm: number | null;
  medianAskingPrice: number | null;
  /** Median €/m² of every neighbour, asking and sold alike — what the subject is compared with. */
  medianPricePerSqm: number | null;
  /** How the subject's €/m² compares to the neighbourhood median, in percent. */
  subjectVsMedianPct: number | null;
}

/** Summary figures for the neighbours, compared against the subject's €/m². */
export const buildStats = (neighbours: Neighbour[], subjectPricePerSqm: number | null): AreaStats => {
  const active = neighbours.filter((n) => n.status === 'active');
  const closed = neighbours.filter((n) => n.status !== 'active');
  const ppsqm = (list: Neighbour[]) => list.map((n) => n.pricePerSqm).filter((v): v is number => v !== null);

  const medianAsking = median(ppsqm(active));
  const medianClosed = median(ppsqm(closed));
  // Compare against every neighbour with a known area, asking and sold alike:
  // a street where everything has sold still has a price.
  const reference = median(ppsqm(neighbours));
  const round = (v: number | null) => (v === null ? null : Math.round(v));

  return {
    activeCount: active.length,
    closedCount: closed.length,
    medianAskingPricePerSqm: round(medianAsking),
    medianClosedPricePerSqm: round(medianClosed),
    medianAskingPrice: round(median(active.map((n) => n.price))),
    medianPricePerSqm: round(reference),
    subjectVsMedianPct:
      subjectPricePerSqm !== null && reference
        ? Math.round(((subjectPricePerSqm - reference) / reference) * 1000) / 10
        : null,
  };
};
