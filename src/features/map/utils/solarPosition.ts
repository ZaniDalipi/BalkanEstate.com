// Accurate sun position for a real date/time and location.
//
// Treating the clock hour as solar time puts solar noon at 12:00 everywhere —
// off by up to ~1.5h in the Balkans once longitude, time zone and summer time
// are accounted for. Shadow simulation needs the true position, so this follows
// the standard low-precision solar ephemeris (same formulas as SunCalc / the
// Astronomical Almanac, ~0.1°).

const RAD = Math.PI / 180;
const DAY_MS = 86400000;
const J1970 = 2440588;
const J2000 = 2451545;
const OBLIQUITY = RAD * 23.4397;

export interface SunPosition {
  /** Degrees clockwise from north (90 = east, 180 = south, 270 = west). */
  azimuth: number;
  /** Degrees above the horizon (negative = below). */
  altitude: number;
}

const toDays = (date: Date): number => date.valueOf() / DAY_MS - 0.5 + J1970 - J2000;

export function getSunPosition(date: Date, lat: number, lng: number): SunPosition {
  const d = toDays(date);
  const M = RAD * (357.5291 + 0.98560028 * d); // solar mean anomaly
  const C = RAD * (1.9148 * Math.sin(M) + 0.02 * Math.sin(2 * M) + 0.0003 * Math.sin(3 * M));
  const L = M + C + RAD * 102.9372 + Math.PI; // ecliptic longitude
  const dec = Math.asin(Math.sin(OBLIQUITY) * Math.sin(L));
  const ra = Math.atan2(Math.sin(L) * Math.cos(OBLIQUITY), Math.cos(L));
  const siderealTime = RAD * (280.16 + 360.9856235 * d) + RAD * lng;
  const H = siderealTime - ra;
  const phi = RAD * lat;

  const altitude = Math.asin(Math.sin(phi) * Math.sin(dec) + Math.cos(phi) * Math.cos(dec) * Math.cos(H));
  // atan2 gives azimuth measured from south, westward positive
  const azFromSouth = Math.atan2(Math.sin(H), Math.cos(H) * Math.sin(phi) - Math.tan(dec) * Math.cos(phi));

  return {
    azimuth: ((azFromSouth / RAD + 180) % 360 + 360) % 360,
    altitude: altitude / RAD,
  };
}

/** Linear interpolation through [x, y] points sorted by x, clamped at the ends. */
function interpolate(points: [number, number][], x: number): number {
  if (x <= points[0][0]) return points[0][1];
  for (let i = 1; i < points.length; i++) {
    const [x1, y1] = points[i];
    if (x <= x1) {
      const [x0, y0] = points[i - 1];
      return y0 + ((x - x0) / (x1 - x0)) * (y1 - y0);
    }
  }
  return points[points.length - 1][1];
}

// Approximate CET/EET borders, as [lat, lng] (or [lng, lat]) polylines.
// Romania's Banat border with Serbia (and Hungary above it), lng east of which is Romania
const RO_WEST_BORDER: [number, number][] = [[44.6, 21.4], [44.81, 21.38], [45.15, 21.52], [45.47, 21.0], [45.79, 20.62], [46.12, 20.26], [46.2, 21.9]];
// Bulgaria's border with Serbia and North Macedonia, lng east of which is Bulgaria
const BG_WEST_BORDER: [number, number][] = [[41.35, 22.95], [41.6, 22.95], [41.9, 22.87], [42.3, 22.36], [42.55, 22.47], [42.9, 22.85], [43.2, 22.95], [43.55, 22.5], [43.9, 22.45], [44.22, 22.68]];
// Greece's border with Albania, lng east of which is Greece
const GR_AL_BORDER: [number, number][] = [[39.66, 20.22], [39.9, 20.33], [40.1, 20.6], [40.35, 20.73], [40.6, 21.0], [40.86, 20.98]];
// Greece's border with North Macedonia as [lng, lat], lat south of which is Greece
const GR_MK_BORDER: [number, number][] = [[20.98, 40.86], [21.3, 40.9], [21.6, 40.95], [21.93, 41.05], [22.5, 41.12], [22.75, 41.17], [22.95, 41.34]];

/**
 * Best-effort IANA time zone for a Balkan location. Listings carry no zone and
 * the region splits between CET (HR, SI, BA, RS, ME, XK, AL, MK) and EET (GR,
 * BG, RO); the border polylines above are coarse, so only a thin strip along
 * each border can come out an hour off.
 */
