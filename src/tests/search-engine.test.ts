import { describe, it, expect } from 'vitest';
import {
  boundedEditDistance,
  createSearchIndex,
  foldText,
  foldWithOffsets,
  isFuzzyMatch,
  matchTerm,
  parseSearchQuery,
  splitHighlights,
  tokenizeQuery,
  typoBudget,
} from '@/shared/search';

describe('foldText', () => {
  it('folds the diacritics Balkan names are written with', () => {
    expect(foldText('Vlorë')).toBe('vlore');
    expect(foldText('Bečići')).toBe('becici');
    expect(foldText('Đenovići')).toBe('denovici');
    expect(foldText('Şirok')).toBe('sirok');
  });

  it('folds Cyrillic and Greek onto their Latin spellings', () => {
    // The same city typed on three keyboards has to be one search key.
    expect(foldText('Београд')).toBe(foldText('Beograd'));
    expect(foldText('Скопје')).toBe(foldText('Skopje'));
    expect(foldText('Αθήνα')).toBe('athina');
  });

  it('collapses punctuation and keeps digits', () => {
    expect(foldText('  Fushë-Krujë ')).toBe('fushe kruje');
    expect(foldText('Rr. Ismail Qemali 12')).toBe('rr ismail qemali 12');
  });
});

describe('tokenizeQuery', () => {
  it('drops filler words that carry no signal', () => {
    expect(tokenizeQuery('houses for sale in Budva')).toEqual(['houses', 'budva']);
  });

  it('keeps a query that is nothing but filler, rather than emptying it', () => {
    expect(tokenizeQuery('for rent')).toEqual(['for', 'rent']);
  });
});

describe('typo tolerance', () => {
  it('forgives a transposition as a single edit', () => {
    expect(boundedEditDistance('sarnade', 'sarande', 1)).toBe(1);
  });

  it('gives short words no budget, so "bar" never matches "car"', () => {
    expect(typoBudget(3)).toBe(0);
    expect(isFuzzyMatch('bar', 'car')).toBe(false);
    expect(isFuzzyMatch('bar', 'bar')).toBe(true);
  });

  it('forgives one typo from four characters and two from eight', () => {
    expect(isFuzzyMatch('budvva', 'budva')).toBe(true);
    expect(isFuzzyMatch('dubrovnick', 'dubrovnik')).toBe(true);
  });

  it('reports over-budget distances as over budget rather than truncating', () => {
    expect(boundedEditDistance('zagreb', 'dubrovnik', 2)).toBeGreaterThan(2);
  });
});

describe('matchTerm tiers', () => {
  const scoreOf = (term: string, field: string) => matchTerm(term, field)?.score ?? 0;

  it('ranks an exact name over a prefix over a word inside the name', () => {
    expect(scoreOf('budva', 'budva')).toBeGreaterThan(scoreOf('budva', 'budva beach'));
    expect(scoreOf('budva', 'budva beach')).toBeGreaterThan(scoreOf('budva', 'beach budva'));
  });

  it('ranks any literal hit over a typo', () => {
    expect(scoreOf('budva', 'stari grad budva')).toBeGreaterThan(scoreOf('budvva', 'budva'));
  });

  it('returns nothing when the term is simply absent', () => {
    expect(matchTerm('zagreb', 'budva montenegro')).toBeNull();
  });
});

