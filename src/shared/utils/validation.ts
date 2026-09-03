// Imported from the leaf module rather than the geo barrel: this file is
// pulled into nearly every form, and the barrel would drag the whole
// country/city gazetteer along with it.
import { normalizePlaceName } from '@/shared/geo/normalize';

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
 * Validate one city panel of the home-page gallery as entered in the admin.
 *
 * The photo is the part worth being strict about. This collection is the only
 * source of the gallery's content — there is no built-in list and no seeded
 * image library behind it — so a panel without a usable photo is not a panel
 * with a gap in it, it is a panel that cannot be drawn. Requiring an `https`
 * URL here also keeps anything but a real image URL out of an `img src`.
 *
 * Uniqueness is checked here too, when the caller can supply the panels that
 * already exist. The gallery identifies a panel by its city and country, so a
 * second panel for the same pair is not a second panel — it is a duplicate
 * competing with the first for the same slot, with whichever photo the draw
 * happens to pick. Matching is on the normalised name, so "Vlorë", "vlore" and
 * " Vlore " all collide with an existing Vlore. It does not guess past that:
 * "Vlora" and "Vlore" are two names this codebase keeps apart elsewhere, and
 * folding them here would refuse a city the gallery does not actually hold.
 */
export function validateCityShowcase(input: {
  city: string;
  country: string;
  searchQuery: string;
  imageUrl: string;
  displayOrder: number | string;
  /** Panels already in the gallery. Omit to skip the uniqueness check. */
  existingPanels?: ReadonlyArray<{ _id?: string; city: string; country: string }>;
  /** Id of the panel being edited, so it never collides with itself. */
  panelId?: string;
}): ValidationResult {
  const city = validateTextLength(String(input.city ?? '').trim(), {
    minLength: 2, maxLength: 80, fieldName: 'City',
  });
  if (!city.isValid) return city;

  const country = validateTextLength(String(input.country ?? '').trim(), {
    minLength: 2, maxLength: 60, fieldName: 'Country',
  });
  if (!country.isValid) return country;

  // What the panel searches when a visitor opens it. An empty one yields a
  // panel that looks right and lands on an unfiltered results page.
  const searchQuery = validateTextLength(String(input.searchQuery ?? '').trim(), {
    minLength: 2, maxLength: 80, fieldName: 'Search term',
  });
  if (!searchQuery.isValid) return searchQuery;

  const imageUrl = String(input.imageUrl ?? '').trim();
  if (!imageUrl) return { isValid: false, error: 'A photo is required' };
  const url = validateUrl(imageUrl, ['https']);
  if (!url.isValid) return url;

  if (!Number.isFinite(Number(input.displayOrder))) {
    return { isValid: false, error: 'Order must be a number' };
  }

  const duplicate = findDuplicateCityPanel(input);
  if (duplicate) {
    return {
      isValid: false,
      error: `${duplicate.city} is already in the gallery — edit that panel instead of adding a second one`,
    };
  }

  return { isValid: true };
}

/** The existing panel a draft would duplicate, or null when it is unique. */
function findDuplicateCityPanel(input: {
  city: string;
  country: string;
  existingPanels?: ReadonlyArray<{ _id?: string; city: string; country: string }>;
  panelId?: string;
}): { city: string; country: string } | null {
  if (!input.existingPanels?.length) return null;

  const city = normalizePlaceName(String(input.city ?? ''));
  const country = normalizePlaceName(String(input.country ?? ''));
  if (!city || !country) return null;

  return (
    input.existingPanels.find(
      (panel) =>
        // A panel never duplicates itself. Panels without an id (a draft
        // compared against unsaved rows) fall through to the name check.
        (!input.panelId || panel._id !== input.panelId) &&
        normalizePlaceName(panel.city) === city &&
        normalizePlaceName(panel.country) === country
    ) ?? null
  );
}

/**
 * Validate one villa destination as entered in the admin.
 *
 * Lives here rather than in the admin component so the rules are stated once:
 * the same shape is written by the admin form, seeded by the import action and
 * read by the home-page corridor, and a bad row shows up as a card that
 * navigates nowhere or a map that flies somewhere absurd.
 */
export function validateVillaDestination(input: {
  name: string;
  query: string;
  country: string;
  lat: number | string;
  lng: number | string;
  zoom: number | string;
}): ValidationResult {
  const name = validateTextLength(String(input.name ?? '').trim(), {
    minLength: 2, maxLength: 80, fieldName: 'Name',
  });
  if (!name.isValid) return name;

  // `query` is what the villas page searches on. An empty one yields a card
  // that looks fine and lands on an unfiltered page, so it is required even
  // though the corridor would happily render without it.
  const query = validateTextLength(String(input.query ?? '').trim(), {
    minLength: 2, maxLength: 80, fieldName: 'Search term',
  });
  if (!query.isValid) return query;

  const country = validateTextLength(String(input.country ?? '').trim(), {
    minLength: 2, maxLength: 60, fieldName: 'Country',
  });
  if (!country.isValid) return country;

  const lat = Number(input.lat);
  const lng = Number(input.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return { isValid: false, error: 'Latitude and longitude must be numbers' };
  }
  const coords = validateCoordinates(lat, lng);
  if (!coords.isValid) return coords;

  const zoom = Number(input.zoom);
  if (!Number.isFinite(zoom) || zoom < 1 || zoom > 20) {
    return { isValid: false, error: 'Zoom must be between 1 and 20' };
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
};
