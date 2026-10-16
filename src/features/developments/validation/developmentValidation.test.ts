import { describe, it, expect } from 'vitest';
import {
  validateCreateDevelopment,
  validateDevelopmentName,
  validateCategory,
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
