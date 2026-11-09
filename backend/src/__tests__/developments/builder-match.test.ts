process.env.SKIP_TEST_DB = 'true';

import { normalizeBuilderName, sameBuilderName } from '../../services/developments/builderMatch';

describe('sameBuilderName', () => {
  it('matches the same company however its name was typed', () => {
    expect(sameBuilderName('Balkan Build', '  balkan   BUILD ')).toBe(true);
    expect(sameBuilderName('Gradež Inženjering', 'GRADEŽ INŽENJERING')).toBe(true);
    // Composed and decomposed accents are the same letters.
    expect(sameBuilderName('Gradež', 'Gradež')).toBe(true);
  });

  it('never matches a different company, an empty name or a non-string', () => {
    expect(sameBuilderName('Balkan Build', 'Balkan Builders')).toBe(false);
    expect(sameBuilderName('', '')).toBe(false);
    expect(sameBuilderName('   ', '   ')).toBe(false);
    expect(sameBuilderName(undefined, undefined)).toBe(false);
    expect(sameBuilderName({ $ne: null }, { $ne: null })).toBe(false);
  });

  it('normalizes to a trimmed, single-spaced, lower-case name', () => {
    expect(normalizeBuilderName('  Aria\tHomes  ')).toBe('aria homes');
    expect(normalizeBuilderName(42)).toBe('');
  });
});
