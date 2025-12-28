/**
 * Hook for localized navigation
 * Provides navigation functions that automatically include the language prefix
 */

import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { buildLocalizedPath, changeLanguageWithUrl, getCurrentLanguageFromUrl } from '@/src/utils/languageRouting';
import { LanguageCode } from '@/src/i18n';

export function useLocalizedNavigation() {
  const { i18n } = useTranslation();

  /**
   * Get a localized path (includes current language prefix)
   */
  const getLocalizedPath = useCallback((path: string): string => {
    return buildLocalizedPath(path, i18n.language as LanguageCode);
  }, [i18n.language]);

  /**
   * Navigate to a path with language prefix
   */
  const navigate = useCallback((path: string, options?: { replace?: boolean }) => {
    const localizedPath = buildLocalizedPath(path, i18n.language as LanguageCode);

    if (options?.replace) {
      window.history.replaceState({}, '', localizedPath);
    } else {
      window.history.pushState({}, '', localizedPath);
    }

    // Dispatch popstate event to trigger route handling
    window.dispatchEvent(new PopStateEvent('popstate'));
  }, [i18n.language]);

  /**
   * Change the language and update the URL
   */
  const changeLanguage = useCallback((newLang: LanguageCode) => {
    changeLanguageWithUrl(newLang);
  }, []);

  /**
   * Get current language from URL
   */
  const currentLanguage = getCurrentLanguageFromUrl();

  return {
    getLocalizedPath,
    navigate,
    changeLanguage,
    currentLanguage,
  };
}

export default useLocalizedNavigation;
