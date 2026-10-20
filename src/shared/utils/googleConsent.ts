import { CookiePreferences } from './cookieConsent';

/**
 * Pass a cookie-banner choice on to Google Consent Mode, which the gtag snippet
 * in index.html sets up with everything denied. Analytics storage follows the
 * analytics category; the ad signals (also read by AdSense) follow marketing.
 */
export const updateGoogleConsent = (preferences: CookiePreferences) => {
  if (typeof window.gtag !== 'function') return;

  const ads = preferences.marketing ? 'granted' : 'denied';
  window.gtag('consent', 'update', {
    ad_storage: ads,
    ad_user_data: ads,
    ad_personalization: ads,
    analytics_storage: preferences.analytics ? 'granted' : 'denied',
  });
};
