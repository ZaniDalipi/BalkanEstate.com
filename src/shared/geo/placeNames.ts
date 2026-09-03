/**
 * How a place is written on screen.
 *
 * Two rules, both borrowed from Google Maps, and they are the whole module:
 *
 *   1. **A place is written the way it is written locally.** Budva's beach
 *      suburb is "Bečići", not "Becici"; Albania's second port is "Durrës",
 *      not "Durres". The app *stores* ASCII (that is what a seller's listing
 *      and every URL carry) and searching folds both spellings to the same
 *      key, so the diacritics are free — they cost nothing but a lookup and
 *      they are what makes the list look like it was written by someone who
 *      lives there.
 *
 *   2. **A label is one specific name plus just enough context to tell it
 *      apart.** Google shows "Bečići" over "Budva, Montenegro", never
 *      "Bečići, Opština Budva, 85315, Montenegro". So the primary line is
 *      the most specific name, the secondary line is at most two ancestors
 *      and the country, and administrative filler and postcodes are dropped
 *      on the way.
 *
 * Everything the user reads goes through here, so a place cannot be spelled
 * one way in the search box and another way on the listing.
 */

import { normalizePlaceName } from './normalize';
import { BALKAN_LOCALITIES } from './localities';
import { BALKAN_LOCATIONS } from '@/utils/balkanLocations';

/**
 * Local spellings of the cities the app stores in ASCII.
 *
 * Only diacritics are restored — never a different name. "Belgrade" stays
 * "Belgrade" and "Tirana" stays "Tirana", because swapping in "Beograd" or
 * "Tiranë" would be translating rather than spelling, and the app's own i18n
 * layer is what decides which language a user reads.
 */
const CITY_SPELLINGS: Record<string, string> = {
  // Kosovo
  Decan: 'Deçan',
  // Albania
  Durres: 'Durrës',
  Vlore: 'Vlorë',
  Shkoder: 'Shkodër',
  Korce: 'Korçë',
  Kavaje: 'Kavajë',
  Gjirokaster: 'Gjirokastër',
  Sarande: 'Sarandë',
  Kukes: 'Kukës',
  Lezhe: 'Lezhë',
  Lushnje: 'Lushnjë',
  Permet: 'Përmet',
  Kruje: 'Krujë',
  Corovode: 'Çorovodë',
  Erseke: 'Ersekë',
  Kelcyre: 'Këlcyrë',
  // North Macedonia
  Stip: 'Štip',
  Kicevo: 'Kičevo',
  Kocani: 'Kočani',
  Radovis: 'Radoviš',
  Delcevo: 'Delčevo',
  // Serbia
  Nis: 'Niš',
  Pancevo: 'Pančevo',
  Cacak: 'Čačak',
  Uzice: 'Užice',
  Sabac: 'Šabac',
  Pozarevac: 'Požarevac',
  Zajecar: 'Zaječar',
  Vrsac: 'Vršac',
  Krusevac: 'Kruševac',
  Arandelovac: 'Aranđelovac',
  // Bosnia and Herzegovina
  Brcko: 'Brčko',
  'Velika Kladusa': 'Velika Kladuša',
  Gorazde: 'Goražde',
  Zavidovici: 'Zavidovići',
  Foca: 'Foča',
  Gradacac: 'Gradačac',
  'Siroki Brijeg': 'Široki Brijeg',
  // Croatia
  Varazdin: 'Varaždin',
  Sibenik: 'Šibenik',
  Pozega: 'Požega',
  Gospic: 'Gospić',
  Cakovec: 'Čakovec',
  Omis: 'Omiš',
  Korcula: 'Korčula',
  Losinj: 'Lošinj',
  Pasman: 'Pašman',
  Solta: 'Šolta',
  Ciovo: 'Čiovo',
  Fazana: 'Fažana',
  Porec: 'Poreč',
  Primosten: 'Primošten',
  Brac: 'Brač',
  // Montenegro
  Niksic: 'Nikšić',
  Zabljak: 'Žabljak',
  Kolasin: 'Kolašin',
  Pluzine: 'Plužine',
  Rozaje: 'Rožaje',
  // Romania
  Timisoara: 'Timișoara',
  Iasi: 'Iași',
  Constanta: 'Constanța',
  Brasov: 'Brașov',
  Galati: 'Galați',
  Ploiesti: 'Ploiești',
  Braila: 'Brăila',
  Pitesti: 'Pitești',
  Bacau: 'Bacău',
  'Targu Mures': 'Târgu Mureș',
  Buzau: 'Buzău',
  Botosani: 'Botoșani',
  'Piatra Neamt': 'Piatra Neamț',
  'Ramnicu Valcea': 'Râmnicu Vâlcea',
  Focsani: 'Focșani',
  'Targu Jiu': 'Târgu Jiu',
  Resita: 'Reșița',
  Targoviste: 'Târgoviște',
};

