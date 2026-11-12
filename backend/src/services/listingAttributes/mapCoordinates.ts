import type * as cheerio from 'cheerio';
import { fixSwappedCoordinates } from './location';

/**
 * A listing's map position, read from wherever the page keeps it. Most
 * detail pages show a map, and the map has to be told where to point:
 *
 *   1. meta tags      place:location:latitude, geo.position, ICBM
 *   2. microdata      itemprop="latitude" / "longitude"
 *   3. elements       class="latitude">44.82<, data-lat / data-lng / data-latitude…
 *   4. map embeds     Google Maps iframes and links (q=, ll=, center=, @lat,lng, !3d…!4d…),
 *                     OpenStreetMap (mlat/mlon, marker=, #map=z/lat/lng), Bing (cp=lat~lng)
 *   5. map scripts    new google.maps.LatLng(lat, lng), L.marker([lat, lng]), setView([…]),
 *                     { lat: …, lng: … }, "latitude": …, "longitude": …
 *
 * The first source that gives a valid pair wins. Pairs a site wrote the
 * wrong way round are swapped back.
 */

export interface Coordinates { lat: number; lng: number }

const NUM = String.raw`(-?\d{1,3}\.\d{2,})`;

const valid = (lat: number, lng: number): boolean =>
  Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 && !(lat === 0 && lng === 0);

const pair = (lat: unknown, lng: unknown): Coordinates | undefined => {
  const a = parseFloat(String(lat ?? '').trim().replace(',', '.'));
  const b = parseFloat(String(lng ?? '').trim().replace(',', '.'));
  return valid(a, b) ? fixSwappedCoordinates(a, b) : undefined;
};

/** "44.82,13.86", "44.82; 13.86", "44.82 13.86" → coordinates. */
const pairFromText = (text: string | undefined): Coordinates | undefined => {
  const m = text?.match(new RegExp(`${NUM}\\s*[,;~ ]\\s*${NUM}`));
  return m ? pair(m[1], m[2]) : undefined;
};

const fromMeta = ($: cheerio.CheerioAPI): Coordinates | undefined => {
  const meta = (name: string) =>
    $(`meta[property="${name}"], meta[name="${name}"]`).first().attr('content');
  return pair(meta('place:location:latitude'), meta('place:location:longitude'))
    ?? pair(meta('og:latitude'), meta('og:longitude'))
    ?? pairFromText(meta('geo.position'))
    ?? pairFromText(meta('ICBM'));
};

const fromMicrodata = ($: cheerio.CheerioAPI): Coordinates | undefined => {
  const val = (prop: string) => {
    const el = $(`[itemprop="${prop}"]`).first();
    return el.attr('content') ?? el.attr('value') ?? el.text();
  };
  return pair(val('latitude'), val('longitude'));
};

const fromElements = ($: cheerio.CheerioAPI): Coordinates | undefined => {
  const byClass = pair($('.latitude, .lat, .map-lat').first().text(), $('.longitude, .lng, .lon, .map-lng').first().text());
  if (byClass) return byClass;
  const attrPairs: Array<[string, string]> = [
    ['data-lat', 'data-lng'], ['data-lat', 'data-lon'], ['data-latitude', 'data-longitude'],
    ['data-map-lat', 'data-map-lng'], ['data-gmap-lat', 'data-gmap-lng'], ['lat', 'lng'],
  ];
  for (const [la, lo] of attrPairs) {
    const el = $(`[${la}][${lo}]`).first();
    const hit = el.length ? pair(el.attr(la), el.attr(lo)) : undefined;
    if (hit) return hit;
  }
  for (const attr of ['data-coords', 'data-coordinates', 'data-latlng', 'data-lat-lng', 'data-position', 'data-location', 'data-center']) {
    const hit = pairFromText($(`[${attr}]`).first().attr(attr));
    if (hit) return hit;
  }
  return undefined;
};

