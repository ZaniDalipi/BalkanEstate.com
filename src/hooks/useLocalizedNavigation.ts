/**
 * Hook for localized navigation
 * Provides navigation functions that automatically include the language prefix
 * and set transition direction for smooth page animations.
 */

import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { buildLocalizedPath, changeLanguageWithUrl, getCurrentLanguageFromUrl } from '@/src/utils/languageRouting';
import { LanguageCode } from '@/src/i18n';
import { useNavigationDirection } from '@/src/components/ui/ViewTransition';

type TransitionDirection = 'forward' | 'back' | 'up' | 'morph';

export function useLocalizedNavigation() {
  const { i18n } = useTranslation();
  const { setDirection } = useNavigationDirection();

  /**
   * Get a localized path (includes current language prefix)
   */
  const getLocalizedPath = useCallback((path: string): string => {
    return buildLocalizedPath(path, i18n.language as LanguageCode);
  }, [i18n.language]);

  /**
   * Navigate to a path with language prefix.
   * Optionally specify a transition direction for page animations.
   */
  const navigate = useCallback((path: string, options?: { replace?: boolean; direction?: TransitionDirection }) => {
    const localizedPath = buildLocalizedPath(path, i18n.language as LanguageCode);

    // Set the transition direction before the navigation fires
    if (options?.direction) {
      setDirection(options.direction);
    }

    if (options?.replace) {
      window.history.replaceState({}, '', localizedPath);
    } else {
      window.history.pushState({}, '', localizedPath);
    }

    // Dispatch popstate to trigger route handling. The current history state
    // has to ride along: listeners that classify back vs forward read the
    // navigation index off it, and a bare `new PopStateEvent('popstate')`
    // carries `state: null`, which reads as a step backwards.
    window.dispatchEvent(new PopStateEvent('popstate', { state: window.history.state }));
  }, [i18n.language, setDirection]);

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
