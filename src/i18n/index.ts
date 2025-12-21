/**
 * i18n Configuration
 * Multi-language support for BalkanEstate
 *
 * Supported Languages:
 * - en: English (default)
 * - sq: Albanian (Shqip)
 * - sr: Serbian (Српски)
 * - mk: Macedonian (Македонски)
 * - bs: Bosnian (Bosanski)
 * - hr: Croatian (Hrvatski)
 * - sl: Slovenian (Slovenščina)
 * - bg: Bulgarian (Български)
 * - ro: Romanian (Română)
 * - el: Greek (Ελληνικά)
 * - me: Montenegrin (Crnogorski)
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translations
import enCommon from './locales/en/common.json';
import enNav from './locales/en/nav.json';
import enProperty from './locales/en/property.json';
import enAuth from './locales/en/auth.json';
import enSearch from './locales/en/search.json';
import enMessages from './locales/en/messages.json';

import sqCommon from './locales/sq/common.json';
import sqNav from './locales/sq/nav.json';
import sqProperty from './locales/sq/property.json';
import sqAuth from './locales/sq/auth.json';
import sqSearch from './locales/sq/search.json';
import sqMessages from './locales/sq/messages.json';

import srCommon from './locales/sr/common.json';
import srNav from './locales/sr/nav.json';
import srProperty from './locales/sr/property.json';
import srAuth from './locales/sr/auth.json';
import srSearch from './locales/sr/search.json';
import srMessages from './locales/sr/messages.json';

// Language configuration
export const languages = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧' },
  { code: 'sq', name: 'Albanian', nativeName: 'Shqip', flag: '🇦🇱' },
  { code: 'sr', name: 'Serbian', nativeName: 'Српски', flag: '🇷🇸' },
  { code: 'mk', name: 'Macedonian', nativeName: 'Македонски', flag: '🇲🇰' },
  { code: 'bs', name: 'Bosnian', nativeName: 'Bosanski', flag: '🇧🇦' },
  { code: 'hr', name: 'Croatian', nativeName: 'Hrvatski', flag: '🇭🇷' },
  { code: 'sl', name: 'Slovenian', nativeName: 'Slovenščina', flag: '🇸🇮' },
  { code: 'bg', name: 'Bulgarian', nativeName: 'Български', flag: '🇧🇬' },
  { code: 'ro', name: 'Romanian', nativeName: 'Română', flag: '🇷🇴' },
  { code: 'el', name: 'Greek', nativeName: 'Ελληνικά', flag: '🇬🇷' },
  { code: 'me', name: 'Montenegrin', nativeName: 'Crnogorski', flag: '🇲🇪' },
] as const;

export type LanguageCode = typeof languages[number]['code'];

// Resources object with all translations
const resources = {
  en: {
    common: enCommon,
    nav: enNav,
    property: enProperty,
    auth: enAuth,
    search: enSearch,
    messages: enMessages,
  },
  sq: {
    common: sqCommon,
    nav: sqNav,
    property: sqProperty,
    auth: sqAuth,
    search: sqSearch,
    messages: sqMessages,
  },
  sr: {
    common: srCommon,
    nav: srNav,
    property: srProperty,
    auth: srAuth,
    search: srSearch,
    messages: srMessages,
  },
  // Other languages will fallback to English until translations are added
};

// Initialize i18next
i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    defaultNS: 'common',
    ns: ['common', 'nav', 'property', 'auth', 'search', 'messages'],

    interpolation: {
      escapeValue: false, // React already escapes
    },

    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
      lookupLocalStorage: 'balkanestate_language',
    },

    react: {
      useSuspense: false,
    },
  });

// Helper function to change language
export const changeLanguage = (lng: LanguageCode): Promise<void> => {
  return i18n.changeLanguage(lng).then(() => {
    localStorage.setItem('balkanestate_language', lng);
    document.documentElement.lang = lng;
  });
};

// Get current language
export const getCurrentLanguage = (): LanguageCode => {
  return (i18n.language || 'en') as LanguageCode;
};

// Check if a language is supported
export const isLanguageSupported = (code: string): code is LanguageCode => {
  return languages.some(lang => lang.code === code);
};

// Get language info
export const getLanguageInfo = (code: LanguageCode) => {
  return languages.find(lang => lang.code === code);
};

export default i18n;
