import { describe, it, expect } from 'vitest';
import { categoryChoices, categoryFilters, customChoiceValue } from './categoryChoices';

describe('categoryChoices', () => {
  it('lists used built-ins busiest first, then owner-named ones, and Other only for unnamed ones', () => {
    const choices = categoryChoices({
      categories: [{ key: 'cleaning', count: 1 }, { key: 'construction', count: 4 }, { key: 'other', count: 2 }],
      custom: [{ name: '360virtualtours', count: 1 }],
    });
    expect(choices.map((c) => c.value)).toEqual(['construction', 'cleaning', 'custom:360virtualtours', 'other']);
  });

  it('hides Other when every "other" listing has its own name', () => {
    const choices = categoryChoices({ categories: [{ key: 'cleaning', count: 1 }], custom: [{ name: 'Solar', count: 1 }] });
    expect(choices.map((c) => c.value)).toEqual(['cleaning', 'custom:Solar']);
  });

  it('falls back to the first ten built-ins before the counts arrive', () => {
    const choices = categoryChoices({ categories: [], custom: [] });
    expect(choices).toHaveLength(10);
    expect(choices.every((c) => c.kind === 'builtin' && c.value !== 'other')).toBe(true);
  });
});

describe('categoryFilters', () => {
  it('turns a chip value into listing filters', () => {
    expect(categoryFilters('')).toEqual({});
    expect(categoryFilters('cleaning')).toEqual({ category: 'cleaning' });
    expect(categoryFilters(customChoiceValue('360virtualtours'))).toEqual({ customCategory: '360virtualtours' });
    expect(categoryFilters('custom:  ')).toEqual({});
    expect(categoryFilters('bogus')).toEqual({});
  });
});