/** Coordinates inside a Google / OpenStreetMap / Bing / Apple Maps URL. */
export const coordinatesFromMapUrl = (rawUrl: string): Coordinates | undefined => {
  let url = rawUrl;
  try {
    url = decodeURIComponent(rawUrl);
  } catch {
    // keep as is
  }
  if (!/google\.[a-z.]+\/maps|maps\.google|goo\.gl\/maps|openstreetmap|osm\.org|bing\.com\/maps|maps\.apple|waze\.com|mapbox|here\.com/i.test(url)) {
    return undefined;
  }
  const embed = url.match(new RegExp(`!3d${NUM}!4d${NUM}`)); // pb= embed: !3d lat !4d lng
  if (embed) return pair(embed[1], embed[2]);
  const embed2 = url.match(new RegExp(`!2d${NUM}!3d${NUM}`)); // !2d lng !3d lat
  if (embed2) return pair(embed2[2], embed2[1]);
  const at = url.match(new RegExp(`@${NUM},${NUM}`));
  if (at) return pair(at[1], at[2]);
  const osm = url.match(new RegExp(`mlat=${NUM}.*?mlon=${NUM}`));
  if (osm) return pair(osm[1], osm[2]);
  const hash = url.match(new RegExp(`#map=\\d+/${NUM}/${NUM}`));
  if (hash) return pair(hash[1], hash[2]);
  const param = url.match(new RegExp(`[?&](?:q|ll|sll|center|query|destination|daddr|marker|cp|coordinates)=(?:loc:)?${NUM}\\s*[,~ ]\\s*${NUM}`));
  if (param) return pair(param[1], param[2]);
  return undefined;
};

const fromMapEmbeds = ($: cheerio.CheerioAPI): Coordinates | undefined => {
  const urls = [
    ...$('iframe[src], iframe[data-src]').toArray().map((el) => $(el).attr('src') ?? $(el).attr('data-src') ?? ''),
    ...$('a[href]').toArray().map((el) => $(el).attr('href') ?? ''),
    ...$('img[src*="staticmap"], img[data-src*="staticmap"]').toArray().map((el) => $(el).attr('src') ?? $(el).attr('data-src') ?? ''),
  ];
  for (const u of urls) {
    const hit = coordinatesFromMapUrl(u);
    if (hit) return hit;
  }
  return undefined;
};

const SCRIPT_PATTERNS: Array<{ re: RegExp; latFirst: boolean }> = [
  { re: new RegExp(`LatLng\\(\\s*${NUM}\\s*,\\s*${NUM}`), latFirst: true },
  { re: new RegExp(`(?:marker|setView|circle|flyTo|panTo)\\(\\s*\\[\\s*${NUM}\\s*,\\s*${NUM}`), latFirst: true },
  { re: new RegExp(`["']?lat(?:itude)?["']?\\s*[:=]\\s*["']?${NUM}["']?\\s*,\\s*["']?(?:lng|lon|long|longitude)["']?\\s*[:=]\\s*["']?${NUM}`, 'i'), latFirst: true },
  { re: new RegExp(`["']?(?:lng|lon|long|longitude)["']?\\s*[:=]\\s*["']?${NUM}["']?\\s*,\\s*["']?lat(?:itude)?["']?\\s*[:=]\\s*["']?${NUM}`, 'i'), latFirst: false },
  // Mapbox: center: [lng, lat] — the swap check corrects it inside our region.
  { re: new RegExp(`center\\s*:\\s*\\[\\s*${NUM}\\s*,\\s*${NUM}`), latFirst: false },
];

const fromScripts = ($: cheerio.CheerioAPI): Coordinates | undefined => {
  for (const el of $('script:not([src])').toArray()) {
    const code = $(el).contents().text();
    if (code.length < 20 || code.length > 400_000) continue;
    for (const { re, latFirst } of SCRIPT_PATTERNS) {
      const m = code.match(re);
      const hit = m && (latFirst ? pair(m[1], m[2]) : pair(m[2], m[1]));
      if (hit) return hit;
    }
  }
  return undefined;
};

/** The listing's coordinates on a detail page, or undefined when the page has none. */
export const extractMapCoordinates = ($: cheerio.CheerioAPI): Coordinates | undefined =>
  fromMeta($) ?? fromMicrodata($) ?? fromElements($) ?? fromMapEmbeds($) ?? fromScripts($);
