/**
 * react-i18next stand-in for explorer tests: returns the English default with
 * {{interpolation}}, so assertions read like the real UI.
 */
type Opts = Record<string, unknown> & { defaultValue?: string };

const interpolate = (s: string, o: Opts = {}) => s.replace(/\{\{(\w+)\}\}/g, (_, k) => String(o[k] ?? ''));

export const t = (key: string, a?: string | Opts, b?: Opts): string => {
  if (typeof a === 'string') return interpolate(a, b);
  if (a && typeof a.defaultValue === 'string') return interpolate(a.defaultValue, a);
  return key;
};

const i18nMock = {
  useTranslation: () => ({ t, i18n: { language: 'en', changeLanguage: () => Promise.resolve() } }),
  Trans: ({ children }: { children: unknown }) => children,
  initReactI18next: { type: '3rdParty', init: () => undefined },
};

export default i18nMock;
