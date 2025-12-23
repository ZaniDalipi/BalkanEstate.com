// i18n Module Exports
export { TranslationProvider, useTranslation } from './TranslationContext';
export { default as LanguageSelector } from './LanguageSelector';
export {
  SUPPORTED_LANGUAGES,
  DEFAULT_LANGUAGE,
  getLanguageInfo,
  getPreferredLanguage,
  setPreferredLanguage,
} from './config';
export type { Language, LanguageInfo } from './config';
