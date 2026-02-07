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
import sqExploreCities from './locales/sq/exploreCities.json';
import sqSubscription from './locales/sq/subscription.json';
import sqAgencies from './locales/sq/agencies.json';
import sqAgencyDetails from './locales/sq/agencyDetails.json';
import sqAgentProfile from './locales/sq/agentProfile.json';
import sqNewListing from './locales/sq/newListing.json';
import sqAnalytics from './locales/sq/analytics.json';
import sqValuation from './locales/sq/valuation.json';
import sqHowItWorks from './locales/sq/howItWorks.json';

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
import srExploreCities from './locales/sr/exploreCities.json';
import srSubscription from './locales/sr/subscription.json';
import srAgencies from './locales/sr/agencies.json';
import srAgencyDetails from './locales/sr/agencyDetails.json';
import srAgentProfile from './locales/sr/agentProfile.json';
import srNewListing from './locales/sr/newListing.json';
import srAnalytics from './locales/sr/analytics.json';
import srValuation from './locales/sr/valuation.json';
import srHowItWorks from './locales/sr/howItWorks.json';

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
import bgPayment from './locales/bg/payment.json';
import bgSaved from './locales/bg/saved.json';
import bgExploreCities from './locales/bg/exploreCities.json';
import bgSubscription from './locales/bg/subscription.json';
import bgAgencies from './locales/bg/agencies.json';
import bgAgencyDetails from './locales/bg/agencyDetails.json';
import bgAgentProfile from './locales/bg/agentProfile.json';
import bgNewListing from './locales/bg/newListing.json';
import bgAnalytics from './locales/bg/analytics.json';
import bgValuation from './locales/bg/valuation.json';
import bgHowItWorks from './locales/bg/howItWorks.json';

// Import translations - Croatian
import hrCommon from './locales/hr/common.json';
import hrNav from './locales/hr/nav.json';
import hrProperty from './locales/hr/property.json';
import hrAuth from './locales/hr/auth.json';
import hrSearch from './locales/hr/search.json';
import hrMessages from './locales/hr/messages.json';
import hrFooter from './locales/hr/footer.json';
import hrNewsletter from './locales/hr/newsletter.json';
import hrCalculators from './locales/hr/calculators.json';
import hrPricing from './locales/hr/pricing.json';
import hrValidation from './locales/hr/validation.json';
import hrAdmin from './locales/hr/admin.json';
import hrAccount from './locales/hr/account.json';
import hrSeller from './locales/hr/seller.json';
import hrAgents from './locales/hr/agents.json';
import hrModals from './locales/hr/modals.json';
import hrPayment from './locales/hr/payment.json';
import hrSaved from './locales/hr/saved.json';
import hrExploreCities from './locales/hr/exploreCities.json';
import hrSubscription from './locales/hr/subscription.json';
import hrAgencies from './locales/hr/agencies.json';
import hrAgencyDetails from './locales/hr/agencyDetails.json';
import hrAgentProfile from './locales/hr/agentProfile.json';
import hrNewListing from './locales/hr/newListing.json';
import hrAnalytics from './locales/hr/analytics.json';
import hrValuation from './locales/hr/valuation.json';
import hrHowItWorks from './locales/hr/howItWorks.json';

// Import translations - Bosnian
import bsCommon from './locales/bs/common.json';
import bsNav from './locales/bs/nav.json';
import bsProperty from './locales/bs/property.json';
import bsAuth from './locales/bs/auth.json';
import bsSearch from './locales/bs/search.json';
import bsMessages from './locales/bs/messages.json';
import bsFooter from './locales/bs/footer.json';
import bsNewsletter from './locales/bs/newsletter.json';
import bsCalculators from './locales/bs/calculators.json';
import bsPricing from './locales/bs/pricing.json';
import bsValidation from './locales/bs/validation.json';
import bsAdmin from './locales/bs/admin.json';
import bsAccount from './locales/bs/account.json';
import bsSeller from './locales/bs/seller.json';
import bsAgents from './locales/bs/agents.json';
import bsModals from './locales/bs/modals.json';
import bsPayment from './locales/bs/payment.json';
import bsSaved from './locales/bs/saved.json';
import bsExploreCities from './locales/bs/exploreCities.json';
import bsSubscription from './locales/bs/subscription.json';
import bsAgencies from './locales/bs/agencies.json';
import bsAgencyDetails from './locales/bs/agencyDetails.json';
import bsAgentProfile from './locales/bs/agentProfile.json';
import bsNewListing from './locales/bs/newListing.json';
import bsAnalytics from './locales/bs/analytics.json';
import bsValuation from './locales/bs/valuation.json';
import bsHowItWorks from './locales/bs/howItWorks.json';

