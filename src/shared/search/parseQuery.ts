/**
 * Query understanding.
 *
 * A Google search box accepts a sentence, not a form. "3 bedroom villa in
 * Budva under 300k with a pool" is one thing to type and it narrows six
 * filters at once; the same intent through the filter panel is six taps and
 * a scroll. This module reads that sentence.
 *
 * It also honours the two operators people reach for without being told:
 * `"sea view"` for an exact phrase and `-land` to exclude.
 *
 * What it deliberately does not do is guess. Every recognised span is
 * removed from the query, and whatever is left over is handed back as
 * `text` — the place name, street or listing reference the user meant. A
 * sentence this parser understands nothing of comes back unchanged, so the
 * plain-text path is never made worse by a failed parse.
 */

import { foldText, tokenizeQuery } from './text';

export type ParsedListingType = 'sale' | 'rent';
export type ParsedPropertyType = 'house' | 'apartment' | 'villa' | 'luxury-villa' | 'land' | 'other';

export interface QueryIntent {
  listingType?: ParsedListingType;
  propertyType?: ParsedPropertyType;
  beds?: number;
  baths?: number;
  minPrice?: number;
  maxPrice?: number;
  minSqft?: number;
  maxSqft?: number;
  hasPool?: boolean;
  hasGarden?: boolean;
  hasParking?: boolean;
  hasBalcony?: boolean;
  furnished?: boolean;
  seaView?: boolean;
}

export interface ParsedQuery {
  /** The original string, untouched. */
  raw: string;
  /** What is left after the understood parts are lifted out — usually a place. */
  text: string;
  /** Folded tokens of `text`, ready for the engine. */
  terms: string[];
  /** `"quoted phrases"`, folded; every one of these must appear verbatim. */
  phrases: string[];
  /** `-excluded` words, folded; a document containing one is rejected. */
  exclusions: string[];
  /** Filters read out of the sentence. */
  intent: QueryIntent;
  /** True when anything at all was understood. */
  hasIntent: boolean;
}

const WORD_NUMBERS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8,
  studio: 0,
};

const PROPERTY_TYPE_WORDS: [RegExp, ParsedPropertyType][] = [
  [/\bluxury\s+villas?\b|\bluxe\s+villas?\b/gi, 'luxury-villa'],
  [/\bvillas?\b|\bvile\b|\bvila\b/gi, 'villa'],
  [/\bapartments?\b|\bapts?\b|\bflats?\b|\bstudios?\b|\bstan\b|\bbanesa\b/gi, 'apartment'],
  [/\bhouses?\b|\bhomes?\b|\bkuca\b|\bshtepi\b/gi, 'house'],
  [/\blands?\b|\bplots?\b|\bparcels?\b|\bterrain\b|\btoka\b|\bzemljiste\b/gi, 'land'],
];

const LISTING_TYPE_WORDS: [RegExp, ParsedListingType][] = [
  [/\bfor\s+rent\b|\bto\s+rent\b|\brentals?\b|\brenting\b|\bqira\b|\bnajam\b/gi, 'rent'],
  [/\bfor\s+sale\b|\bto\s+buy\b|\bbuying\b|\bshitje\b|\bprodaja\b/gi, 'sale'],
];

const FEATURE_WORDS: [RegExp, keyof QueryIntent][] = [
  [/\bpools?\b|\bswimming\s+pool\b|\bpiscina\b|\bbazen\b/gi, 'hasPool'],
  [/\bgardens?\b|\byards?\b|\bkopsht\b|\bdvorist\w*\b/gi, 'hasGarden'],
  [/\bparking\b|\bgarage\b|\bparkim\b/gi, 'hasParking'],
  [/\bbalcon(?:y|ies)\b|\bterrace\b|\bballkon\b/gi, 'hasBalcony'],
  [/\bfurnished\b|\bmobiluar\b|\bnamjesten\w*\b/gi, 'furnished'],
  [/\bsea\s*views?\b|\bseafront\b|\bbeachfront\b|\bpamje\s+nga\s+deti\b/gi, 'seaView'],
];

/**
 * Expand a shorthand amount: `200k` → 200000, `1.2m` → 1200000.
 * Bare numbers under 10000 written where a price is expected are read as
 * thousands, because "under 300" in a property search never means €300.
 */
const readAmount = (digits: string, suffix?: string): number => {
  const value = Number(digits.replace(/[\s.,](?=\d{3}\b)/g, '').replace(',', '.'));
  if (!Number.isFinite(value)) return NaN;

  const unit = suffix?.toLowerCase();
  if (unit === 'k') return Math.round(value * 1_000);
  if (unit === 'm') return Math.round(value * 1_000_000);
  return value < 10_000 ? Math.round(value * 1_000) : Math.round(value);
};

/** Everything the parser recognised, so it can be cut out of the free text. */
interface Consumed {
  start: number;
  end: number;
}