/**
 * Every name the app knows how to spell, keyed by its folded form: the city
 * spellings above, plus every locality in the gazetteer (which is already
 * written locally) and every country.
 */
const SPELLING_BY_KEY = new Map<string, string>();

for (const country of BALKAN_LOCATIONS) {
  SPELLING_BY_KEY.set(normalizePlaceName(country.name), country.name);
  for (const city of country.cities) {
    SPELLING_BY_KEY.set(normalizePlaceName(city.name), CITY_SPELLINGS[city.name] ?? city.name);
  }
}

for (const locality of BALKAN_LOCALITIES) {
  const key = normalizePlaceName(locality.name);
  // A gazetteer name never overwrites a city's — "Bar" the Montenegrin city
  // outranks any village of the same name.
  if (!SPELLING_BY_KEY.has(key)) SPELLING_BY_KEY.set(key, locality.name);
  for (const alias of locality.aliases ?? []) {
    const aliasKey = normalizePlaceName(alias);
    if (!SPELLING_BY_KEY.has(aliasKey)) SPELLING_BY_KEY.set(aliasKey, locality.name);
  }
}

/**
 * The local spelling of `name`, or `name` itself when the app holds no
 * spelling for it.
 *
 * Aliases resolve to the canonical name, so a listing filed under "Becici"
 * and one filed under "Bečići" are shown identically.
 */
export const canonicalPlaceName = (name?: string | null): string => {
  const trimmed = name?.trim();
  if (!trimmed) return '';
  return SPELLING_BY_KEY.get(normalizePlaceName(trimmed)) ?? trimmed;
};

/** True when both strings name the same place, whatever the spelling. */
export const isSamePlace = (a?: string | null, b?: string | null): boolean => {
  const left = normalizePlaceName(a ?? '');
  const right = normalizePlaceName(b ?? '');
  return left.length > 0 && left === right;
};

export interface PlaceLabel {
  /** The specific name — the bold first line of a suggestion. */
  primary: string;
  /** Context: ancestors, ending with the country. May be empty. */
  secondary: string;
  /** `primary`, then `secondary` — one line, what goes in the search box. */
  full: string;
}

/**
 * Administrative wrappers that repeat the name they contain. Nominatim
 * returns "Bashkia Himarë" as the municipality of "Himarë" and "Opština
 * Budva" as the municipality of "Budva"; both are noise in a label.
 */
const ADMIN_PREFIXES =
  /^(?:bashkia|komuna|opstina|opština|община|obshtina|grad|gradska\s+opcina|gradska\s+općina|municipality\s+of|municipiul|orașul|orasul|comuna|județul|judetul|okrug|kanton|canton|district\s+of|regional\s+unit\s+of|municipal\s+unit\s+of|dimos|δήμος|periferiaki|нас\.?\s*място)\s+/i;

const ADMIN_SUFFIXES =
  /\s+(?:county|district|region|municipality|prefecture|regional\s+unit|okrug|oblast|obshtina|општина|opstina|qarku|rrethi|kanton|canton|province|voivodeship)$/i;

/**
 * Clean one address component into what it should read as, and the key it
 * should be de-duplicated by.
 *
 * The two differ on purpose. A prefix like "Bashkia" or "Opština" is pure
 * administrative dressing and never belongs on screen, so it is dropped from
 * both. A suffix like "County" is real context worth reading — Google shows
 * "Vlorë County, Albania" — but it must not stop the component from being
 * recognised as a repeat of the "Vlorë" already on the line, so it survives
 * in the display and is dropped from the key.
 */
const cleanComponent = (part: string): { display: string; key: string } => {
  const withoutPrefix = part.replace(ADMIN_PREFIXES, '').trim();
  const core = withoutPrefix.replace(ADMIN_SUFFIXES, '').trim();
  const suffix = withoutPrefix.slice(core.length);
  const canonicalCore = canonicalPlaceName(core);

  return {
    display: canonicalCore ? `${canonicalCore}${suffix}` : withoutPrefix,
    key: normalizePlaceName(canonicalCore || withoutPrefix),
  };
};

