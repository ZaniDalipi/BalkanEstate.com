/**
 * Feature matching over the whole listing — the query that reads tags, title
 * and description, which the search list leaves out.
 *
 * Pure functions only — see `usesDatabase` in setup.ts.
 */

process.env.SKIP_TEST_DB = 'true';

import {
  buildFeatureMatchClauses,
  foldedPattern,
  parseFeature,
  parseFeatureMatchRequest,
} from '../services/featureMatch';

const finds = (term: string, text: string) => new RegExp(foldedPattern(term), 'i').test(text);

describe('foldedPattern', () => {
  it('ignores accents in either direction', () => {
    expect(finds('ngrohje ne dysheme', 'Ngrohje në dyshemë në çdo dhomë')).toBe(true);
    expect(finds('ngrohje në dysheme', 'ngrohje ne dysheme')).toBe(true);
    expect(finds('podno grijanje', 'Podno grijanje i klima')).toBe(true);
  });

  it('treats spaces and hyphens alike', () => {
    expect(finds('floor heating', 'Under-floor-heating throughout')).toBe(true);
  });

  it('matches Greek and Cyrillic', () => {
    expect(finds('πανοραμική θέα', 'Υπέροχη ΠΑΝΟΡΑΜΙΚΗ ΘΕΑ')).toBe(true);
    expect(finds('подно греење', 'Има подно греење')).toBe(true);
  });

  it('takes regex characters literally', () => {
    expect(finds('a+ (energy)', 'class a+ (energy)')).toBe(true);
    expect(finds('a+', 'aaa')).toBe(false);
  });

  it('does not match a different feature', () => {
    expect(finds('panoramic view', 'Sea view')).toBe(false);
  });
});

describe('parseFeature', () => {
  it('splits alternatives, trims, lower-cases and drops ones too short to mean anything', () => {
    expect(parseFeature(' Sauna | SAUNA |x| Finnish sauna ')).toEqual(['sauna', 'finnish sauna']);
  });

  it('refuses anything but a string', () => {
    expect(parseFeature({ $regex: '.*' })).toEqual([]);
  });
});

describe('parseFeatureMatchRequest', () => {
  it('reads repeated features and a comma list of known flags', () => {
    expect(parseFeatureMatchRequest({
      features: ['floor heating|ngrohje', 'fireplace'],
      flags: 'hasBalcony,hasPool,isAdmin,hasPool',
    })).toEqual({
      features: [['floor heating', 'ngrohje'], ['fireplace']],
      flags: ['hasBalcony', 'hasPool'],
    });
  });

  it('reads a single feature', () => {
    expect(parseFeatureMatchRequest({ features: 'sauna' }).features).toEqual([['sauna']]);
  });
});

describe('buildFeatureMatchClauses', () => {
  it('requires every feature, each found in any text field', () => {
    const [clause] = buildFeatureMatchClauses({ features: [['sauna']], flags: [] });
    const fields = (clause.$or as Record<string, unknown>[]).map((c) => Object.keys(c)[0]);
    expect(fields).toEqual(['amenities', 'specialFeatures', 'materials', 'title', 'description']);
  });

  it('accepts a ticked box or a tag for a yes/no feature, and prose only when the seller did not say no', () => {
    const [clause] = buildFeatureMatchClauses({ features: [], flags: ['hasElevator'] });
    const or = clause.$or as Record<string, unknown>[];
    expect(or[0]).toEqual({ hasElevator: true });
    const prose = or[or.length - 1];
    expect(prose.hasElevator).toEqual({ $ne: false });
    expect((prose.$or as Record<string, unknown>[]).every((c) => 'title' in c || 'description' in c)).toBe(true);
  });
});
