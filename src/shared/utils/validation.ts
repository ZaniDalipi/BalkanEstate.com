/**
 * Input Validation Utilities
 * Provides validation functions for user inputs before API calls
 *
 * Features:
 * - Email validation
 * - Phone number validation
 * - Password strength validation
 * - URL validation
 * - Coordinate validation
 * - Price/number validation
 * - Text sanitization
 */

/**
 * Email validation result
 */
export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validate email address format
 */
export function validateEmail(email: string): ValidationResult {
  if (!email || typeof email !== 'string') {
    return { isValid: false, error: 'Email is required' };
  }

  const trimmed = email.trim().toLowerCase();

  if (trimmed.length === 0) {
    return { isValid: false, error: 'Email is required' };
  }

  if (trimmed.length > 254) {
    return { isValid: false, error: 'Email is too long' };
  }

  // RFC 5322 compliant email regex
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

  if (!emailRegex.test(trimmed)) {
    return { isValid: false, error: 'Invalid email format' };
  }

  return { isValid: true };
}

/**
 * Validate phone number
 * Supports international formats
 */
export function validatePhone(phone: string): ValidationResult {
  if (!phone || typeof phone !== 'string') {
    return { isValid: false, error: 'Phone number is required' };
  }

  // Remove spaces, dashes, and parentheses
  const cleaned = phone.replace(/[\s\-\(\)\.]/g, '');

  if (cleaned.length === 0) {
    return { isValid: false, error: 'Phone number is required' };
  }

  // Allow optional + prefix and 7-15 digits
  const phoneRegex = /^\+?[0-9]{7,15}$/;

  if (!phoneRegex.test(cleaned)) {
    return { isValid: false, error: 'Invalid phone number format' };
  }

  return { isValid: true };
}

/**
 * Password strength requirements
 */
export interface PasswordRequirements {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumber: boolean;
  requireSpecial: boolean;
}

const DEFAULT_PASSWORD_REQUIREMENTS: PasswordRequirements = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSpecial: false,
};

/**
 * Validate password strength
 */
export function validatePassword(
  password: string,
  requirements: Partial<PasswordRequirements> = {}
): ValidationResult {
  const reqs = { ...DEFAULT_PASSWORD_REQUIREMENTS, ...requirements };

  if (!password || typeof password !== 'string') {
    return { isValid: false, error: 'Password is required' };
  }

  if (password.length < reqs.minLength) {
    return { isValid: false, error: `Password must be at least ${reqs.minLength} characters` };
  }

  if (password.length > 128) {
    return { isValid: false, error: 'Password is too long' };
  }

  if (reqs.requireUppercase && !/[A-Z]/.test(password)) {
    return { isValid: false, error: 'Password must contain an uppercase letter' };
  }

  if (reqs.requireLowercase && !/[a-z]/.test(password)) {
    return { isValid: false, error: 'Password must contain a lowercase letter' };
  }

  if (reqs.requireNumber && !/[0-9]/.test(password)) {
    return { isValid: false, error: 'Password must contain a number' };
  }

  if (reqs.requireSpecial && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    return { isValid: false, error: 'Password must contain a special character' };
  }

  return { isValid: true };
}

/**
 * Validate URL format
 */
export function validateUrl(url: string, allowedProtocols: string[] = ['http', 'https']): ValidationResult {
  if (!url || typeof url !== 'string') {
    return { isValid: false, error: 'URL is required' };
  }

  const trimmed = url.trim();

  if (trimmed.length === 0) {
    return { isValid: false, error: 'URL is required' };
  }

  try {
    const parsed = new URL(trimmed);
    const protocol = parsed.protocol.replace(':', '');

    if (!allowedProtocols.includes(protocol)) {
      return { isValid: false, error: `URL must use ${allowedProtocols.join(' or ')} protocol` };
    }

    return { isValid: true };
  } catch {
    return { isValid: false, error: 'Invalid URL format' };
  }
}

/**
 * Validate geographic coordinates
 */
