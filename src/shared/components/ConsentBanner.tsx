import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';

export interface CookiePreferences {
  essential: boolean; // Always true, can't be disabled
  analytics: boolean;
  marketing: boolean;
  functional: boolean;
}

const COOKIE_CONSENT_KEY = 'balkanestate_cookie_consent';
const COOKIE_PREFERENCES_KEY = 'balkanestate_cookie_preferences';

// Helper to get current language from URL
const getCurrentLang = () => {
  const pathLang = window.location.pathname.split('/')[1];
  const validLangs = ['en', 'sq', 'sr', 'de', 'mk'];
  return validLangs.includes(pathLang) ? pathLang : 'en';
};

export const getCookiePreferences = (): CookiePreferences | null => {
  try {
    const stored = localStorage.getItem(COOKIE_PREFERENCES_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
};

export const hasConsentedToCookies = (): boolean => {
  return localStorage.getItem(COOKIE_CONSENT_KEY) === 'true';
};

const ConsentBanner: React.FC = () => {
  const { t } = useTranslation(['common']);
  const [isVisible, setIsVisible] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>({
    essential: true,
    analytics: true,
    marketing: false,
    functional: true,
  });

  useEffect(() => {
    setMounted(true);
    // Check if user has already consented
    const hasConsented = hasConsentedToCookies();
    if (!hasConsented) {
      // Small delay for better UX
      const timer = setTimeout(() => setIsVisible(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const saveConsent = (prefs: CookiePreferences) => {
    localStorage.setItem(COOKIE_CONSENT_KEY, 'true');
    localStorage.setItem(COOKIE_PREFERENCES_KEY, JSON.stringify(prefs));
    setIsVisible(false);

    // Dispatch event for other parts of the app to react
    window.dispatchEvent(new CustomEvent('cookieConsentUpdated', { detail: prefs }));
  };

  const handleAcceptAll = () => {
    saveConsent({
      essential: true,
      analytics: true,
      marketing: true,
      functional: true,
    });
  };

  const handleAcceptEssential = () => {
    saveConsent({
      essential: true,
      analytics: false,
      marketing: false,
      functional: false,
    });
  };

  const handleSavePreferences = () => {
    saveConsent(preferences);
  };

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
        }
      `}</style>
      <div
        className="cookie-banner fixed z-[99998] bottom-3 left-3 right-3 sm:right-auto sm:bottom-4 sm:left-4 sm:w-[22rem] bg-white border border-gray-200 rounded-xl shadow-xl"
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
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleAcceptAll}
                  className="flex-1 px-3 py-1.5 text-xs font-semibold text-white bg-primary hover:bg-primary-dark rounded-lg transition-colors"
                >
                  {t('common:cookies.acceptAll', 'Accept All')}
                </button>
                <button
                  onClick={handleAcceptEssential}
                  className="flex-1 px-3 py-1.5 text-xs font-medium text-gray-700 border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  {t('common:cookies.essentialOnly', 'Essential Only')}
                </button>
                <button
                  onClick={() => setShowSettings(true)}
                  className="px-2 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors whitespace-nowrap"
                >
                  {t('common:cookies.customize', 'Customize')}
                </button>
              </div>
            </div>
          ) : (
            // Settings view — compact
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900 text-sm">
                  {t('common:cookies.settingsTitle', 'Cookie Settings')}
                </h3>
                <button
                  onClick={() => setShowSettings(false)}
                  className="text-gray-400 hover:text-gray-700"
                  aria-label="Close settings"
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
                  className="flex-1 px-3 py-1.5 text-xs font-medium text-gray-700 border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  {t('common:cookies.rejectAll', 'Reject All')}
                </button>
                <button
                  onClick={handleSavePreferences}
                  className="flex-1 px-3 py-1.5 text-xs font-semibold text-white bg-primary hover:bg-primary-dark rounded-lg transition-colors"
                >
                  {t('common:cookies.savePreferences', 'Save Preferences')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );

  return createPortal(banner, document.body);
};

export default ConsentBanner;
