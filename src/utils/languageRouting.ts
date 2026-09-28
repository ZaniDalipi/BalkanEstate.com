/**
 * Language-based URL Routing Utilities
 * Handles language prefixes in URLs like /en/search, /sq/agencies, etc.
 */

import i18n from '@/src/i18n';
import { languages, LanguageCode, isLanguageSupported, loadLanguageResources } from '@/src/i18n';

// Supported language codes for URL matching
export const SUPPORTED_LANG_CODES = languages.map(l => l.code);
const LANG_PATTERN = new RegExp(`^/(${SUPPORTED_LANG_CODES.join('|')})(/|$)`);

/**
 * Extract language code and path from URL
 * e.g., "/en/search" => { lang: "en", path: "/search" }
 * e.g., "/search" => { lang: null, path: "/search" }
 */
export function parseLanguageFromPath(pathname: string): { lang: LanguageCode | null; path: string } {
  const match = pathname.match(LANG_PATTERN);

  if (match) {
    const lang = match[1] as LanguageCode;
    // Remove the language prefix from the path
    // match[0] could be "/en/" or "/en" (end of string)
    // We need to get everything after the language code
    const langPrefixLength = 1 + lang.length; // "/" + "en" = 3
    let path = pathname.slice(langPrefixLength) || '/';
    // Ensure path starts with /
    if (!path.startsWith('/')) {
      path = '/' + path;
    }
    return { lang, path };
  }

  return { lang: null, path: pathname };
}

/**
 * Build a localized URL path
 * e.g., buildLocalizedPath("/search", "en") => "/en/search"
 * e.g., buildLocalizedPath("/", "sq") => "/sq"
 */
export function buildLocalizedPath(path: string, lang?: LanguageCode): string {
  // Normalize language: i18n.language can be a full locale like 'en-US',
  // extract the 2-letter code and validate it against supported languages
  const raw = lang || i18n.language || 'en';
  const short = raw.split('-')[0];
  const language = (SUPPORTED_LANG_CODES.includes(short as LanguageCode) ? short : 'en') as LanguageCode;

  // Remove any existing language prefix first
  const { path: cleanPath } = parseLanguageFromPath(path);

  // Handle root path
  if (cleanPath === '/') {
    return `/${language}`;
  }

  return `/${language}${cleanPath}`;
}

/**
 * The language to use when the URL does not name one: the user's last choice,
 * then the browser's, then English.
 */
export function detectPreferredLanguage(): LanguageCode {
  let stored: string | null = null;
  try {
    stored = localStorage.getItem('balkanestate_language');
  } catch {
    // Storage blocked (private mode): fall through to the browser language.
  }
  const browserLang = (typeof navigator !== 'undefined' ? navigator.language : 'en').split('-')[0];
  if (stored && isLanguageSupported(stored)) return stored as LanguageCode;
  if (isLanguageSupported(browserLang)) return browserLang as LanguageCode;
  return 'en';
}

/**
 * Make `lang` — the language the URL names — the active one: remember it, and
 * load its bundle before switching so text never flashes through the keys.
 *
 * Only switches when it actually differs: `i18n.changeLanguage()` with the
 * same value still fires 'languageChanged', which re-renders every
 * `useTranslation()` consumer — visible as a "page refresh" a moment after load.
 */
export function activateLanguage(lang: LanguageCode): void {
  try {
    localStorage.setItem('balkanestate_language', lang);
  } catch {
    // Storage blocked: the URL still carries the language.
  }
  const current = (i18n.language || 'en').split('-')[0];
  if (current === lang) return;
  loadLanguageResources(lang).then(() => {
    // Re-check after the async load to guard against a concurrent switch.
    const now = (i18n.language || 'en').split('-')[0];
    if (now !== lang) i18n.changeLanguage(lang);
  });
}

/**
 * Get current language from URL or i18n
 */
export function getCurrentLanguageFromUrl(): LanguageCode {
  const { lang } = parseLanguageFromPath(window.location.pathname);
  if (lang) return lang;
  // Normalize: i18n.language can be 'en-US', extract 2-letter code
  const short = (i18n.language || 'en').split('-')[0];
  return (SUPPORTED_LANG_CODES.includes(short as LanguageCode) ? short : 'en') as LanguageCode;
}
