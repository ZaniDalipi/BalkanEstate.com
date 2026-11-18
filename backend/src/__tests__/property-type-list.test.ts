import { parsePropertyTypeList } from '../config/propertyTypes';

describe('parsePropertyTypeList', () => {
  it('reads one type, as saved searches made before multi-select hold it', () => {
    expect(parsePropertyTypeList('villa')).toEqual(['villa']);
  });

  it('reads several types joined by commas', () => {
    expect(parsePropertyTypeList('villa,apartment')).toEqual(['villa', 'apartment']);
  });

  it('treats "any", empty and missing as every type', () => {
    expect(parsePropertyTypeList('any')).toEqual([]);
    expect(parsePropertyTypeList('')).toEqual([]);
    expect(parsePropertyTypeList(undefined)).toEqual([]);
  });

  it('drops unknown words, spaces and repeats', () => {
    expect(parsePropertyTypeList(' land , castle,land')).toEqual(['land']);
  });

  it('accepts a repeated query parameter, which Express gives as an array', () => {
    expect(parsePropertyTypeList(['house', 'parking'])).toEqual(['house', 'parking']);
  });
});
