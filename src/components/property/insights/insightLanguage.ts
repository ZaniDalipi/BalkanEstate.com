// Language names the AI report can be written in, keyed by UI language code.
// The server allow-lists the same names (backend neighborhoodInsightValidation).

export const INSIGHT_LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  sq: 'Albanian',
  mk: 'Macedonian',
  sr: 'Serbian',
  hr: 'Croatian',
  sl: 'Slovenian',
  bs: 'Bosnian',
  me: 'Montenegrin',
  bg: 'Bulgarian',
  ro: 'Romanian',
  el: 'Greek',
  tr: 'Turkish',
  de: 'German',
  it: 'Italian',
  fr: 'French',
};

/** "sq-AL" → "Albanian"; anything unknown falls back to English. */
export function insightLanguageName(uiLanguage: string | undefined): string {
  const code = uiLanguage?.split('-')[0] ?? 'en';
  return INSIGHT_LANGUAGE_NAMES[code] ?? 'English';
}
