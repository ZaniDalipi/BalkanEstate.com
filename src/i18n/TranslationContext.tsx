import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Language, DEFAULT_LANGUAGE, getPreferredLanguage, setPreferredLanguage } from './config';

// Translation structure types
type TranslationValue = string | { [key: string]: TranslationValue };
type Translations = { [key: string]: TranslationValue };

interface TranslationContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  isLoading: boolean;
}

const TranslationContext = createContext<TranslationContextType | undefined>(undefined);

// Cache for loaded translations
const translationCache: { [lang: string]: Translations } = {};

// Load translations for a language
const loadTranslations = async (lang: Language): Promise<Translations> => {
  if (translationCache[lang]) {
    return translationCache[lang];
  }

  try {
    // Load all translation files for the language
    const modules = [
      'common',
      'exploreCities',
      'agencies',
      'agencyDetails',
      'agents',
      'agentCard',
      'agentProfile',
      'newListing',
      'subscription',
    ];

    const translations: Translations = {};

    await Promise.all(
      modules.map(async (module) => {
        try {
          const response = await fetch(`/locales/${lang}/${module}.json`);
          if (response.ok) {
            const data = await response.json();
            translations[module] = data;
          }
        } catch (err) {
          // Warning removed
        }
      })
    );

    translationCache[lang] = translations;
    return translations;
  } catch (error) {
    // Error removed
    return {};
  }
};

// Get nested value from object using dot notation
const getNestedValue = (obj: Translations, path: string): string | undefined => {
  const keys = path.split('.');
  let current: TranslationValue = obj;

  for (const key of keys) {
    if (current && typeof current === 'object' && key in current) {
      current = (current as { [key: string]: TranslationValue })[key];
    } else {
      return undefined;
    }
  }

  return typeof current === 'string' ? current : undefined;
};

// Replace parameters in translation string
const interpolate = (text: string, params?: Record<string, string | number>): string => {
  if (!params) return text;

  return text.replace(/\{(\w+)\}/g, (match, key) => {
    return params[key] !== undefined ? String(params[key]) : match;
  });
};

interface TranslationProviderProps {
  children: ReactNode;
}

export const TranslationProvider: React.FC<TranslationProviderProps> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(DEFAULT_LANGUAGE);
  const [translations, setTranslations] = useState<Translations>({});
  const [isLoading, setIsLoading] = useState(true);

  // Load translations when language changes
  useEffect(() => {
    const loadLang = async () => {
      setIsLoading(true);
      const trans = await loadTranslations(language);
      setTranslations(trans);
      setIsLoading(false);
    };

    loadLang();
  }, [language]);

  // Initialize with preferred language
  useEffect(() => {
    const preferred = getPreferredLanguage();
    setLanguageState(preferred);
  }, []);

  // Set language and save preference
  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    setPreferredLanguage(lang);
  }, []);

  // Translation function
  const t = useCallback(
    (key: string, params?: Record<string, string | number>): string => {
      // Try to get translation from loaded translations
      const value = getNestedValue(translations, key);

      if (value) {
        return interpolate(value, params);
      }

      // Fallback: try English translations
      if (language !== 'en' && translationCache['en']) {
        const englishValue = getNestedValue(translationCache['en'], key);
        if (englishValue) {
          return interpolate(englishValue, params);
        }
      }

      // Last resort: return the key
      // Warning removed
      return key;
    },
    [translations, language]
  );

  return (
    <TranslationContext.Provider value={{ language, setLanguage, t, isLoading }}>
      {children}
    </TranslationContext.Provider>
  );
};

// Custom hook to use translations
export const useTranslation = (): TranslationContextType => {
  const context = useContext(TranslationContext);
  if (!context) {
    throw new Error('useTranslation must be used within a TranslationProvider');
  }
  return context;
};

export default TranslationContext;