// Import translations - Montenegrin
import meCommon from './locales/me/common.json';
import meNav from './locales/me/nav.json';
import meProperty from './locales/me/property.json';
import meAuth from './locales/me/auth.json';
import meSearch from './locales/me/search.json';
import meMessages from './locales/me/messages.json';
import meFooter from './locales/me/footer.json';
import meNewsletter from './locales/me/newsletter.json';
import meCalculators from './locales/me/calculators.json';
import mePricing from './locales/me/pricing.json';
import meValidation from './locales/me/validation.json';
import meAdmin from './locales/me/admin.json';
import meAccount from './locales/me/account.json';
import meSeller from './locales/me/seller.json';
import meAgents from './locales/me/agents.json';
import meModals from './locales/me/modals.json';
import mePayment from './locales/me/payment.json';
import meSaved from './locales/me/saved.json';
import meExploreCities from './locales/me/exploreCities.json';
import meSubscription from './locales/me/subscription.json';
import meAgencies from './locales/me/agencies.json';
import meAgencyDetails from './locales/me/agencyDetails.json';
import meAgentProfile from './locales/me/agentProfile.json';
import meNewListing from './locales/me/newListing.json';
import meAnalytics from './locales/me/analytics.json';
import meValuation from './locales/me/valuation.json';
import meHowItWorks from './locales/me/howItWorks.json';

// Import translations - Macedonian
import mkCommon from './locales/mk/common.json';
import mkNav from './locales/mk/nav.json';
import mkProperty from './locales/mk/property.json';
import mkAuth from './locales/mk/auth.json';
import mkSearch from './locales/mk/search.json';
import mkMessages from './locales/mk/messages.json';
import mkFooter from './locales/mk/footer.json';
import mkNewsletter from './locales/mk/newsletter.json';
import mkCalculators from './locales/mk/calculators.json';
import mkPricing from './locales/mk/pricing.json';
import mkValidation from './locales/mk/validation.json';
import mkAdmin from './locales/mk/admin.json';
import mkAccount from './locales/mk/account.json';
import mkSeller from './locales/mk/seller.json';
import mkAgents from './locales/mk/agents.json';
import mkModals from './locales/mk/modals.json';
import mkPayment from './locales/mk/payment.json';
import mkSaved from './locales/mk/saved.json';
import mkExploreCities from './locales/mk/exploreCities.json';
import mkSubscription from './locales/mk/subscription.json';
import mkAgencies from './locales/mk/agencies.json';
import mkAgencyDetails from './locales/mk/agencyDetails.json';
import mkAgentProfile from './locales/mk/agentProfile.json';
import mkNewListing from './locales/mk/newListing.json';
import mkAnalytics from './locales/mk/analytics.json';
import mkValuation from './locales/mk/valuation.json';
import mkHowItWorks from './locales/mk/howItWorks.json';

// Import translations - Romanian
import roCommon from './locales/ro/common.json';
import roNav from './locales/ro/nav.json';
import roProperty from './locales/ro/property.json';
import roAuth from './locales/ro/auth.json';
import roSearch from './locales/ro/search.json';
import roMessages from './locales/ro/messages.json';
import roFooter from './locales/ro/footer.json';
import roNewsletter from './locales/ro/newsletter.json';
import roCalculators from './locales/ro/calculators.json';
import roPricing from './locales/ro/pricing.json';
import roValidation from './locales/ro/validation.json';
import roAdmin from './locales/ro/admin.json';
import roAccount from './locales/ro/account.json';
import roSeller from './locales/ro/seller.json';
import roAgents from './locales/ro/agents.json';
import roModals from './locales/ro/modals.json';
import roPayment from './locales/ro/payment.json';
import roSaved from './locales/ro/saved.json';
import roExploreCities from './locales/ro/exploreCities.json';
import roSubscription from './locales/ro/subscription.json';
import roAgencies from './locales/ro/agencies.json';
import roAgencyDetails from './locales/ro/agencyDetails.json';
import roAgentProfile from './locales/ro/agentProfile.json';
import roNewListing from './locales/ro/newListing.json';
import roAnalytics from './locales/ro/analytics.json';
import roValuation from './locales/ro/valuation.json';
import roHowItWorks from './locales/ro/howItWorks.json';