describe('createSearchIndex', () => {
  const docs = [
    { id: 'a', name: 'Budva Beach Apartment', city: 'Budva' },
    { id: 'b', name: 'Apartment in Zagreb', city: 'Zagreb' },
    { id: 'c', name: 'Seaside Villa', city: 'Budva' },
  ];

  const index = createSearchIndex(docs, {
    fields: [
      { key: 'name', value: (doc) => doc.name, weight: 3 },
      { key: 'city', value: (doc) => doc.city },
    ],
  });

  it('requires every word, so a second word narrows the search', () => {
    // The behaviour this engine exists to fix: the old matcher ORed its terms
    // and returned the Zagreb apartment for a Budva search.
    expect(index.search('budva apartment').map((result) => result.doc.id)).toEqual(['a']);
  });

  it('ranks the better field match first', () => {
    const ids = index.search('budva').map((result) => result.doc.id);
    expect(ids[0]).toBe('a');
    expect(ids).toContain('c');
  });

  it('can be asked for partial matches, scoring the incomplete ones down', () => {
    const results = index.search('budva apartment', { requireAllTerms: false });
    expect(results[0].doc.id).toBe('a');
    expect(results.length).toBeGreaterThan(1);
    expect(results[0].score).toBeGreaterThan(results[1].score);
  });

  it('finds a place typed with the wrong diacritics or none at all', () => {
    const places = createSearchIndex([{ name: 'Bečići' }], {
      fields: [{ key: 'name', value: (doc) => doc.name }],
    });
    expect(places.search('becici')).toHaveLength(1);
    expect(places.search('Bečići')).toHaveLength(1);
  });

  it('returns nothing for an empty query rather than everything', () => {
    expect(index.search('   ')).toEqual([]);
  });
});

describe('parseSearchQuery', () => {
  it('reads a whole sentence into filters and leaves the place behind', () => {
    const parsed = parseSearchQuery('3 bedroom villa in Budva under 300k with a pool');

    expect(parsed.intent).toMatchObject({
      beds: 3,
      propertyType: 'villa',
      maxPrice: 300_000,
      hasPool: true,
    });
    expect(parsed.terms).toEqual(['budva']);
  });

  it('reads price shorthand, ranges and bare thousands', () => {
    expect(parseSearchQuery('under 250k').intent.maxPrice).toBe(250_000);
    expect(parseSearchQuery('over 1.2m').intent.minPrice).toBe(1_200_000);
    expect(parseSearchQuery('under 300').intent.maxPrice).toBe(300_000);
    expect(parseSearchQuery('100k-200k').intent).toMatchObject({
      minPrice: 100_000,
      maxPrice: 200_000,
    });
  });

  it('reads size, and reads "under" in front of it as a ceiling', () => {
    expect(parseSearchQuery('apartment 120 m2').intent.minSqft).toBe(120);
    expect(parseSearchQuery('apartment under 80 sqm').intent.maxSqft).toBe(80);
  });

  it('reads rent and sale', () => {
    expect(parseSearchQuery('apartments for rent in Tirana').intent.listingType).toBe('rent');
    expect(parseSearchQuery('houses for sale in Split').intent.listingType).toBe('sale');
  });

  it('prefers the more specific property type', () => {
    expect(parseSearchQuery('luxury villa in Budva').intent.propertyType).toBe('luxury-villa');
  });

  it('honours quoted phrases and minus exclusions', () => {
    const parsed = parseSearchQuery('"sea view" Budva -land');
    expect(parsed.phrases).toEqual(['sea view']);
    expect(parsed.exclusions).toEqual(['land']);
    expect(parsed.terms).toEqual(['budva']);
  });

  it('leaves a sentence it understands nothing of exactly as typed', () => {
    const parsed = parseSearchQuery('Rruga Ismail Qemali');
    expect(parsed.hasIntent).toBe(false);
    expect(parsed.text).toBe('Rruga Ismail Qemali');
  });
});

describe('highlighting', () => {
  it('bolds the accented spelling of what was typed without accents', () => {
    expect(splitHighlights('Bečići, Budva', 'becici')).toEqual([
      { text: 'Bečići', match: true },
      { text: ', Budva', match: false },
    ]);
  });

  it('bolds the whole word a misspelling found', () => {
    expect(splitHighlights('Sarandë', 'sarnade')).toEqual([{ text: 'Sarandë', match: true }]);
  });

  it('leaves a label alone when nothing matched', () => {
    expect(splitHighlights('Budva', 'zagreb')).toEqual([{ text: 'Budva', match: false }]);
  });

  it('maps folded offsets back onto the original characters', () => {
    const { folded, offsets } = foldWithOffsets('Fushë-Krujë');
    expect(folded).toBe('fushe kruje');
    expect(offsets).toHaveLength(folded.length);
    expect('Fushë-Krujë'[offsets[0]]).toBe('F');
  });
});
