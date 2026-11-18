import { describe, expect, it } from 'vitest';
import {
  parsePropertyTypes,
  readPropertyTypeSelection,
  singlePropertyType,
  togglePropertyType,
  toPropertyTypeSelection,
} from '@/shared/search/propertyTypeSelection';

describe('property type selection', () => {
  it('reads any, one type and several types', () => {
    expect(parsePropertyTypes('any')).toEqual([]);
    expect(parsePropertyTypes('villa')).toEqual(['villa']);
    expect(parsePropertyTypes('land,apartment')).toEqual(['apartment', 'land']);
  });

  it('drops unknown words from links and stored filters', () => {
    expect(readPropertyTypeSelection('castle,land, land')).toBe('land');
    expect(readPropertyTypeSelection('castle')).toBe('any');
    expect(readPropertyTypeSelection(undefined)).toBe('any');
  });

  it('writes the types in the app order, any when there are none', () => {
    expect(toPropertyTypeSelection([])).toBe('any');
    expect(toPropertyTypeSelection(['parking', 'house'])).toBe('house,parking');
  });

  it('toggles a type in and out', () => {
    const one = togglePropertyType('any', 'villa');
    expect(one).toBe('villa');
    const two = togglePropertyType(one, 'apartment');
    expect(two).toBe('apartment,villa');
    expect(togglePropertyType(two, 'villa')).toBe('apartment');
    expect(togglePropertyType('apartment', 'apartment')).toBe('any');
  });

  it('names a single type only', () => {
    expect(singlePropertyType('villa')).toBe('villa');
    expect(singlePropertyType('villa,land')).toBeUndefined();
    expect(singlePropertyType('any')).toBeUndefined();
  });
});