export function validateCoordinates(lat: number, lng: number): ValidationResult {
  if (typeof lat !== 'number' || typeof lng !== 'number') {
    return { isValid: false, error: 'Coordinates must be numbers' };
  }

  if (isNaN(lat) || isNaN(lng)) {
    return { isValid: false, error: 'Invalid coordinates' };
  }

  if (lat < -90 || lat > 90) {
    return { isValid: false, error: 'Latitude must be between -90 and 90' };
  }

  if (lng < -180 || lng > 180) {
    return { isValid: false, error: 'Longitude must be between -180 and 180' };
  }

  return { isValid: true };
}

/**
 * Validate price/currency value
 */
export function validatePrice(
  price: number | string,
  options: { min?: number; max?: number; allowZero?: boolean } = {}
): ValidationResult {
  const { min = 0, max = 1000000000, allowZero = false } = options;

  const numPrice = typeof price === 'string' ? parseFloat(price) : price;

  if (isNaN(numPrice)) {
    return { isValid: false, error: 'Price must be a valid number' };
  }

  if (!allowZero && numPrice === 0) {
    return { isValid: false, error: 'Price cannot be zero' };
  }

  if (numPrice < min) {
    return { isValid: false, error: `Price must be at least ${min}` };
  }

  if (numPrice > max) {
    return { isValid: false, error: `Price cannot exceed ${max.toLocaleString()}` };
  }

  return { isValid: true };
}

/**
 * Validate text length
 */
export function validateTextLength(
  text: string,
  options: { minLength?: number; maxLength?: number; fieldName?: string } = {}
): ValidationResult {
  const { minLength = 0, maxLength = 10000, fieldName = 'Text' } = options;

  if (!text || typeof text !== 'string') {
    if (minLength > 0) {
      return { isValid: false, error: `${fieldName} is required` };
    }
    return { isValid: true };
  }

  const trimmed = text.trim();

  if (trimmed.length < minLength) {
    return { isValid: false, error: `${fieldName} must be at least ${minLength} characters` };
  }

  if (trimmed.length > maxLength) {
    return { isValid: false, error: `${fieldName} cannot exceed ${maxLength} characters` };
  }

  return { isValid: true };
}

/**
 * Validate property title
 */
export function validatePropertyTitle(title: string): ValidationResult {
  return validateTextLength(title, {
    minLength: 5,
    maxLength: 200,
    fieldName: 'Property title',
  });
}

/**
 * Validate property description
 */
export function validatePropertyDescription(description: string): ValidationResult {
  return validateTextLength(description, {
    minLength: 20,
    maxLength: 5000,
    fieldName: 'Description',
  });
}

/**
 * Validate name (first name, last name, etc.)
 */
export function validateName(name: string, fieldName = 'Name'): ValidationResult {
  if (!name || typeof name !== 'string') {
    return { isValid: false, error: `${fieldName} is required` };
  }

  const trimmed = name.trim();

  if (trimmed.length < 2) {
    return { isValid: false, error: `${fieldName} must be at least 2 characters` };
  }

  if (trimmed.length > 100) {
    return { isValid: false, error: `${fieldName} is too long` };
  }

  // Allow letters, spaces, hyphens, apostrophes
  const nameRegex = /^[a-zA-ZÀ-ÿ\s\-']+$/;

  if (!nameRegex.test(trimmed)) {
    return { isValid: false, error: `${fieldName} contains invalid characters` };
  }

  return { isValid: true };
}

/**
 * Sanitize text input (remove potential XSS)
 */
export function sanitizeText(text: string): string {
  if (!text || typeof text !== 'string') {
    return '';
  }

  return text
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim();
}

/**
 * Validate and sanitize search query
 */
export function validateSearchQuery(query: string): { isValid: boolean; sanitized: string; error?: string } {
  if (!query || typeof query !== 'string') {
    return { isValid: true, sanitized: '' };
  }

  const sanitized = sanitizeText(query).substring(0, 200);

  return { isValid: true, sanitized };
}

/**
 * Validate property area (square meters)
 */
export function validateArea(area: number | string): ValidationResult {
  const numArea = typeof area === 'string' ? parseFloat(area) : area;

  if (isNaN(numArea)) {
    return { isValid: false, error: 'Area must be a valid number' };
  }

  if (numArea <= 0) {
    return { isValid: false, error: 'Area must be greater than 0' };
  }

  if (numArea > 1000000) {
    return { isValid: false, error: 'Area value is too large' };
  }

  return { isValid: true };
}

/**
 * Validate year built
 */
export function validateYearBuilt(year: number | string): ValidationResult {
  const numYear = typeof year === 'string' ? parseInt(year, 10) : year;
  const currentYear = new Date().getFullYear();

  if (isNaN(numYear)) {
    return { isValid: false, error: 'Year must be a valid number' };
  }

  if (numYear < 1800) {
    return { isValid: false, error: 'Year built seems too old' };
  }

  if (numYear > currentYear + 5) {
    return { isValid: false, error: 'Year built cannot be in the far future' };
  }

  return { isValid: true };
}

/**
 * Validate number of rooms/bedrooms/bathrooms
 */
export function validateRoomCount(count: number | string, fieldName = 'Count'): ValidationResult {
  const numCount = typeof count === 'string' ? parseInt(count, 10) : count;

  if (isNaN(numCount)) {
    return { isValid: false, error: `${fieldName} must be a valid number` };
  }

  if (numCount < 0) {
    return { isValid: false, error: `${fieldName} cannot be negative` };
  }

  if (numCount > 100) {
    return { isValid: false, error: `${fieldName} value seems too high` };
  }

  return { isValid: true };
}

/**
 * Validate a hotel/accommodation listing name.
 */
export function validateHotelName(name: string): ValidationResult {
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return { isValid: false, error: 'Property name is required' };
  }
  const trimmed = name.trim();
  if (trimmed.length < 2) {
    return { isValid: false, error: 'Property name is too short' };
  }
  if (trimmed.length > 120) {
    return { isValid: false, error: 'Property name cannot exceed 120 characters' };
  }
  return { isValid: true };
}

