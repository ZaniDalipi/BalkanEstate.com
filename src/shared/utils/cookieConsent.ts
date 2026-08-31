import { useState, useEffect } from 'react';

/**
 * Cookie consent state, kept separate from the banner UI so that consumers can
 * gate scripts on consent without pulling the (lazily loaded) banner into the
 * main bundle.
 *
 * The rules this encodes:
 *  - Non-essential cookies require prior, affirmative consent, so the default
 *    state is deny-all and never opt-in.
 *  - Closing or ignoring the banner is not consent.
 *  - Refusing must be as easy as accepting.
 *  - Consent is recorded with a timestamp and a version, and expires, so the
 *    choice is put to the user again.
 *  - Consent can be withdrawn as easily as it was given.
 */

export interface CookiePreferences {
  essential: boolean; // Always true, can't be disabled
  analytics: boolean;
  marketing: boolean;
  functional: boolean;
}

export type CookieConsentCategory = keyof CookiePreferences;

/** How the choice was made — kept as part of the record of consent. */
export type CookieConsentStatus = 'accepted' | 'rejected' | 'custom';

export interface StoredConsent {
  version: number;
  status: CookieConsentStatus;
  timestamp: string; // ISO 8601, so we can evidence when consent was given
  preferences: CookiePreferences;
}

const COOKIE_CONSENT_KEY = 'balkanestate_cookie_consent';
const COOKIE_PREFERENCES_KEY = 'balkanestate_cookie_preferences';
const COOKIE_CONSENT_RECORD_KEY = 'balkanestate_cookie_consent_record';
/** Set only when the banner is closed without a choice — clears when the tab closes. */
const COOKIE_DISMISSED_KEY = 'balkanestate_cookie_dismissed';

/** Bump when the categories or the cookies behind them change: it invalidates stored consent. */
export const COOKIE_CONSENT_VERSION = 1;

/**
 * Consent is not indefinite. Regulators (e.g. CNIL) expect the choice to be put
 * to the user again periodically; six months is the common guidance.
 */
const CONSENT_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 183;

/** No consent = nothing but strictly necessary cookies. Never assume opt-in. */
export const DENY_ALL: CookiePreferences = Object.freeze({
  essential: true,
  analytics: false,
  marketing: false,
  functional: false,
});

export const ACCEPT_ALL: CookiePreferences = Object.freeze({
  essential: true,
  analytics: true,
  marketing: true,
  functional: true,
});

/** Fired whenever the stored consent changes, with the effective preferences as detail. */
export const COOKIE_CONSENT_EVENT = 'cookieConsentUpdated';
/** Fired to re-open the banner so a choice can be reviewed or withdrawn. */
export const COOKIE_SETTINGS_EVENT = 'openCookieSettings';

/**
 * The stored consent record, or null when there is none that still counts —
 * never stored, written by an older category set, or older than CONSENT_MAX_AGE_MS.
 */
export const getConsentRecord = (): StoredConsent | null => {
  try {
    const raw = localStorage.getItem(COOKIE_CONSENT_RECORD_KEY);
    if (!raw) return null;

    const record = JSON.parse(raw) as StoredConsent;
    if (!record?.preferences || record.version !== COOKIE_CONSENT_VERSION) return null;

    const age = Date.now() - new Date(record.timestamp).getTime();
    if (!Number.isFinite(age) || age > CONSENT_MAX_AGE_MS) return null;

    return record;
  } catch {
    return null;
  }
};

/** Raw stored preferences, or null if the user has not made a valid choice. */
export const getCookiePreferences = (): CookiePreferences | null =>
  getConsentRecord()?.preferences ?? null;

/**
 * What the app may actually do right now. Falls back to essential-only, so a
 * caller that forgets to check for consent still cannot set a tracking cookie.
 */
export const getEffectiveCookiePreferences = (): CookiePreferences =>
  getCookiePreferences() ?? DENY_ALL;

export const hasConsentedToCookies = (): boolean => getConsentRecord() !== null;

/** Prior consent for one category. Essential cookies never need it. */
export const hasConsentFor = (category: CookieConsentCategory): boolean =>
  getEffectiveCookiePreferences()[category];

/** True when the banner was closed without a choice earlier in this session. */
export const wasConsentDismissedThisSession = (): boolean => {
  try {
    return sessionStorage.getItem(COOKIE_DISMISSED_KEY) === 'true';
  } catch {
    return false;
  }
};

/**
 * Record the banner being closed without a choice. Deliberately sessionStorage:
 * it keeps the banner out of the way for this visit without being treated as
 * consent, so the choice is put to the user again next time.
 */
export const markConsentDismissed = () => {
  try {
    sessionStorage.setItem(COOKIE_DISMISSED_KEY, 'true');
  } catch {
    // Non-fatal: the banner just reappears on the next page load.
  }
};

/** Persist a choice, with the timestamp and version that make it evidence of consent. */
export const saveConsentRecord = (
  preferences: CookiePreferences,
  status: CookieConsentStatus,
): StoredConsent => {
  const record: StoredConsent = {
    version: COOKIE_CONSENT_VERSION,
    status,
    timestamp: new Date().toISOString(),
    preferences,
  };

  try {
    localStorage.setItem(COOKIE_CONSENT_RECORD_KEY, JSON.stringify(record));
    // Kept in sync for anything still reading the older keys.
    localStorage.setItem(COOKIE_CONSENT_KEY, 'true');
    localStorage.setItem(COOKIE_PREFERENCES_KEY, JSON.stringify(preferences));
    sessionStorage.removeItem(COOKIE_DISMISSED_KEY);
  } catch {
    // Storage unavailable (private mode, quota): the session simply stays in its
    // current, consent-free state rather than assuming opt-in.
  }

  return record;
};

/** Erase the stored choice entirely, e.g. to withdraw consent. */
export const clearConsentRecord = () => {
  try {
    localStorage.removeItem(COOKIE_CONSENT_RECORD_KEY);
    localStorage.removeItem(COOKIE_CONSENT_KEY);
    localStorage.removeItem(COOKIE_PREFERENCES_KEY);
    sessionStorage.removeItem(COOKIE_DISMISSED_KEY);
  } catch {
    // Nothing to do — treated as no consent either way.
  }
};

/** Announce the current effective preferences to anything gating on consent. */
export const notifyConsentChanged = (preferences: CookiePreferences) => {
  window.dispatchEvent(new CustomEvent(COOKIE_CONSENT_EVENT, { detail: preferences }));
};

/** Re-open the banner, e.g. from a "Cookie settings" link, so consent can be withdrawn. */
export const openCookieSettings = () => {
  window.dispatchEvent(new CustomEvent(COOKIE_SETTINGS_EVENT));
};

/** Subscribe to consent changes; returns the effective preferences. */
export const useCookieConsent = (): CookiePreferences => {
  // Starts denied and syncs after mount, so a server/first paint never assumes consent.
  const [prefs, setPrefs] = useState<CookiePreferences>(DENY_ALL);

  useEffect(() => {
    setPrefs(getEffectiveCookiePreferences());
    const sync = () => setPrefs(getEffectiveCookiePreferences());
    window.addEventListener(COOKIE_CONSENT_EVENT, sync);
    return () => window.removeEventListener(COOKIE_CONSENT_EVENT, sync);
  }, []);

  return prefs;
};
