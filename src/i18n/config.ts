// i18n Configuration for BalkanEstate
// Supports multiple Balkan languages

export type Language =
  | 'en'  // English
  | 'sq'  // Albanian (Shqip)
  | 'mk'  // Macedonian
  | 'sr'  // Serbian
  | 'bs'  // Bosnian
  | 'hr'  // Croatian
  | 'me'  // Montenegrin
  | 'el'  // Greek
  | 'bg'  // Bulgarian
  | 'ro'; // Romanian

export interface LanguageInfo {
  code: Language;
  name: string;
  nativeName: string;
  flag: string;
}

export const SUPPORTED_LANGUAGES: LanguageInfo[] = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧' },
  { code: 'sq', name: 'Albanian', nativeName: 'Shqip', flag: '🇦🇱' },
  { code: 'mk', name: 'Macedonian', nativeName: 'Македонски', flag: '🇲🇰' },
  { code: 'sr', name: 'Serbian', nativeName: 'Српски', flag: '🇷🇸' },
  { code: 'bs', name: 'Bosnian', nativeName: 'Bosanski', flag: '🇧🇦' },
  { code: 'hr', name: 'Croatian', nativeName: 'Hrvatski', flag: '🇭🇷' },
  { code: 'me', name: 'Montenegrin', nativeName: 'Crnogorski', flag: '🇲🇪' },
  { code: 'el', name: 'Greek', nativeName: 'Ελληνικά', flag: '🇬🇷' },
  { code: 'bg', name: 'Bulgarian', nativeName: 'Български', flag: '🇧🇬' },
  { code: 'ro', name: 'Romanian', nativeName: 'Română', flag: '🇷🇴' },
];

export const DEFAULT_LANGUAGE: Language = 'en';

// Get language info by code
export const getLanguageInfo = (code: Language): LanguageInfo | undefined => {
  return SUPPORTED_LANGUAGES.find(lang => lang.code === code);
};

// Get browser's preferred language or default
export const getPreferredLanguage = (): Language => {
  if (typeof window === 'undefined') return DEFAULT_LANGUAGE;

  const stored = localStorage.getItem('balkan_estate_language') as Language;
  if (stored && SUPPORTED_LANGUAGES.some(l => l.code === stored)) {
    return stored;
  }

  const browserLang = navigator.language.split('-')[0] as Language;
  if (SUPPORTED_LANGUAGES.some(l => l.code === browserLang)) {
    return browserLang;
  }

  return DEFAULT_LANGUAGE;
};

// Save language preference
export const setPreferredLanguage = (lang: Language): void => {
  localStorage.setItem('balkan_estate_language', lang);
};
