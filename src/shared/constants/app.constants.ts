/**
 * Application Constants
 * Centralized configuration values used throughout the app
 */

/**
 * API Configuration
 */
export const API_CONFIG = {
  /** Base API URL - defaults to localhost in development */
  BASE_URL: import.meta.env.VITE_API_URL || 'http://localhost:5001/api',
  /** Request timeout in milliseconds */
  TIMEOUT: 30000,
  /** Maximum retries for failed requests */
  MAX_RETRIES: 3,
} as const;

/**
 * Supported Languages
 */
export const SUPPORTED_LANGUAGES = [
  'en', 'sq', 'sr', 'de', 'mk', 'hr', 'bs', 'sl', 'bg', 'ro', 'el', 'tr', 'it', 'fr'
] as const;

export type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number];

/**
 * Default language for the application
 */
export const DEFAULT_LANGUAGE: SupportedLanguage = 'en';

/**
 * Route Mappings
 */
export const ROUTES = {
  HOME: '/',
  SEARCH: '/search',
  EXPLORE_CITIES: '/explore-cities',
  SAVED_SEARCHES: '/saved-searches',
  SAVED_PROPERTIES: '/saved-properties',
  INBOX: '/inbox',
  AGENTS: '/agents',
  AGENCIES: '/agencies',
  RESET_PASSWORD: '/reset-password',
  VERIFY_EMAIL: '/verify-email',
  ANALYTICS: '/analytics',
  VALUATION: '/valuation',
  MORTGAGE_CALCULATOR: '/mortgage-calculator',
  SUBSCRIBE: '/subscribe',
  PRICING: '/pricing',
  PRIVACY: '/privacy',
  PRIVACY_POLICY: '/privacy-policy',
  TERMS: '/terms',
  TERMS_OF_SERVICE: '/terms-of-service',
  COOKIES: '/cookies',
  COOKIE_POLICY: '/cookie-policy',
  REFUND: '/refund',
  REFUND_POLICY: '/refund-policy',
  CREATE_AGENCY: '/create-agency',
  CREATE_AGENCY_PAYMENT: '/create-agency/payment',
  CREATE_AGENCY_CONFIRM: '/create-agency/confirm',
  HOW_IT_WORKS: '/how-it-works',
  ADMIN: '/admin',
  AGENCY_DASHBOARD: '/agency-dashboard',
  ACCOUNT: '/account',
  CREATE_LISTING: '/create-listing',
  CONTACT: '/contact',
  PAYMENT_SUCCESS: '/payment/success',
  PAYMENT_CANCEL: '/payment/cancel',
  LOGIN: '/login',
  REGISTER: '/register',
} as const;

/**
 * Pagination defaults
 */
export const PAGINATION = {
  /** Default page size for listings */
  DEFAULT_PAGE_SIZE: 20,
  /** Maximum page size allowed */
  MAX_PAGE_SIZE: 100,
} as const;

/**
 * File upload limits
 */
export const FILE_LIMITS = {
  /** Maximum image size in bytes (5MB) */
  MAX_IMAGE_SIZE: 5 * 1024 * 1024,
  /** Maximum number of images per property */
  MAX_IMAGES_PER_PROPERTY: 20,
  /** Allowed image types */
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
} as const;

/**
 * Property validation limits
 */
export const PROPERTY_LIMITS = {
  /** Minimum title length */
  MIN_TITLE_LENGTH: 5,
  /** Maximum title length */
  MAX_TITLE_LENGTH: 200,
  /** Minimum description length */
  MIN_DESCRIPTION_LENGTH: 20,
  /** Maximum description length */
  MAX_DESCRIPTION_LENGTH: 5000,
  /** Minimum price */
  MIN_PRICE: 0,
  /** Maximum price */
  MAX_PRICE: 1000000000,
  /** Minimum year built */
  MIN_YEAR_BUILT: 1800,
  /** Maximum room count */
  MAX_ROOM_COUNT: 100,
} as const;

/**
 * Local storage keys
 */
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'balkan_estate_token',
  REFRESH_TOKEN: 'balkan_estate_refresh_token',
  USER_PREFERENCES: 'balkan_estate_preferences',
  LANGUAGE: 'balkan_estate_language',
  COOKIE_CONSENT: 'balkan_estate_cookie_consent',
  ONBOARDING_COMPLETE: 'balkan_estate_onboarding',
} as const;

/**
 * Timeout durations (in milliseconds)
 */
export const TIMEOUTS = {
  /** Debounce delay for search input */
  SEARCH_DEBOUNCE: 300,
  /** Toast notification display time */
  TOAST_DURATION: 5000,
  /** Session timeout warning (before expiry) */
  SESSION_WARNING: 5 * 60 * 1000, // 5 minutes
} as const;

/**
 * Promotion tiers configuration
 */
export const PROMOTION_TIERS = {
  standard: { name: 'Standard', color: 'text-gray-700', bg: 'bg-gray-100', icon: '✨' },
  featured: { name: 'Featured', color: 'text-violet-600', bg: 'bg-violet-50', icon: '⭐' },
  highlight: { name: 'Highlight', color: 'text-sky-700', bg: 'bg-sky-100', icon: '💎' },
  premium: { name: 'Premium', color: 'text-amber-700', bg: 'bg-amber-100', icon: '👑' },
} as const;

/**
 * Admin sections
 */
export const ADMIN_SECTIONS = [
  'dashboard',
  'users',
  'inquiries',
  'agent-requests',
  'discounts',
  'promotions',
  'properties',
  'agencies',
  'pricing',
  'activity',
  'settings',
  'how-it-works',
  'email-templates',
] as const;

/**
 * Agency dashboard sections
 */
export const AGENCY_DASHBOARD_SECTIONS = [
  'overview',
  'agents',
  'properties',
  'leads',
  'analytics',
  'financial',
  'profile',
  'team',
] as const;

/**
 * How It Works tabs
 */
export const HOW_IT_WORKS_TABS = [
  'getting-started',
  'premium-features',
  'agencies',
  'agents',
  'buyers',
  'sellers',
] as const;

export default {
  API_CONFIG,
  SUPPORTED_LANGUAGES,
  DEFAULT_LANGUAGE,
  ROUTES,
  PAGINATION,
  FILE_LIMITS,
  PROPERTY_LIMITS,
  STORAGE_KEYS,
  TIMEOUTS,
  PROMOTION_TIERS,
  ADMIN_SECTIONS,
  AGENCY_DASHBOARD_SECTIONS,
  HOW_IT_WORKS_TABS,
};
