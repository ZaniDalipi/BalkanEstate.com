import { describe, it, expect } from 'vitest';
import {
  validateCreateDevelopment,
  validateDevelopmentName,
  validateCategory,
  validateDevelopmentDetails,
} from './developmentValidation';

describe('development create validation', () => {
  it('accepts a complete, valid payload', () => {
    const errors = validateCreateDevelopment({
      name: 'Seaside Residences',
      country: 'Montenegro',
      city: 'Budva',
      category: 'apartment_building',
    });
    expect(errors).toEqual({});
  });

  it('flags every missing required field with a translation key', () => {
    const errors = validateCreateDevelopment({ name: '', country: '', city: '', category: '' as never });
    expect(errors.name).toBe('validation.nameRequired');
    expect(errors.country).toBe('validation.countryRequired');
    expect(errors.city).toBe('validation.cityRequired');
    expect(errors.category).toBe('validation.categoryRequired');
  });

  it('rejects an over-long name', () => {
    const result = validateDevelopmentName('x'.repeat(201));
    expect(result.isValid).toBe(false);
    expect(result.errorKey).toBe('validation.nameTooLong');
  });

  it('rejects an unknown category', () => {
    expect(validateCategory('spaceship').isValid).toBe(false);
    expect(validateCategory('villa_complex').isValid).toBe(true);
  });

  it('trims-whitespace-only values as empty', () => {
    const errors = validateCreateDevelopment({
      name: '   ',
      country: 'Serbia',
      city: 'Belgrade',
      category: 'mixed_use',
    });
    expect(errors.name).toBe('validation.nameRequired');
  });
});

describe('development details validation', () => {
  const ok = { name: 'Plaza', country: 'Albania', city: 'Tirana', category: 'apartment_building', website: '', contactEmail: '', lat: '', lng: '' };

  it('accepts empty optional fields', () => {
    expect(validateDevelopmentDetails(ok)).toEqual({});
  });

  it('flags a bad website, email and out-of-range coordinates', () => {
    expect(
      validateDevelopmentDetails({ ...ok, website: 'javascript:alert(1)', contactEmail: 'nope', lat: '91', lng: 'abc' })
    ).toEqual({
      website: 'validation.websiteInvalid',
      contactEmail: 'validation.emailInvalid',
      lat: 'validation.latInvalid',
      lng: 'validation.lngInvalid',
    });
    expect(validateDevelopmentDetails({ ...ok, website: 'https://plaza.al', lat: '-41.3', lng: '179.9' })).toEqual({});
  });
});
