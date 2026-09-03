/**
 * Validation Utilities Tests
 * Tests for input validation functions
 */

import { describe, it, expect } from 'vitest';
import {
  validateEmail,
  validatePhone,
  validatePassword,
  validateUrl,
  validateCoordinates,
  validatePrice,
  validateTextLength,
  validatePropertyTitle,
  validatePropertyDescription,
  validateName,
  sanitizeText,
  validateSearchQuery,
  validateArea,
  validateYearBuilt,
  validateRoomCount,
  validateCityShowcase,
} from '../shared/utils/validation';

describe('validateEmail', () => {
  it('should reject empty/null email', () => {
    expect(validateEmail('')).toEqual({ isValid: false, error: 'Email is required' });
    expect(validateEmail(null as unknown as string)).toEqual({ isValid: false, error: 'Email is required' });
  });

  it('should accept valid emails', () => {
    expect(validateEmail('test@example.com')).toEqual({ isValid: true });
    expect(validateEmail('user.name@domain.co.uk')).toEqual({ isValid: true });
    expect(validateEmail('user+tag@example.com')).toEqual({ isValid: true });
  });

  it('should reject invalid emails', () => {
    expect(validateEmail('invalid')).toEqual({ isValid: false, error: 'Invalid email format' });
    expect(validateEmail('invalid@')).toEqual({ isValid: false, error: 'Invalid email format' });
    expect(validateEmail('@domain.com')).toEqual({ isValid: false, error: 'Invalid email format' });
  });

  it('should reject too long emails', () => {
    const longEmail = 'a'.repeat(250) + '@test.com';
    expect(validateEmail(longEmail).isValid).toBe(false);
  });
});

describe('validatePhone', () => {
  it('should reject empty phone', () => {
    expect(validatePhone('')).toEqual({ isValid: false, error: 'Phone number is required' });
  });

  it('should accept valid phone formats', () => {
    expect(validatePhone('+1234567890')).toEqual({ isValid: true });
    expect(validatePhone('123-456-7890')).toEqual({ isValid: true });
    expect(validatePhone('(123) 456-7890')).toEqual({ isValid: true });
    expect(validatePhone('+381 64 123 4567')).toEqual({ isValid: true });
  });

  it('should reject invalid phones', () => {
    expect(validatePhone('123')).toEqual({ isValid: false, error: 'Invalid phone number format' });
    expect(validatePhone('abc')).toEqual({ isValid: false, error: 'Invalid phone number format' });
  });
});

describe('validatePassword', () => {
  it('should reject empty password', () => {
    expect(validatePassword('')).toEqual({ isValid: false, error: 'Password is required' });
  });

  it('should reject short passwords', () => {
    expect(validatePassword('short')).toEqual({ isValid: false, error: 'Password must be at least 8 characters' });
  });

  it('should accept valid passwords', () => {
    expect(validatePassword('Password1')).toEqual({ isValid: true });
    expect(validatePassword('MySecure123')).toEqual({ isValid: true });
  });

  it('should enforce uppercase requirement', () => {
    expect(validatePassword('password1')).toEqual({ isValid: false, error: 'Password must contain an uppercase letter' });
  });

  it('should enforce lowercase requirement', () => {
    expect(validatePassword('PASSWORD1')).toEqual({ isValid: false, error: 'Password must contain a lowercase letter' });
  });

  it('should enforce number requirement', () => {
    expect(validatePassword('Password')).toEqual({ isValid: false, error: 'Password must contain a number' });
  });

  it('should allow custom requirements', () => {
    const result = validatePassword('simplepass', { requireUppercase: false, requireNumber: false });
    expect(result).toEqual({ isValid: true });
  });
});

describe('validateUrl', () => {
  it('should reject empty URL', () => {
    expect(validateUrl('')).toEqual({ isValid: false, error: 'URL is required' });
  });

  it('should accept valid URLs', () => {
    expect(validateUrl('https://example.com')).toEqual({ isValid: true });
    expect(validateUrl('http://example.com/path')).toEqual({ isValid: true });
    expect(validateUrl('https://sub.domain.com:8080/path?query=1')).toEqual({ isValid: true });
  });

  it('should reject invalid URLs', () => {
    expect(validateUrl('not a url')).toEqual({ isValid: false, error: 'Invalid URL format' });
    expect(validateUrl('ftp://files.com')).toEqual({ isValid: false, error: 'URL must use http or https protocol' });
  });

  it('should allow custom protocols', () => {
    expect(validateUrl('ftp://files.com', ['ftp', 'sftp'])).toEqual({ isValid: true });
  });
});