export function guessBalkanTimeZone(lat: number, lng: number): string {
  const CET = 'Europe/Belgrade';
  const EET = 'Europe/Athens';

  // Romania: north of the Danube's Iron Gates stretch, east of the Banat border
  if (lat >= 44.6) return lng > interpolate(RO_WEST_BORDER, lat) ? EET : CET;
  // Between the Timok mouth and the Iron Gates, Romania lies east of Serbia
  if (lat >= 44.22) return lng > 22.68 ? EET : CET;
  // Bulgaria (and Greece further south-east) vs Serbia / North Macedonia
  if (lat >= 41.35) return lng > interpolate(BG_WEST_BORDER, lat) ? EET : CET;
  if (lng >= 22.95) return EET;
  // Greece vs North Macedonia
  if (lng >= 20.98) return lat < interpolate(GR_MK_BORDER, lng) ? EET : CET;
  // Corfu faces the Albanian coast at Sarandë, so it needs its own box
  if (lat >= 39.35 && lat <= 39.83 && lng >= 19.6 && lng < 19.99) return EET;
  // Albania ends at ~39.64°N; everything south of it here is Greece
  if (lat < 39.64) return EET;
  return lng > interpolate(GR_AL_BORDER, lat) ? EET : CET;
}

/** Offset of `timeZone` from UTC at `date`, in minutes (e.g. +120 for CEST). */
function getTimeZoneOffsetMinutes(date: Date, timeZone: string): number {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    }).formatToParts(date);
    const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
    const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));
    return Math.round((asUtc - date.valueOf()) / 60000);
  } catch {
    return -date.getTimezoneOffset();
  }
}

/**
 * The instant at which the clock in `timeZone` shows `decimalHour` on the given
 * calendar day. `day` is read by its local Y/M/D only.
 */
export function zonedDateAtHour(day: Date, decimalHour: number, timeZone: string): Date {
  const minutes = Math.round(decimalHour * 60);
  const naiveUtc = Date.UTC(day.getFullYear(), day.getMonth(), day.getDate(), 0, minutes);
  // Two passes settle the offset across a DST change
  let offset = getTimeZoneOffsetMinutes(new Date(naiveUtc), timeZone);
  offset = getTimeZoneOffsetMinutes(new Date(naiveUtc - offset * 60000), timeZone);
  return new Date(naiveUtc - offset * 60000);
}

/** Current wall-clock hour (decimal) in `timeZone`. */
export function currentHourInZone(timeZone: string, now: Date = new Date()): number {
  const offset = getTimeZoneOffsetMinutes(now, timeZone);
  const local = new Date(now.valueOf() + offset * 60000);
  return local.getUTCHours() + local.getUTCMinutes() / 60;
}

export interface LocalSunTimes {
  /** Local clock hours (decimal) in the property's time zone. */
  sunrise: number;
  sunset: number;
  solarNoon: number;
  dayLength: number;
}

/**
 * Sunrise, sunset and solar noon on `day`, as local clock hours in `timeZone`.
 * Solved numerically from getSunPosition so it matches the shadows exactly.
 */
export function getLocalSunTimes(day: Date, lat: number, lng: number, timeZone: string): LocalSunTimes {
  // Sun's upper limb touching the horizon, with refraction
  const HORIZON = -0.833;
  const alt = (h: number) => getSunPosition(zonedDateAtHour(day, h, timeZone), lat, lng).altitude;

  // Solar noon: maximise altitude over the day
  let noon = 12;
  let best = -Infinity;
  for (let h = 6; h <= 18; h += 0.25) {
    const a = alt(h);
    if (a > best) { best = a; noon = h; }
  }
  for (let step = 0.125; step > 0.002; step /= 2) {
    if (alt(noon + step) > alt(noon)) noon += step;
    else if (alt(noon - step) > alt(noon)) noon -= step;
  }

  if (alt(noon) < HORIZON) return { sunrise: noon, sunset: noon, solarNoon: noon, dayLength: 0 };

  const bisect = (lo: number, hi: number): number => {
    const rising = alt(hi) > alt(lo);
    for (let i = 0; i < 30; i++) {
      const mid = (lo + hi) / 2;
      if ((alt(mid) > HORIZON) === rising) hi = mid;
      else lo = mid;
    }
    return (lo + hi) / 2;
  };
  const sunrise = alt(0) >= HORIZON ? 0 : bisect(0, noon);
  const sunset = alt(24) >= HORIZON ? 24 : bisect(noon, 24);

  return { sunrise, sunset, solarNoon: noon, dayLength: sunset - sunrise };
}
