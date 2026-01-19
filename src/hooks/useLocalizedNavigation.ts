/**
 * Hook for localized navigation
 * Provides navigation functions that automatically include the language prefix
 * Uses React Router for proper SPA navigation
 */

import { useCallback } from 'react';
import { useNavigate as useRouterNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { buildLocalizedPath, changeLanguageWithUrl, getCurrentLanguageFromUrl } from '@/src/utils/languageRouting';
import { LanguageCode } from '@/src/i18n';

export function useLocalizedNavigation() {
  const { i18n } = useTranslation();
  const routerNavigate = useRouterNavigate();

  /**
   * Get a localized path (includes current language prefix)
   */
  const getLocalizedPath = useCallback((path: string): string => {
    return buildLocalizedPath(path, i18n.language as LanguageCode);
  }, [i18n.language]);

  /**
   * Navigate to a path with language prefix using React Router
   */
  const navigate = useCallback((path: string, options?: { replace?: boolean }) => {
    const localizedPath = buildLocalizedPath(path, i18n.language as LanguageCode);
    routerNavigate(localizedPath, { replace: options?.replace });
  }, [i18n.language, routerNavigate]);

  /**
   * Change the language and update the URL
   */
  const changeLanguage = useCallback((newLang: LanguageCode) => {
    changeLanguageWithUrl(newLang);
    // React Router will detect the URL change via window location
    window.dispatchEvent(new PopStateEvent('popstate'));
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
