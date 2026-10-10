/**
 * Maps an app language code to a BCP-47 locale Intl understands.
 * `me` (Montenegrin) has no Intl data of its own, so it uses Serbian Latin.
 */
export function toIntlLocale(lang: string | undefined): string {
  const code = (lang || 'en').split('-')[0];
  if (code === 'me') return 'sr-Latn-ME';
  if (code === 'sq') return 'sq-AL';
  return code;
}
