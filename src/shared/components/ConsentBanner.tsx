import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import {
  ACCEPT_ALL,
  COOKIE_SETTINGS_EVENT,
  DENY_ALL,
  getEffectiveCookiePreferences,
  hasConsentedToCookies,
  markConsentDismissed,
  notifyConsentChanged,
  saveConsentRecord,
  wasConsentDismissedThisSession,
  type CookieConsentStatus,
  type CookiePreferences,
} from '../utils/cookieConsent';

// Re-exported so existing importers of this module keep working.
export {
  COOKIE_CONSENT_VERSION,
  DENY_ALL,
  getConsentRecord,
  getCookiePreferences,
  getEffectiveCookiePreferences,
  hasConsentedToCookies,
  hasConsentFor,
  openCookieSettings,
  useCookieConsent,
} from '../utils/cookieConsent';
export type {
  CookieConsentCategory,
  CookieConsentStatus,
  CookiePreferences,
} from '../utils/cookieConsent';

// Helper to get current language from URL
const getCurrentLang = () => {
  const pathLang = window.location.pathname.split('/')[1];
  const validLangs = ['en', 'sq', 'sr', 'de', 'mk'];
  return validLangs.includes(pathLang) ? pathLang : 'en';
};

const ConsentBanner: React.FC = () => {
  const { t } = useTranslation(['common']);
  const [isVisible, setIsVisible] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [mounted, setMounted] = useState(false);
  // Nothing non-essential is pre-ticked: a pre-checked box is not valid consent.
  const [preferences, setPreferences] = useState<CookiePreferences>(DENY_ALL);

  useEffect(() => {
    setMounted(true);

    const openSettings = () => {
      // Start from the stored choice so it can be reviewed, then withdrawn or changed.
      setPreferences(getEffectiveCookiePreferences());
      setShowSettings(true);
      setIsVisible(true);
    };
    window.addEventListener(COOKIE_SETTINGS_EVENT, openSettings);

    let timer: ReturnType<typeof setTimeout> | undefined;
    // Closing the banner suppresses it for this browsing session only; it is not
    // consent, so the choice is put to the user again on their next visit.
    if (!hasConsentedToCookies() && !wasConsentDismissedThisSession()) {
      timer = setTimeout(() => setIsVisible(true), 1000);
    }

    return () => {
      window.removeEventListener(COOKIE_SETTINGS_EVENT, openSettings);
      if (timer) clearTimeout(timer);
    };
  }, []);

  const saveConsent = (prefs: CookiePreferences, status: CookieConsentStatus) => {
    saveConsentRecord(prefs, status);
    setIsVisible(false);
    setShowSettings(false);
    // Let anything gating on consent react to the new choice.
    notifyConsentChanged(prefs);
  };

  const handleAcceptAll = () => saveConsent({ ...ACCEPT_ALL }, 'accepted');

  const handleAcceptEssential = () => saveConsent({ ...DENY_ALL }, 'rejected');

  const handleSavePreferences = () =>
    saveConsent({ ...preferences, essential: true }, 'custom');

  /**
   * Closing without choosing. Nothing is recorded as consent and no non-essential
   * cookie is set; the banner simply steps out of the way until the next visit.
   */
  const handleDismiss = () => {
    markConsentDismissed();
    setIsVisible(false);
    setShowSettings(false);
    // Re-assert the effective (stored, or essential-only) state for any listener.
    notifyConsentChanged(getEffectiveCookiePreferences());
  };

  // Escape closes the banner, same as the close button: dismissal, not consent.
  useEffect(() => {
    if (!isVisible) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleDismiss();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isVisible]);

  const lang = getCurrentLang();

  if (!mounted || !isVisible) return null;

  const toggleClasses =
    "w-8 h-[18px] bg-gray-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-[14px] after:w-[14px] after:transition-all peer-checked:bg-primary";

  const banner = (
    <>
      <style>{`
        @keyframes cookie-slide-up {
          from { opacity: 0; transform: translateY(1rem); }
          to { opacity: 1; transform: translateY(0); }
        }
        .cookie-banner {
          animation: cookie-slide-up 0.3s ease-out;
          /* Sit directly on top of the mobile BottomNav (~3.5rem + safe area) */
          bottom: calc(3.75rem + env(safe-area-inset-bottom, 0px));
        }
        /* BottomNav is md:hidden, so from md up only the floating contact FAB needs clearing */
        @media (min-width: 768px) {
          .cookie-banner { bottom: 6rem; }
        }
      `}</style>
      <div
        className="cookie-banner fixed z-[99998] left-3 right-3 sm:left-auto sm:right-6 sm:w-[22rem] bg-white border border-gray-200 rounded-xl shadow-xl"
        role="dialog"
        aria-label="Cookie consent"
      >
        <div className="p-3.5">
          {!showSettings ? (
            // Main banner view — compact
            <div className="space-y-3">
              <div className="flex items-start gap-2.5">
                <svg className="w-4 h-4 mt-0.5 text-amber-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-xs text-gray-600 leading-snug">
                  <span className="font-semibold text-gray-900">
                    {t('common:cookies.title', 'We use cookies')}
                  </span>
                  {' — '}
                  {t('common:cookies.shortDescription', 'to improve your experience and analyze traffic.')}
                  {' '}
                  <a
                    href={`/${lang}/cookies`}
                    className="text-primary hover:underline font-medium whitespace-nowrap"
                  >
                    {t('common:cookies.learnMore', 'Learn more')}
                  </a>
                </p>
                <button
                  onClick={handleDismiss}
                  className="-mt-1 -mr-1 p-1 text-gray-400 hover:text-gray-700 rounded flex-shrink-0"
                  aria-label={t('common:cookies.close', 'Close without accepting — only essential cookies will be used')}
                  title={t('common:cookies.close', 'Close without accepting — only essential cookies will be used')}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              {/* Accepting and refusing are given equal weight — refusing must be as easy as accepting. */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleAcceptAll}
                  className="flex-1 px-3 py-1.5 text-xs font-semibold text-white bg-primary hover:bg-primary-dark rounded-lg transition-colors"
                >
                  {t('common:cookies.acceptAll', 'Accept All')}
                </button>
                <button
                  onClick={handleAcceptEssential}
                  className="flex-1 px-3 py-1.5 text-xs font-semibold text-white bg-gray-600 hover:bg-gray-700 rounded-lg transition-colors"
                >
                  {t('common:cookies.rejectAll', 'Reject All')}
                </button>
              </div>
              <button
                onClick={() => setShowSettings(true)}
                className="w-full text-xs font-medium text-gray-500 hover:text-gray-700 underline underline-offset-2 transition-colors"
              >
                {t('common:cookies.customize', 'Customize')}
              </button>
            </div>
          ) : (
            // Settings view — compact
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900 text-sm">
                  {t('common:cookies.settingsTitle', 'Cookie Settings')}
                </h3>
                <button
                  onClick={handleDismiss}
                  className="text-gray-400 hover:text-gray-700"
                  aria-label={t('common:cookies.close', 'Close without accepting — only essential cookies will be used')}
                  title={t('common:cookies.close', 'Close without accepting — only essential cookies will be used')}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="divide-y divide-gray-100 border-y border-gray-100">
                {/* Essential Cookies - Always on */}
                <div className="flex items-center justify-between gap-3 py-2">
                  <span className="text-xs font-medium text-gray-900">
                    {t('common:cookies.essential', 'Essential')}
                  </span>
                  <span className="text-[10px] text-green-700 font-medium bg-green-100 px-1.5 py-0.5 rounded">
                    {t('common:cookies.alwaysOn', 'Always on')}
                  </span>
                </div>

                {/* Functional Cookies */}
                <div className="flex items-center justify-between gap-3 py-2">
                  <span className="text-xs font-medium text-gray-900">
                    {t('common:cookies.functional', 'Functional')}
                  </span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preferences.functional}
                      onChange={(e) => setPreferences(p => ({ ...p, functional: e.target.checked }))}
                      className="sr-only peer"
                    />
                    <div className={toggleClasses}></div>
                  </label>
                </div>

                {/* Analytics Cookies */}
                <div className="flex items-center justify-between gap-3 py-2">
                  <span className="text-xs font-medium text-gray-900">
                    {t('common:cookies.analytics', 'Analytics')}
                  </span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preferences.analytics}
                      onChange={(e) => setPreferences(p => ({ ...p, analytics: e.target.checked }))}
                      className="sr-only peer"
                    />
                    <div className={toggleClasses}></div>
                  </label>
                </div>

                {/* Marketing Cookies */}
                <div className="flex items-center justify-between gap-3 py-2">
                  <span className="text-xs font-medium text-gray-900">
                    {t('common:cookies.marketing', 'Marketing')}
                  </span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preferences.marketing}
                      onChange={(e) => setPreferences(p => ({ ...p, marketing: e.target.checked }))}
                      className="sr-only peer"
                    />
                    <div className={toggleClasses}></div>
                  </label>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleAcceptEssential}
                  className="flex-1 px-3 py-1.5 text-xs font-semibold text-white bg-gray-600 hover:bg-gray-700 rounded-lg transition-colors"
                >
                  {t('common:cookies.rejectAll', 'Reject All')}
                </button>
                <button
                  onClick={handleAcceptAll}
                  className="flex-1 px-3 py-1.5 text-xs font-semibold text-white bg-primary hover:bg-primary-dark rounded-lg transition-colors"
                >
                  {t('common:cookies.acceptAll', 'Accept All')}
                </button>
              </div>
              <button
                onClick={handleSavePreferences}
                className="w-full px-3 py-1.5 text-xs font-medium text-gray-700 border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors"
              >
                {t('common:cookies.savePreferences', 'Save Preferences')}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );

  return createPortal(banner, document.body);
};

export default ConsentBanner;
