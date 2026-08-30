/**
 * Place-name normalisation.
 *
 * Balkan place names are written with diacritics (Vlorë, Himarë, Dhërmi,
 * Bečići, Kaštela) but are typed by users — and stored in this codebase — in
 * plain ASCII (Vlore, Himare, Dhermi, Becici, Kastela). Every lookup and match
 * in the geo layer goes through `normalizePlaceName` so the two spellings are
 * the same key.
 */

/**
 * Latin transliterations that Unicode decomposition alone does not produce.
 * `ë → e` falls out of NFD, but `đ`, `ł` and `ß` carry no combining mark.
 */
const TRANSLITERATIONS: Record<string, string> = {
  đ: 'd',
  ð: 'd',
  ł: 'l',
  ø: 'o',
  æ: 'ae',
  œ: 'oe',
  ß: 'ss',
  ъ: 'a',
};

/**
 * Lowercase, strip diacritics, collapse punctuation and whitespace.
 * `"  Dhërmi/Drimades "` → `"dhermi drimades"`.
 */
export const normalizePlaceName = (value: string): string => {
  if (!value) return '';

  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đðłøæœßъ]/g, (char) => TRANSLITERATIONS[char] ?? char)
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
};

/** True when `haystack` contains `needle` as a whole word or word prefix. */
export const matchesPlaceToken = (haystack: string, needle: string): boolean => {
  if (!needle) return false;
  if (haystack === needle) return true;
  if (haystack.startsWith(`${needle} `)) return true;
  return haystack.includes(` ${needle}`);
};
