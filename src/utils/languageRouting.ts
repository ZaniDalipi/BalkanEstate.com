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
 * Navigate to a path with the current language prefix
 */
export function navigateWithLanguage(path: string, options?: { replace?: boolean }): void {
  const localizedPath = buildLocalizedPath(path);

  if (options?.replace) {
    window.history.replaceState({}, '', localizedPath);
  } else {
    window.history.pushState({}, '', localizedPath);
  }

  // Dispatch popstate event to trigger route handling
  window.dispatchEvent(new PopStateEvent('popstate'));
}

/**
 * Change language and update URL
 * Preserves query parameters when changing language
 */
export function changeLanguageWithUrl(newLang: LanguageCode): void {
  const currentPath = window.location.pathname;
  const { path } = parseLanguageFromPath(currentPath);
  // Preserve query parameters
  const queryString = window.location.search;

  // Update URL immediately for responsive feel
  const newPath = buildLocalizedPath(path, newLang) + queryString;
  window.history.replaceState({}, '', newPath);
  localStorage.setItem('balkanestate_language', newLang);

  // Load language bundle then switch (falls back to English until loaded)
  loadLanguageResources(newLang).then(() => {
    i18n.changeLanguage(newLang);
  });
}

/**
 * Initialize language from URL on app load
 * Returns the detected language and clean path
 * Preserves query parameters when redirecting to add language prefix
 */
export function initializeLanguageFromUrl(): { lang: LanguageCode; path: string } {
  const { lang, path } = parseLanguageFromPath(window.location.pathname);
  // Preserve query parameters (e.g., ?token=xxx for password reset)
  const queryString = window.location.search;

  if (lang && isLanguageSupported(lang)) {
    // URL has valid language prefix - use it
    localStorage.setItem('balkanestate_language', lang);
    // Load bundle async then switch (English shown briefly if non-en)
    loadLanguageResources(lang).then(() => {
      i18n.changeLanguage(lang);
    });
    return { lang, path };
  }

  // No language in URL - get from storage or browser
  const storedLang = localStorage.getItem('balkanestate_language');
  const browserLang = navigator.language.split('-')[0];
  const detectedLang: LanguageCode =
    (storedLang && isLanguageSupported(storedLang) ? storedLang :
     isLanguageSupported(browserLang) ? browserLang : 'en') as LanguageCode;

  // Redirect to language-prefixed URL, preserving query parameters
  const newPath = buildLocalizedPath(path, detectedLang) + queryString;
  window.history.replaceState({}, '', newPath);

  localStorage.setItem('balkanestate_language', detectedLang);
  // Load bundle async then switch
  loadLanguageResources(detectedLang).then(() => {
    i18n.changeLanguage(detectedLang);
  });

  return { lang: detectedLang, path };
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
