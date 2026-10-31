/**
 * Feature matching over the whole listing.
 *
 * The search list leaves out a listing's description, special features and
 * materials to stay light, so the browser cannot tell whether a listing has
 * "floor heating" or a "panoramic view" when the seller wrote it there rather
 * than ticking a box. This builds the database query that reads all of it.
 *
 * A feature is a set of alternatives — the same thing in English and in the
 * languages the listings are written in — and a listing matches when any
 * alternative appears in any of its text fields. Every requested feature must
 * match. Accents are folded both ways, so "dysheme" finds "dyshemë".
 */

/** Text fields a feature may be written in, tags first. */
const TAG_FIELDS = ['amenities', 'specialFeatures', 'materials'] as const;
const PROSE_FIELDS = ['title', 'description'] as const;

export const FEATURE_FLAGS = [
  'hasBalcony', 'hasGarden', 'hasElevator', 'hasSecurity',
  'hasAirConditioning', 'hasPool', 'petsAllowed',
] as const;
export type FeatureFlag = (typeof FEATURE_FLAGS)[number];

/**
 * How each yes/no feature is written in listing text, in the site's languages
 * (en, sq, sr/hr/bs/me, mk, bg, el, ro). Stems, so inflected forms match;
 * none is a piece of a common unrelated word ("roje" is in "projekt").
 */
export const FLAG_TERMS: Record<FeatureFlag, readonly string[]> = {
  hasBalcony: ['balcon', 'balkon', 'ballkon', 'terrace', 'terasa', 'tarrac', 'балкон', 'тераса', 'μπαλκον', 'βεραντα'],
  hasGarden: ['garden', 'yard', 'kopsht', 'oborr', 'bašt', 'dvorišt', 'градина', 'двор', 'κηπο', 'gradin'],
  hasElevator: ['elevator', 'lift', 'ashensor', 'ashensori', 'liftom', 'лифт', 'асансьор', 'ασανσερ', 'ανελκυστηρ'],
  hasSecurity: ['security', 'guarded', 'sigurim', 'obezbeđ', 'čuvar', 'zaštitar', 'обезбедув', 'охрана', 'φυλαξη', 'ασφαλεια', 'securitate'],
  hasAirConditioning: ['air condition', 'air-condition', 'kondicioner', 'klima', 'клима', 'климатик', 'κλιματισ', 'aer condiționat'],
  hasPool: ['pool', 'pishin', 'bazen', 'базен', 'басейн', 'πισινα', 'piscin'],
  petsAllowed: ['pets allowed', 'pet friendly', 'pet-friendly', 'kafshë', 'kućni ljubim', 'миленици', 'домашни любими', 'κατοικιδι', 'animale de companie'],
};

const MIN_TERM = 3;
const MAX_TERM = 60;
const MAX_FEATURES = 12;
const MAX_ALTERNATIVES = 10;

/** Accent-insensitive character classes; anything else is matched literally. */
const FOLD: Record<string, string> = {
  a: 'aàáâãäåăą', c: 'cçčć', d: 'dđď', e: 'eèéêëěę', g: 'gğ', i: 'iìíîïı', l: 'lł',
  n: 'nñń', o: 'oòóôõöő', r: 'rř', s: 'sšșşś', t: 'tțţ', u: 'uùúûüű', y: 'yý', z: 'zžźż',
  α: 'αά', ε: 'εέ', η: 'ηή', ι: 'ιίϊΐ', ο: 'οό', υ: 'υύϋΰ', ω: 'ωώ',
};

const stripMarks = (s: string): string => s.normalize('NFD').replace(/[̀-ͯ]/g, '');
const escapeRegex = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** A regex source that finds `term` regardless of case, accents and spacing. */
export const foldedPattern = (term: string): string =>
  [...stripMarks(term.toLowerCase().trim())]
    .map((ch) => (/\s/.test(ch) ? '[\\s-]+' : FOLD[ch] ? `[${FOLD[ch]}]` : escapeRegex(ch)))
    .join('')
    .replace(/(\[\\s-\]\+)+/g, '[\\s-]+');

/** A feature's alternatives, cleaned: "floor heating|ngrohje në dysheme". */
export const parseFeature = (raw: unknown): string[] => {
  if (typeof raw !== 'string') return [];
  const seen = new Set<string>();
  for (const part of raw.split('|')) {
    const term = part.trim().toLowerCase().slice(0, MAX_TERM);
    if (term.length >= MIN_TERM) seen.add(term);
  }
  return [...seen].slice(0, MAX_ALTERNATIVES);
};

const anyFieldMatches = (fields: readonly string[], terms: readonly string[]) =>
  fields.flatMap((field) => terms.map((term) => ({ [field]: { $regex: foldedPattern(term), $options: 'i' } })));

export interface FeatureMatchRequest {
  features: string[][];
  flags: FeatureFlag[];
}

/** Reads `features` (repeated or single) and `flags` (comma list) off a query string. */
export const parseFeatureMatchRequest = (query: Record<string, unknown>): FeatureMatchRequest => {
  const rawFeatures = Array.isArray(query.features) ? query.features : query.features ? [query.features] : [];
  const features = rawFeatures.map(parseFeature).filter((alts) => alts.length > 0).slice(0, MAX_FEATURES);
  const rawFlags = typeof query.flags === 'string' ? query.flags.split(',') : [];
  const flags = [...new Set(rawFlags.map((f) => f.trim()))]
    .filter((f): f is FeatureFlag => (FEATURE_FLAGS as readonly string[]).includes(f));
  return { features, flags };
};

/**
 * The query clauses, one per requirement, all of which must hold.
 *
 * A yes/no feature holds when its box is ticked, when it is listed as a tag,
 * or when the title or description mentions it — the last only if the seller
 * did not answer "no", so "no elevator" in a listing that said no is not a hit.
 */
export const buildFeatureMatchClauses = ({ features, flags }: FeatureMatchRequest): Record<string, unknown>[] => [
  ...features.map((alternatives) => ({
    $or: anyFieldMatches([...TAG_FIELDS, ...PROSE_FIELDS], alternatives),
  })),
  ...flags.map((flag) => ({
    $or: [
      { [flag]: true },
      ...anyFieldMatches(TAG_FIELDS, FLAG_TERMS[flag]),
      { [flag]: { $ne: false }, $or: anyFieldMatches(PROSE_FIELDS, FLAG_TERMS[flag]) },
    ],
  })),
];