// Import translations - Greek
import elCommon from './locales/el/common.json';
import elNav from './locales/el/nav.json';
import elProperty from './locales/el/property.json';
import elAuth from './locales/el/auth.json';
import elSearch from './locales/el/search.json';
import elMessages from './locales/el/messages.json';
import elFooter from './locales/el/footer.json';
import elNewsletter from './locales/el/newsletter.json';
import elCalculators from './locales/el/calculators.json';
import elPricing from './locales/el/pricing.json';
import elValidation from './locales/el/validation.json';
import elAdmin from './locales/el/admin.json';
import elAccount from './locales/el/account.json';
import elSeller from './locales/el/seller.json';
import elAgents from './locales/el/agents.json';
import elModals from './locales/el/modals.json';
import elPayment from './locales/el/payment.json';
import elSaved from './locales/el/saved.json';
import elExploreCities from './locales/el/exploreCities.json';
import elSubscription from './locales/el/subscription.json';
import elAgencies from './locales/el/agencies.json';
import elAgencyDetails from './locales/el/agencyDetails.json';
import elAgentProfile from './locales/el/agentProfile.json';
import elNewListing from './locales/el/newListing.json';
import elAnalytics from './locales/el/analytics.json';
import elValuation from './locales/el/valuation.json';
import elHowItWorks from './locales/el/howItWorks.json';

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
    exploreCities: sqExploreCities,
    subscription: sqSubscription,
    agencies: sqAgencies,
    agencyDetails: sqAgencyDetails,
    agentProfile: sqAgentProfile,
    newListing: sqNewListing,
    analytics: sqAnalytics,
    valuation: sqValuation,
    howItWorks: sqHowItWorks,
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
    exploreCities: srExploreCities,
    subscription: srSubscription,
    agencies: srAgencies,
    agencyDetails: srAgencyDetails,
    agentProfile: srAgentProfile,
    newListing: srNewListing,
    analytics: srAnalytics,
    valuation: srValuation,
    howItWorks: srHowItWorks,
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
    payment: bgPayment,
    saved: bgSaved,
    exploreCities: bgExploreCities,
    subscription: bgSubscription,
    agencies: bgAgencies,
    agencyDetails: bgAgencyDetails,
    agentProfile: bgAgentProfile,
    newListing: bgNewListing,
    analytics: bgAnalytics,
    valuation: bgValuation,
    howItWorks: bgHowItWorks,
  },
  hr: {
    common: hrCommon,
    nav: hrNav,
    property: hrProperty,
    auth: hrAuth,
    search: hrSearch,
    messages: hrMessages,
    footer: hrFooter,
    newsletter: hrNewsletter,
    calculators: hrCalculators,
    pricing: hrPricing,
    validation: hrValidation,
    admin: hrAdmin,
    account: hrAccount,
    seller: hrSeller,
    agents: hrAgents,
    modals: hrModals,
    payment: hrPayment,
    saved: hrSaved,
    exploreCities: hrExploreCities,
    subscription: hrSubscription,
    agencies: hrAgencies,
    agencyDetails: hrAgencyDetails,
    agentProfile: hrAgentProfile,
    newListing: hrNewListing,
    analytics: hrAnalytics,
    valuation: hrValuation,
    howItWorks: hrHowItWorks,
  },
  bs: {
    common: bsCommon,
    nav: bsNav,
    property: bsProperty,
    auth: bsAuth,
    search: bsSearch,
    messages: bsMessages,
    footer: bsFooter,
    newsletter: bsNewsletter,
    calculators: bsCalculators,
    pricing: bsPricing,
    validation: bsValidation,
    admin: bsAdmin,
    account: bsAccount,
    seller: bsSeller,
    agents: bsAgents,
    modals: bsModals,
    payment: bsPayment,
    saved: bsSaved,
    exploreCities: bsExploreCities,
    subscription: bsSubscription,
    agencies: bsAgencies,
    agencyDetails: bsAgencyDetails,
    agentProfile: bsAgentProfile,
    newListing: bsNewListing,
    analytics: bsAnalytics,
    valuation: bsValuation,
    howItWorks: bsHowItWorks,
  },
  me: {
    common: meCommon,
    nav: meNav,
    property: meProperty,
    auth: meAuth,
    search: meSearch,
    messages: meMessages,
    footer: meFooter,
    newsletter: meNewsletter,
    calculators: meCalculators,
    pricing: mePricing,
    validation: meValidation,
    admin: meAdmin,
    account: meAccount,
    seller: meSeller,
    agents: meAgents,
    modals: meModals,
    payment: mePayment,
    saved: meSaved,
    exploreCities: meExploreCities,
    subscription: meSubscription,
    agencies: meAgencies,
    agencyDetails: meAgencyDetails,
    agentProfile: meAgentProfile,
    newListing: meNewListing,
    analytics: meAnalytics,
    valuation: meValuation,
    howItWorks: meHowItWorks,
  },
  mk: {
    common: mkCommon,
    nav: mkNav,
    property: mkProperty,
    auth: mkAuth,
    search: mkSearch,
    messages: mkMessages,
    footer: mkFooter,
    newsletter: mkNewsletter,
    calculators: mkCalculators,
    pricing: mkPricing,
    validation: mkValidation,
    admin: mkAdmin,
    account: mkAccount,
    seller: mkSeller,
    agents: mkAgents,
    modals: mkModals,
    payment: mkPayment,
    saved: mkSaved,
    exploreCities: mkExploreCities,
    subscription: mkSubscription,
    agencies: mkAgencies,
    agencyDetails: mkAgencyDetails,
    agentProfile: mkAgentProfile,
    newListing: mkNewListing,
    analytics: mkAnalytics,
    valuation: mkValuation,
    howItWorks: mkHowItWorks,
  },
  ro: {
    common: roCommon,
    nav: roNav,
    property: roProperty,
    auth: roAuth,
    search: roSearch,
    messages: roMessages,
    footer: roFooter,
    newsletter: roNewsletter,
    calculators: roCalculators,
    pricing: roPricing,
    validation: roValidation,
    admin: roAdmin,
    account: roAccount,
    seller: roSeller,
    agents: roAgents,
    modals: roModals,
    payment: roPayment,
    saved: roSaved,
    exploreCities: roExploreCities,
    subscription: roSubscription,
    agencies: roAgencies,
    agencyDetails: roAgencyDetails,
    agentProfile: roAgentProfile,
    newListing: roNewListing,
    analytics: roAnalytics,
    valuation: roValuation,
    howItWorks: roHowItWorks,
  },
  el: {
    common: elCommon,
    nav: elNav,
    property: elProperty,
    auth: elAuth,
    search: elSearch,
    messages: elMessages,
    footer: elFooter,
    newsletter: elNewsletter,
    calculators: elCalculators,
    pricing: elPricing,
    validation: elValidation,
    admin: elAdmin,
    account: elAccount,
    seller: elSeller,
    agents: elAgents,
    modals: elModals,
    payment: elPayment,
    saved: elSaved,
    exploreCities: elExploreCities,
    subscription: elSubscription,
    agencies: elAgencies,
    agencyDetails: elAgencyDetails,
    agentProfile: elAgentProfile,
    newListing: elNewListing,
    analytics: elAnalytics,
    valuation: elValuation,
    howItWorks: elHowItWorks,
  }

};

// Initialize i18next
i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    defaultNS: 'common',
    ns: ['common', 'nav', 'property', 'auth', 'search', 'messages', 'footer', 'newsletter', 'calculators', 'pricing', 'validation', 'admin', 'account', 'seller', 'agents', 'modals', 'payment', 'saved', 'exploreCities', 'analytics', 'subscription', 'agencies', 'agencyDetails', 'agentProfile', 'newListing', 'valuation', 'howItWorks'],

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
