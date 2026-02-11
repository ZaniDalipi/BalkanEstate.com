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

const CookieConsent: React.FC = () => {
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

  const banner = (
    <>
      <style>{`
        @keyframes cookie-slide-up {
          from { opacity: 0; transform: translateY(100%); }
          to { opacity: 1; transform: translateY(0); }
        }
        .cookie-banner {
          animation: cookie-slide-up 0.4s ease-out;
        }
      `}</style>
      <div
        className="cookie-banner fixed bottom-0 left-0 right-0 z-[99998] bg-white border-t border-gray-200 shadow-2xl"
        role="dialog"
        aria-label="Cookie consent"
      >
        <div className="max-w-7xl mx-auto px-4 py-4 sm:py-5">
          {!showSettings ? (
            // Main banner view
            <div className="flex flex-col lg:flex-row lg:items-center gap-4">
              <div className="flex-1">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-amber-100 rounded-lg flex-shrink-0">
                    <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 text-sm sm:text-base">
                      {t('common:cookies.title', 'We use cookies')}
                    </h3>
                    <p className="text-gray-600 text-sm mt-1 leading-relaxed">
                      {t('common:cookies.description', 'We use cookies to improve your experience, analyze site traffic, and personalize content. You can choose which cookies to accept.')}
                      {' '}
                      <a
                        href={`/${lang}/cookies`}
                        className="text-primary hover:underline font-medium"
                      >
                        {t('common:cookies.learnMore', 'Learn more about our cookie policy')}
                      </a>
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 lg:flex-shrink-0">
                <button
                  onClick={() => setShowSettings(true)}
                  className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  {t('common:cookies.customize', 'Customize')}
                </button>
                <button
                  onClick={handleAcceptEssential}
                  className="px-4 py-2.5 text-sm font-medium text-gray-700 border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  {t('common:cookies.essentialOnly', 'Essential Only')}
                </button>
                <button
                  onClick={handleAcceptAll}
                  className="px-5 py-2.5 text-sm font-semibold text-white bg-primary hover:bg-primary-dark rounded-lg transition-colors shadow-sm"
                >
                  {t('common:cookies.acceptAll', 'Accept All')}
                </button>
              </div>
            </div>
          ) : (
            // Settings view
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">
                  {t('common:cookies.settingsTitle', 'Cookie Settings')}
                </h3>
                <button
                  onClick={() => setShowSettings(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {/* Essential Cookies - Always on */}
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-gray-900 text-sm">
                      {t('common:cookies.essential', 'Essential')}
                    </span>
                    <span className="text-xs text-green-600 font-medium bg-green-100 px-2 py-0.5 rounded">
                      {t('common:cookies.alwaysOn', 'Always on')}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600">
                    {t('common:cookies.essentialDesc', 'Required for the website to function. Cannot be disabled.')}
                  </p>
                </div>

                {/* Functional Cookies */}
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-gray-900 text-sm">
                      {t('common:cookies.functional', 'Functional')}
                    </span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={preferences.functional}
                        onChange={(e) => setPreferences(p => ({ ...p, functional: e.target.checked }))}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-gray-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>
                  <p className="text-xs text-gray-600">
                    {t('common:cookies.functionalDesc', 'Remember your preferences like language and currency.')}
                  </p>
                </div>

                {/* Analytics Cookies */}
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-gray-900 text-sm">
                      {t('common:cookies.analytics', 'Analytics')}
                    </span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={preferences.analytics}
                        onChange={(e) => setPreferences(p => ({ ...p, analytics: e.target.checked }))}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-gray-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>
                  <p className="text-xs text-gray-600">
                    {t('common:cookies.analyticsDesc', 'Help us understand how visitors use our site.')}
                  </p>
                </div>

                {/* Marketing Cookies */}
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-gray-900 text-sm">
                      {t('common:cookies.marketing', 'Marketing')}
                    </span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={preferences.marketing}
                        onChange={(e) => setPreferences(p => ({ ...p, marketing: e.target.checked }))}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-gray-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>
                  <p className="text-xs text-gray-600">
                    {t('common:cookies.marketingDesc', 'Show you relevant ads and track campaign performance.')}
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={handleAcceptEssential}
                  className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  {t('common:cookies.rejectAll', 'Reject All')}
                </button>
                <button
                  onClick={handleSavePreferences}
                  className="px-5 py-2 text-sm font-semibold text-white bg-primary hover:bg-primary-dark rounded-lg transition-colors"
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

export default CookieConsent;
