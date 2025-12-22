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

// Import translations - English
import enCommon from './locales/en/common.json';
import enNav from './locales/en/nav.json';
import enProperty from './locales/en/property.json';
import enAuth from './locales/en/auth.json';
import enSearch from './locales/en/search.json';
import enMessages from './locales/en/messages.json';
import enFooter from './locales/en/footer.json';
import enNewsletter from './locales/en/newsletter.json';
import enCalculators from './locales/en/calculators.json';
import enPricing from './locales/en/pricing.json';
import enValidation from './locales/en/validation.json';
import enAdmin from './locales/en/admin.json';
import enAccount from './locales/en/account.json';
import enSeller from './locales/en/seller.json';
import enAgents from './locales/en/agents.json';
import enModals from './locales/en/modals.json';
import enPayment from './locales/en/payment.json';
import enSaved from './locales/en/saved.json';

// Import translations - Albanian
import sqCommon from './locales/sq/common.json';
import sqNav from './locales/sq/nav.json';
import sqProperty from './locales/sq/property.json';
import sqAuth from './locales/sq/auth.json';
import sqSearch from './locales/sq/search.json';
import sqMessages from './locales/sq/messages.json';
import sqFooter from './locales/sq/footer.json';
import sqNewsletter from './locales/sq/newsletter.json';
import sqCalculators from './locales/sq/calculators.json';
import sqPricing from './locales/sq/pricing.json';
import sqValidation from './locales/sq/validation.json';
import sqAdmin from './locales/sq/admin.json';
import sqAccount from './locales/sq/account.json';
import sqSeller from './locales/sq/seller.json';
import sqAgents from './locales/sq/agents.json';
import sqModals from './locales/sq/modals.json';
import sqPayment from './locales/sq/payment.json';
import sqSaved from './locales/sq/saved.json';

// Import translations - Serbian
import srCommon from './locales/sr/common.json';
import srNav from './locales/sr/nav.json';
import srProperty from './locales/sr/property.json';
import srAuth from './locales/sr/auth.json';
import srSearch from './locales/sr/search.json';
import srMessages from './locales/sr/messages.json';
import srFooter from './locales/sr/footer.json';
import srNewsletter from './locales/sr/newsletter.json';
import srCalculators from './locales/sr/calculators.json';
import srPricing from './locales/sr/pricing.json';
import srValidation from './locales/sr/validation.json';
import srAdmin from './locales/sr/admin.json';
import srAccount from './locales/sr/account.json';
import srSeller from './locales/sr/seller.json';
import srAgents from './locales/sr/agents.json';
import srModals from './locales/sr/modals.json';
import srPayment from './locales/sr/payment.json';
import srSaved from './locales/sr/saved.json';

// Import translations - Bulgarian
import bgCommon from './locales/bg/common.json';
import bgNav from './locales/bg/nav.json';
import bgProperty from './locales/bg/property.json';
import bgAuth from './locales/bg/auth.json';
import bgSearch from './locales/bg/search.json';
import bgMessages from './locales/bg/messages.json';
import bgFooter from './locales/bg/footer.json';
import bgNewsletter from './locales/bg/newsletter.json';
import bgCalculators from './locales/bg/calculators.json';
import bgPricing from './locales/bg/pricing.json';
import bgValidation from './locales/bg/validation.json';
import bgAdmin from './locales/bg/admin.json';
import bgAccount from './locales/bg/account.json';
import bgSeller from './locales/bg/seller.json';
import bgAgents from './locales/bg/agents.json';
import bgModals from './locales/bg/modals.json';
import bgSaved from './locales/bg/saved.json';

// Import translations - Croatian
import hrSaved from './locales/hr/saved.json';

// Import translations - Bosnian
import bsSaved from './locales/bs/saved.json';

// Import translations - Montenegrin
import meSaved from './locales/me/saved.json';

// Import translations - Macedonian
import mkSaved from './locales/mk/saved.json';

// Import translations - Romanian
import roSaved from './locales/ro/saved.json';

// Import translations - Greek
import elSaved from './locales/el/saved.json';

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
    footer: enFooter,
    newsletter: enNewsletter,
    calculators: enCalculators,
    pricing: enPricing,
    validation: enValidation,
    admin: enAdmin,
    account: enAccount,
    seller: enSeller,
    agents: enAgents,
    modals: enModals,
    payment: enPayment,
    saved: enSaved,
  },
  sq: {
    common: sqCommon,
    nav: sqNav,
    property: sqProperty,
    auth: sqAuth,
    search: sqSearch,
    messages: sqMessages,
    footer: sqFooter,
    newsletter: sqNewsletter,
    calculators: sqCalculators,
    pricing: sqPricing,
    validation: sqValidation,
    admin: sqAdmin,
    account: sqAccount,
    seller: sqSeller,
    agents: sqAgents,
    modals: sqModals,
    payment: sqPayment,
    saved: sqSaved,
  },
  sr: {
    common: srCommon,
    nav: srNav,
    property: srProperty,
    auth: srAuth,
    search: srSearch,
    messages: srMessages,
    footer: srFooter,
    newsletter: srNewsletter,
    calculators: srCalculators,
    pricing: srPricing,
    validation: srValidation,
    admin: srAdmin,
    account: srAccount,
    seller: srSeller,
    agents: srAgents,
    modals: srModals,
    payment: srPayment,
    saved: srSaved,
  },
  bg: {
    common: bgCommon,
    nav: bgNav,
    property: bgProperty,
    auth: bgAuth,
    search: bgSearch,
    messages: bgMessages,
    footer: bgFooter,
    newsletter: bgNewsletter,
    calculators: bgCalculators,
    pricing: bgPricing,
    validation: bgValidation,
    admin: bgAdmin,
    account: bgAccount,
    seller: bgSeller,
    agents: bgAgents,
    modals: bgModals,
    saved: bgSaved,
  },
  hr: {
    saved: hrSaved,
  },
  bs: {
    saved: bsSaved,
  },
  me: {
    saved: meSaved,
  },
  mk: {
    saved: mkSaved,
  },
  ro: {
    saved: roSaved,
  },
  el: {
    saved: elSaved,
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
    ns: ['common', 'nav', 'property', 'auth', 'search', 'messages', 'footer', 'newsletter', 'calculators', 'pricing', 'validation', 'admin', 'account', 'seller', 'agents', 'modals', 'payment', 'saved'],

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