describe('validateCoordinates', () => {
  it('should accept valid coordinates', () => {
    expect(validateCoordinates(44.8176, 20.4633)).toEqual({ isValid: true });
    expect(validateCoordinates(-33.8688, 151.2093)).toEqual({ isValid: true });
    expect(validateCoordinates(0, 0)).toEqual({ isValid: true });
  });

  it('should reject invalid latitude', () => {
    expect(validateCoordinates(91, 20)).toEqual({ isValid: false, error: 'Latitude must be between -90 and 90' });
    expect(validateCoordinates(-91, 20)).toEqual({ isValid: false, error: 'Latitude must be between -90 and 90' });
  });

  it('should reject invalid longitude', () => {
    expect(validateCoordinates(44, 181)).toEqual({ isValid: false, error: 'Longitude must be between -180 and 180' });
    expect(validateCoordinates(44, -181)).toEqual({ isValid: false, error: 'Longitude must be between -180 and 180' });
  });

  it('should reject NaN values', () => {
    expect(validateCoordinates(NaN, 20)).toEqual({ isValid: false, error: 'Invalid coordinates' });
  });
});

describe('validatePrice', () => {
  it('should accept valid prices', () => {
    expect(validatePrice(100000)).toEqual({ isValid: true });
    expect(validatePrice('50000')).toEqual({ isValid: true });
  });

  it('should reject zero by default', () => {
    expect(validatePrice(0)).toEqual({ isValid: false, error: 'Price cannot be zero' });
  });

  it('should allow zero when specified', () => {
    expect(validatePrice(0, { allowZero: true })).toEqual({ isValid: true });
  });

  it('should enforce min/max', () => {
    expect(validatePrice(50, { min: 100 })).toEqual({ isValid: false, error: 'Price must be at least 100' });
    expect(validatePrice(1000000001)).toEqual({ isValid: false, error: 'Price cannot exceed 1,000,000,000' });
  });
});

describe('validateTextLength', () => {
  it('should accept text within limits', () => {
    expect(validateTextLength('Hello', { minLength: 1, maxLength: 100 })).toEqual({ isValid: true });
  });

  it('should reject text below minLength', () => {
    expect(validateTextLength('Hi', { minLength: 5, fieldName: 'Title' })).toEqual({
      isValid: false,
      error: 'Title must be at least 5 characters'
    });
  });

  it('should reject text above maxLength', () => {
    expect(validateTextLength('a'.repeat(101), { maxLength: 100, fieldName: 'Comment' })).toEqual({
      isValid: false,
      error: 'Comment cannot exceed 100 characters'
    });
  });
});

describe('validatePropertyTitle', () => {
  it('should accept valid titles', () => {
    expect(validatePropertyTitle('Beautiful Villa in Mostar')).toEqual({ isValid: true });
  });

  it('should reject too short titles', () => {
    expect(validatePropertyTitle('Hi')).toEqual({
      isValid: false,
      error: 'Property title must be at least 5 characters'
    });
  });
});

describe('validatePropertyDescription', () => {
  it('should accept valid descriptions', () => {
    const description = 'This is a beautiful property with amazing views. ' +
                        'It has all modern amenities.';
    expect(validatePropertyDescription(description)).toEqual({ isValid: true });
  });

  it('should reject too short descriptions', () => {
    expect(validatePropertyDescription('Short desc')).toEqual({
      isValid: false,
      error: 'Description must be at least 20 characters'
    });
  });
});

describe('validateName', () => {
  it('should accept valid names', () => {
    expect(validateName('John')).toEqual({ isValid: true });
    expect(validateName('Mary-Jane')).toEqual({ isValid: true });
    expect(validateName("O'Connor")).toEqual({ isValid: true });
  });

  it('should reject too short names', () => {
    expect(validateName('J')).toEqual({ isValid: false, error: 'Name must be at least 2 characters' });
  });

  it('should reject names with invalid characters', () => {
    expect(validateName('John123')).toEqual({ isValid: false, error: 'Name contains invalid characters' });
    expect(validateName('John@Doe')).toEqual({ isValid: false, error: 'Name contains invalid characters' });
  });
});

describe('sanitizeText', () => {
  it('should remove angle brackets', () => {
    expect(sanitizeText('<script>alert(1)</script>')).toBe('scriptalert(1)/script');
  });

  it('should remove javascript: protocol', () => {
    expect(sanitizeText('javascript:alert(1)')).toBe('alert(1)');
  });

  it('should remove event handlers', () => {
    expect(sanitizeText('onerror=alert(1)')).toBe('alert(1)');
  });

  it('should trim whitespace', () => {
    expect(sanitizeText('  hello  ')).toBe('hello');
  });
});

