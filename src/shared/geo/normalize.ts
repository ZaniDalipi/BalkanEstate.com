import { foldText } from '@/shared/search/text';

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
 * Lowercase, strip diacritics, collapse punctuation and whitespace.
 * `"  Dhërmi/Drimades "` → `"dhermi drimades"`.
 *
 * Delegates to the search layer's `foldText`, which does the same to Latin
 * and also transliterates Cyrillic and Greek. Doing only Latin here — as this
 * did — meant "Ελλάδα" and "Црна Гора" folded to the empty string, so every
 * name in those scripts compared equal to nothing and unequal to itself: a
 * Greek or Macedonian country name was silently dropped from the label it
 * belonged to.
 */
export const normalizePlaceName = (value: string): string => foldText(value);

/** True when `haystack` contains `needle` as a whole word or word prefix. */
export const matchesPlaceToken = (haystack: string, needle: string): boolean => {
  if (!needle) return false;
  if (haystack === needle) return true;
  if (haystack.startsWith(`${needle} `)) return true;
  return haystack.includes(` ${needle}`);
};
