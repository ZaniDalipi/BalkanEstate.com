/**
 * Owner-named categories ("Other" + their own words) become directory
 * choices: merged across spellings, counted, and filterable.
 */
process.env.SKIP_TEST_DB = 'true';

import {
  customCategoryFilter,
  groupCustomCategories,
  normalizeCustomCategory,
  summarizeCategoryRows,
} from '../services/businessCategories/businessCategories';

describe('groupCustomCategories', () => {
  it('merges spellings and shows the most used one, busiest first', () => {
    expect(groupCustomCategories([
      { name: '360 Virtual Tours', count: 2 },
      { name: '360 virtual  tours ', count: 1 },
      { name: 'Solar', count: 5 },
      { name: '   ', count: 9 },
    ])).toEqual([
      { name: 'Solar', count: 5 },
      { name: '360 Virtual Tours', count: 3 },
    ]);
  });

  it('keeps at most the given number of choices', () => {
    const rows = Array.from({ length: 5 }, (_, i) => ({ name: `c${i}`, count: i }));
    expect(groupCustomCategories(rows, 2).map((r) => r.name)).toEqual(['c4', 'c3']);
  });
});

describe('customCategoryFilter', () => {
  it('matches the name whatever its case and spacing, inside "other" only', () => {
    const f = customCategoryFilter('  360  virtual tours ') as { category: string; customCategory: { $regex: RegExp } };
    expect(f.category).toBe('other');
    expect(f.customCategory.$regex.test('360 Virtual Tours')).toBe(true);
    expect(f.customCategory.$regex.test(' 360   virtual tours')).toBe(true);
    expect(f.customCategory.$regex.test('360 virtual tours extra')).toBe(false);
  });

  it('treats the name as text, not a pattern', () => {
    const f = customCategoryFilter('a.b (c)') as { customCategory: { $regex: RegExp } };
    expect(f.customCategory.$regex.test('a.b (c)')).toBe(true);
    expect(f.customCategory.$regex.test('aXb (c)')).toBe(false);
  });

  it('refuses empty or over-long names', () => {
    expect(customCategoryFilter('   ')).toBeNull();
    expect(customCategoryFilter('x'.repeat(101))).toBeNull();
  });
});

describe('summarizeCategoryRows', () => {
  it('splits built-in counts from owner-named ones; unnamed "other" stays as other', () => {
    expect(summarizeCategoryRows([
      { _id: { category: 'cleaning', custom: null }, count: 3 },
      { _id: { category: 'other', custom: '360virtualtours' }, count: 1 },
      { _id: { category: 'other', custom: null }, count: 2 },
      { _id: { category: 'other', custom: '  ' }, count: 1 },
      { _id: { category: 'bogus', custom: null }, count: 7 },
    ])).toEqual({
      categories: [{ key: 'cleaning', count: 3 }, { key: 'other', count: 3 }],
      custom: [{ name: '360virtualtours', count: 1 }],
    });
  });
});

describe('normalizeCustomCategory', () => {
  it('trims and collapses spaces', () => {
    expect(normalizeCustomCategory('  Solar   Energy ')).toBe('Solar Energy');
  });
});