describe('validateSearchQuery', () => {
  it('should sanitize and validate search queries', () => {
    const result = validateSearchQuery('Belgrade apartments');
    expect(result.isValid).toBe(true);
    expect(result.sanitized).toBe('Belgrade apartments');
  });

  it('should limit query length', () => {
    const longQuery = 'a'.repeat(300);
    const result = validateSearchQuery(longQuery);
    expect(result.sanitized.length).toBeLessThanOrEqual(200);
  });
});

describe('validateArea', () => {
  it('should accept valid areas', () => {
    expect(validateArea(100)).toEqual({ isValid: true });
    expect(validateArea('500')).toEqual({ isValid: true });
  });

  it('should reject zero or negative', () => {
    expect(validateArea(0)).toEqual({ isValid: false, error: 'Area must be greater than 0' });
    expect(validateArea(-50)).toEqual({ isValid: false, error: 'Area must be greater than 0' });
  });
});

describe('validateYearBuilt', () => {
  it('should accept valid years', () => {
    expect(validateYearBuilt(2020)).toEqual({ isValid: true });
    expect(validateYearBuilt('1990')).toEqual({ isValid: true });
  });

  it('should reject too old years', () => {
    expect(validateYearBuilt(1700)).toEqual({ isValid: false, error: 'Year built seems too old' });
  });

  it('should reject far future years', () => {
    expect(validateYearBuilt(2050)).toEqual({ isValid: false, error: 'Year built cannot be in the far future' });
  });
});

describe('validateRoomCount', () => {
  it('should accept valid counts', () => {
    expect(validateRoomCount(3)).toEqual({ isValid: true });
    expect(validateRoomCount('5')).toEqual({ isValid: true });
    expect(validateRoomCount(0)).toEqual({ isValid: true });
  });

  it('should reject negative counts', () => {
    expect(validateRoomCount(-1)).toEqual({ isValid: false, error: 'Count cannot be negative' });
  });

  it('should reject very high counts', () => {
    expect(validateRoomCount(150)).toEqual({ isValid: false, error: 'Count value seems too high' });
  });
});

describe('validateCityShowcase', () => {
  const panel = {
    city: 'Budva',
    country: 'Montenegro',
    searchQuery: 'Budva',
    imageUrl: 'https://res.cloudinary.com/demo/image/upload/v1/budva.jpg',
    displayOrder: 0,
  };

  it('accepts a complete panel', () => {
    expect(validateCityShowcase(panel)).toEqual({ isValid: true });
  });

  it('requires a photo — the gallery has no stand-in image', () => {
    expect(validateCityShowcase({ ...panel, imageUrl: '' })).toEqual({
      isValid: false,
      error: 'A photo is required',
    });
  });

  it('rejects a city another panel already holds', () => {
    const result = validateCityShowcase({
      ...panel,
      existingPanels: [{ _id: 'p1', city: 'Budva', country: 'Montenegro' }],
    });

    expect(result.isValid).toBe(false);
    expect(result.error).toMatch(/already in the gallery/i);
  });

  it('matches a duplicate through casing, padding and diacritics', () => {
    // "Vlorë" typed against a stored " vlore " is the same city, and a gallery
    // holding both would draw two panels for one place.
    expect(
      validateCityShowcase({
        ...panel,
        city: 'Vlorë',
        country: 'Albania',
        searchQuery: 'Vlore',
        existingPanels: [{ _id: 'p1', city: ' vlore ', country: 'ALBANIA' }],
      }).isValid,
    ).toBe(false);
  });

  it('does not fold two genuinely different names together', () => {
    // "Vlora" and "Vlore" are spellings this codebase treats as distinct
    // elsewhere; guessing they are the same would silently block a real city.
    expect(
      validateCityShowcase({
        ...panel,
        city: 'Vlora',
        country: 'Albania',
        searchQuery: 'Vlora',
        existingPanels: [{ _id: 'p1', city: 'Vlore', country: 'Albania' }],
      }),
    ).toEqual({ isValid: true });
  });

  it('lets a panel keep its own city when it is edited', () => {
    expect(
      validateCityShowcase({
        ...panel,
        panelId: 'p1',
        existingPanels: [{ _id: 'p1', city: 'Budva', country: 'Montenegro' }],
      }),
    ).toEqual({ isValid: true });
  });

  it('treats the same city in another country as a different place', () => {
    expect(
      validateCityShowcase({
        ...panel,
        existingPanels: [{ _id: 'p1', city: 'Budva', country: 'Croatia' }],
      }),
    ).toEqual({ isValid: true });
  });

  it('skips the uniqueness rule when the caller has no list to check against', () => {
    expect(validateCityShowcase({ ...panel, existingPanels: [] })).toEqual({ isValid: true });
  });
});