/** True for a component that is a postcode, a plus code, or a bare number. */
const isCodeLike = (part: string): boolean =>
  /^[\d\s-]+$/.test(part) || /^[A-Z0-9]{4}\+[A-Z0-9]{2,}$/i.test(part);

/**
 * Turn raw address components into a Google-shaped label.
 *
 * `parts` runs most-specific first — the way both Nominatim's `display_name`
 * and the app's own `{ name, city, country }` triples are ordered.
 */
export const formatPlaceLabel = (
  parts: (string | null | undefined)[],
  { maxContext = 2 }: { maxContext?: number } = {}
): PlaceLabel => {
  const cleaned: string[] = [];
  const seen = new Set<string>();

  for (const raw of parts) {
    const trimmed = raw?.trim();
    if (!trimmed || isCodeLike(trimmed)) continue;

    // Drop a component that repeats one already kept, whatever its spelling
    // or administrative dressing: "Himarë, Bashkia Himarë, Vlorë County"
    // is one place named three times, and reads as "Himarë, Vlorë County".
    const { display, key } = cleanComponent(trimmed);
    if (!display || !key || seen.has(key)) continue;

    seen.add(key);
    cleaned.push(display);
  }

  if (cleaned.length === 0) return { primary: '', secondary: '', full: '' };

  const [primary, ...rest] = cleaned;
  // The country is the last component and always earns its place; the levels
  // between it and the name are trimmed to the two most specific.
  const country = rest.length > 1 ? rest[rest.length - 1] : undefined;
  const middle = country ? rest.slice(0, -1) : rest;
  const context = [...middle.slice(0, maxContext), ...(country ? [country] : [])];

  const secondary = context.join(', ');
  return { primary, secondary, full: [primary, secondary].filter(Boolean).join(', ') };
};

/** Label for a place the app holds structurally: a locality, city, country. */
export const formatPlace = (place: {
  name?: string | null;
  city?: string | null;
  country?: string | null;
}): PlaceLabel => formatPlaceLabel([place.name, place.city, place.country]);

/** Label for a listing: its address, then the city and country it sits in. */
export const formatPropertyPlace = (property: {
  address?: string | null;
  city?: string | null;
  country?: string | null;
}): PlaceLabel => formatPlaceLabel([property.address, property.city, property.country]);

/** A city, written for display: `"Bečići, Montenegro"`. */
export const formatCityPlace = (city?: string | null, country?: string | null): PlaceLabel =>
  formatPlaceLabel([city, country]);

/**
 * Label for a geocoder result.
 *
 * The structured `address` object is preferred when the geocoder returns one,
 * because it names each level and the noisy ones can be left out by name
 * rather than guessed at by position. Without it, `display_name` is split on
 * commas and cleaned the same way.
 */
export const formatGeocodedPlace = (result: {
  display_name?: string;
  name?: string;
  address?: {
    road?: string;
    street?: string;
    suburb?: string;
    neighbourhood?: string;
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    county?: string;
    state?: string;
    country?: string;
    postcode?: string;
  } | null;
}): PlaceLabel => {
  const address = result.address;

  if (address) {
    const settlement = address.city || address.town || address.village || address.municipality;
    const specific =
      result.name ||
      address.road ||
      address.street ||
      address.neighbourhood ||
      address.suburb ||
      settlement;

    return formatPlaceLabel([
      specific,
      address.suburb,
      settlement,
      address.county || address.state,
      address.country,
    ]);
  }

  const components = (result.display_name ?? result.name ?? '').split(',');
  return formatPlaceLabel(components);
};

/**
 * The string to put in the search box when a suggestion is picked.
 *
 * Deliberately short — the name and one level of context. A search box
 * holding "Bečići, Budva" reads as a place; one holding "Bečići, Budva,
 * Coastal Montenegro, 85315, Montenegro" reads as a bug, and the extra
 * levels only make the text match noisier.
 */
export const placeSearchValue = (label: PlaceLabel): string => {
  const firstContext = label.secondary.split(',')[0]?.trim();
  return [label.primary, firstContext].filter(Boolean).join(', ');
};