/**
 * Validate a star rating (1-5, optional — pass undefined to skip).
 */
export function validateStarRating(rating?: number | null): ValidationResult {
  if (rating == null) return { isValid: true };
  const num = Number(rating);
  if (!Number.isFinite(num) || num < 1 || num > 5) {
    return { isValid: false, error: 'Star rating must be between 1 and 5' };
  }
  return { isValid: true };
}

/**
 * Validate a nightly price. Must be a positive, realistic number.
 */
export function validatePricePerNight(price: unknown): ValidationResult {
  const num = Number(price);
  if (price === '' || price == null || !Number.isFinite(num)) {
    return { isValid: false, error: 'Price per night is required' };
  }
  if (num < 1) {
    return { isValid: false, error: 'Price per night must be at least 1' };
  }
  if (num > 1000000) {
    return { isValid: false, error: 'Price per night seems unrealistically high' };
  }
  return { isValid: true };
}

/**
 * Validate a guest count for a room (1-30).
 */
export function validateGuestCount(count: unknown): ValidationResult {
  const num = Number(count);
  if (count === '' || count == null || !Number.isFinite(num)) {
    return { isValid: false, error: 'Maximum guests is required' };
  }
  if (num < 1) {
    return { isValid: false, error: 'A room must sleep at least 1 guest' };
  }
  if (num > 30) {
    return { isValid: false, error: 'Maximum guests cannot exceed 30' };
  }
  return { isValid: true };
}

/**
 * Validate a single room definition. Returns the first failing field's error.
 */
export function validateRoom(room: {
  name?: string;
  pricePerNight?: unknown;
  maxGuests?: unknown;
  beds?: unknown;
}): ValidationResult {
  if (!room.name || room.name.trim().length === 0) {
    return { isValid: false, error: 'Each room needs a name' };
  }
  const price = validatePricePerNight(room.pricePerNight);
  if (!price.isValid) return price;
  const guests = validateGuestCount(room.maxGuests);
  if (!guests.isValid) return guests;
  const bedsNum = Number(room.beds);
  if (!Number.isFinite(bedsNum) || bedsNum < 1) {
    return { isValid: false, error: 'A room must have at least 1 bed' };
  }
  if (bedsNum > 20) {
    return { isValid: false, error: 'Number of beds cannot exceed 20' };
  }
  return { isValid: true };
}

export default {
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
  validateHotelName,
  validateStarRating,
  validatePricePerNight,
  validateGuestCount,
  validateRoom,
};