export const parseSearchQuery = (raw: string): ParsedQuery => {
  const intent: QueryIntent = {};
  const phrases: string[] = [];
  const exclusions: string[] = [];
  const consumed: Consumed[] = [];

  const take = (match: RegExpExecArray | RegExpMatchArray): void => {
    if (match.index === undefined) return;
    consumed.push({ start: match.index, end: match.index + match[0].length });
  };

  const scan = (pattern: RegExp, onMatch: (match: RegExpExecArray) => boolean): void => {
    const scoped = new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`);
    let match = scoped.exec(raw);
    while (match) {
      if (onMatch(match)) take(match);
      match = scoped.exec(raw);
    }
  };

  // ── Operators ───────────────────────────────────────────────────────────
  scan(/"([^"]+)"|'([^']{3,})'/g, (match) => {
    const phrase = foldText(match[1] ?? match[2] ?? '');
    if (!phrase) return false;
    phrases.push(phrase);
    return true;
  });

  scan(/(?:^|\s)-([\p{L}\p{N}][\p{L}\p{N}-]*)/gu, (match) => {
    const excluded = foldText(match[1]);
    if (!excluded) return false;
    exclusions.push(excluded);
    return true;
  });

  // ── Prices ──────────────────────────────────────────────────────────────
  // A range first: "100k-200k", "between 100k and 200k".
  scan(
    /(?:between\s+)?[€$]?\s*(\d[\d\s.,]*)\s*([km])?\s*(?:-|–|to|and)\s*[€$]?\s*(\d[\d\s.,]*)\s*([km])?(?:\s*(?:eur|euros?|€))?/gi,
    (match) => {
      const min = readAmount(match[1], match[2]);
      const max = readAmount(match[3], match[4]);
      // Two plain small numbers are far more likely "3 2" than a price band.
      if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) return false;
      if (!match[2] && !match[4] && Number(match[1]) < 1000 && Number(match[3]) < 1000) return false;
      intent.minPrice = min;
      intent.maxPrice = max;
      return true;
    }
  );

  if (intent.maxPrice === undefined) {
    scan(
      /(?:under|below|less\s+than|up\s+to|max(?:imum)?|cheaper\s+than|deri)\s*[€$]?\s*(\d[\d\s.,]*)\s*([km])?(?:\s*(?:eur|euros?|€))?/gi,
      (match) => {
        const value = readAmount(match[1], match[2]);
        if (!Number.isFinite(value)) return false;
        intent.maxPrice = value;
        return true;
      }
    );
  }

  if (intent.minPrice === undefined) {
    scan(
      /(?:over|above|more\s+than|from|at\s+least|min(?:imum)?|starting\s+at)\s*[€$]?\s*(\d[\d\s.,]*)\s*([km])?(?:\s*(?:eur|euros?|€))?/gi,
      (match) => {
        const value = readAmount(match[1], match[2]);
        if (!Number.isFinite(value)) return false;
        intent.minPrice = value;
        return true;
      }
    );
  }

  // ── Size ────────────────────────────────────────────────────────────────
  scan(/(\d[\d\s.,]*)\s*(?:m2|m²|sqm|sq\.?\s?m|square\s+met(?:er|re)s?)\b/gi, (match) => {
    const value = Number(match[1].replace(/[\s.,]/g, ''));
    if (!Number.isFinite(value) || value <= 0) return false;
    // "over 100 m2" / "100 m2" both read as a floor: people search for at
    // least this much space far more often than at most.
    const preceding = raw.slice(Math.max(0, (match.index ?? 0) - 12), match.index ?? 0).toLowerCase();
    if (/(?:under|below|less\s+than|up\s+to|max)\s*$/.test(preceding)) intent.maxSqft = value;
    else intent.minSqft = value;
    return true;
  });

  // ── Rooms ───────────────────────────────────────────────────────────────
  scan(/(\d+|one|two|three|four|five|six|seven|eight)[\s-]*(?:bed(?:room)?s?|br|dhoma|sobe?)\b/gi, (match) => {
    const beds = WORD_NUMBERS[match[1].toLowerCase()] ?? Number(match[1]);
    if (!Number.isFinite(beds) || beds <= 0 || beds > 20) return false;
    intent.beds = beds;
    return true;
  });

  scan(/(\d+|one|two|three|four|five)[\s-]*(?:bath(?:room)?s?|ba|banjo)\b/gi, (match) => {
    const baths = WORD_NUMBERS[match[1].toLowerCase()] ?? Number(match[1]);
    if (!Number.isFinite(baths) || baths <= 0 || baths > 20) return false;
    intent.baths = baths;
    return true;
  });

  scan(/\bstudios?\b/gi, () => {
    intent.propertyType = 'apartment';
    intent.beds = 1;
    return true;
  });

  // ── Categories ──────────────────────────────────────────────────────────
  for (const [pattern, listingType] of LISTING_TYPE_WORDS) {
    if (intent.listingType) break;
    scan(pattern, () => {
      intent.listingType = listingType;
      return true;
    });
  }

  for (const [pattern, propertyType] of PROPERTY_TYPE_WORDS) {
    if (intent.propertyType && intent.propertyType !== 'apartment') break;
    scan(pattern, () => {
      // A more specific type already read from "luxury villa" wins over the
      // "villa" the same span also matches.
      if (intent.propertyType === 'luxury-villa') return false;
      intent.propertyType = propertyType;
      return true;
    });
  }

  for (const [pattern, feature] of FEATURE_WORDS) {
    scan(pattern, () => {
      (intent as Record<string, unknown>)[feature] = true;
      return true;
    });
  }

  // ── Leftover text ───────────────────────────────────────────────────────
  // Blank out every consumed span rather than deleting it, so the offsets of
  // the spans still to be removed stay valid.
  const kept = raw.split('');
  for (const span of consumed) {
    for (let i = span.start; i < span.end && i < kept.length; i += 1) kept[i] = ' ';
  }

  const text = kept.join('').replace(/\s+/g, ' ').trim();
  const hasIntent =
    Object.keys(intent).length > 0 || phrases.length > 0 || exclusions.length > 0;

  return {
    raw,
    text,
    terms: tokenizeQuery(text),
    phrases,
    exclusions,
    intent,
    hasIntent,
  };
};
