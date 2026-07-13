import { i18nLogger } from '../shared/utils/logger';

/**
 * i18n Configuration
 * Multi-language support for BalkanEstate
 *
 * PERFORMANCE: Only English translations are bundled eagerly.
 * Other languages are loaded on-demand when the user switches language,
 * saving ~200-300 KiB from the initial bundle.
 *
 * Supported Languages:
 * - en: English (default) - bundled eagerly
 * - sq: Albanian (Shqip) - loaded on demand
 * - sr: Serbian (Српски) - loaded on demand
 * - mk: Macedonian (Македонски) - loaded on demand
 * - bs: Bosnian (Bosanski) - loaded on demand
 * - hr: Croatian (Hrvatski) - loaded on demand
 * - bg: Bulgarian (Български) - loaded on demand
 * - ro: Romanian (Română) - loaded on demand
 * - el: Greek (Ελληνικά) - loaded on demand
 * - me: Montenegrin (Crnogorski) - loaded on demand
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Only import English translations eagerly (default/fallback language)
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
import enExploreCities from './locales/en/exploreCities.json';
import enAnalytics from './locales/en/analytics.json';
import enSubscription from './locales/en/subscription.json';
import enAgencies from './locales/en/agencies.json';
import enAgencyDetails from './locales/en/agencyDetails.json';
import enAgentProfile from './locales/en/agentProfile.json';
import enNewListing from './locales/en/newListing.json';
import enValuation from './locales/en/valuation.json';
import enHowItWorks from './locales/en/howItWorks.json';
import enRental from './locales/en/rental.json';
import enAgencyDashboard from './locales/en/agencyDashboard.json';
import enHome from './locales/en/home.json';
import enBusinessDirectory from './locales/en/businessDirectory.json';
import enListingFeeds from './locales/en/listingFeeds.json';
import enBlog from './locales/en/blog.json';
import enVillas from './locales/en/villas.json';

// Language configuration
export const languages = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧' },
  { code: 'sq', name: 'Albanian', nativeName: 'Shqip', flag: '🇦🇱' },
  { code: 'sr', name: 'Serbian', nativeName: 'Српски', flag: '🇷🇸' },
  { code: 'mk', name: 'Macedonian', nativeName: 'Македонски', flag: '🇲🇰' },
  { code: 'bs', name: 'Bosnian', nativeName: 'Bosanski', flag: '🇧🇦' },
  { code: 'hr', name: 'Croatian', nativeName: 'Hrvatski', flag: '🇭🇷' },
  { code: 'bg', name: 'Bulgarian', nativeName: 'Български', flag: '🇧🇬' },
  { code: 'ro', name: 'Romanian', nativeName: 'Română', flag: '🇷🇴' },
  { code: 'el', name: 'Greek', nativeName: 'Ελληνικά', flag: '🇬🇷' },
  { code: 'me', name: 'Montenegrin', nativeName: 'Crnogorski', flag: '🇲🇪' },
] as const;

export type LanguageCode = typeof languages[number]['code'];

// All translation namespaces
const NAMESPACES = [
  'common', 'nav', 'property', 'auth', 'search', 'messages', 'footer',
  'newsletter', 'calculators', 'pricing', 'validation', 'admin', 'account',
  'seller', 'agents', 'modals', 'payment', 'saved', 'exploreCities',
  'analytics', 'subscription', 'agencies', 'agencyDetails', 'agentProfile',
  'newListing', 'valuation', 'howItWorks', 'rental', 'agencyDashboard', 'home', 'businessDirectory', 'villas',
] as const;

// English resources (always available as fallback)
const enResources = {
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
  exploreCities: enExploreCities,
  analytics: enAnalytics,
  subscription: enSubscription,
  agencies: enAgencies,
  agencyDetails: enAgencyDetails,
  agentProfile: enAgentProfile,
  newListing: enNewListing,
  valuation: enValuation,
  howItWorks: enHowItWorks,
  rental: enRental,
  agencyDashboard: enAgencyDashboard,
  home: enHome,
  businessDirectory: enBusinessDirectory,
  listingFeeds: enListingFeeds,
  blog: enBlog,
  villas: enVillas,
};

// Track which language bundles have been loaded
const loadedLanguages = new Set<string>(['en']);

// In-flight loading promises to prevent duplicate loads
const loadingPromises = new Map<string, Promise<void>>();

// Dynamic language loaders - each creates a separate Vite chunk
const languageLoaders: Record<string, () => Promise<{ default: Record<string, unknown> }>> = {
  sq: () => import('./locales/sq/bundle'),
  sr: () => import('./locales/sr/bundle'),
  bg: () => import('./locales/bg/bundle'),
  hr: () => import('./locales/hr/bundle'),
  bs: () => import('./locales/bs/bundle'),
  me: () => import('./locales/me/bundle'),
  mk: () => import('./locales/mk/bundle'),
  ro: () => import('./locales/ro/bundle'),
  el: () => import('./locales/el/bundle'),
};

/**
 * Load a language bundle dynamically and register it with i18next.
 * Safe to call multiple times - deduplicates concurrent loads.
 */
export async function loadLanguageResources(lang: string): Promise<void> {
  if (loadedLanguages.has(lang)) return;

  // Return existing in-flight promise if already loading
  const existing = loadingPromises.get(lang);
  if (existing) return existing;

  const loader = languageLoaders[lang];
  if (!loader) return;

  const loadPromise = loader()
    .then((mod) => {
      const bundle = mod.default;
      // Register each namespace with i18next
      for (const [ns, translations] of Object.entries(bundle)) {
        i18n.addResourceBundle(lang, ns, translations, true, true);
      }
      loadedLanguages.add(lang);
    })
    .catch((err) => {
      // Log but don't crash - English fallback will be used
      i18nLogger.warn(`Failed to load language bundle for "${lang}":`, err);
    })
    .finally(() => {
      loadingPromises.delete(lang);
    });

  loadingPromises.set(lang, loadPromise);
  return loadPromise;
}

// Initialize i18next with only English resources
i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: { en: enResources },
    fallbackLng: 'en',
    defaultNS: 'common',
    ns: [...NAMESPACES],
    partialBundledLanguages: true,

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
  })
  .then(() => {
    // Set initial html lang attribute for SEO and accessibility
    document.documentElement.lang = i18n.language || 'en';

    // If detected language is not English, load its bundle and switch
    const detectedLang = (i18n.language || 'en').split('-')[0];
    if (detectedLang !== 'en' && languageLoaders[detectedLang]) {
      loadLanguageResources(detectedLang).then(() => {
        i18n.changeLanguage(detectedLang);
      });
    }
  });

// Listen for language changes to update html lang attribute
i18n.on('languageChanged', (lng) => {
  document.documentElement.lang = lng;
  // Update meta og:locale for social sharing
  const ogLocale = document.querySelector('meta[property="og:locale"]');
  if (ogLocale) {
    const localeMap: Record<string, string> = {
      en: 'en_US', sq: 'sq_AL', sr: 'sr_RS', bg: 'bg_BG',
      hr: 'hr_HR', bs: 'bs_BA', mk: 'mk_MK', me: 'sr_ME',
      ro: 'ro_RO', el: 'el_GR'
    };
    ogLocale.setAttribute('content', localeMap[lng] || 'en_US');
  }
});

/**
 * Change language - loads the language bundle first if needed.
 * Falls back to English if the bundle fails to load.
 */
export const changeLanguage = async (lng: LanguageCode): Promise<void> => {
  await loadLanguageResources(lng);
  await i18n.changeLanguage(lng);
  localStorage.setItem('balkanestate_language', lng);
  document.documentElement.lang = lng;
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
