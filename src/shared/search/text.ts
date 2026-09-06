/**
 * Text folding for the search engine.
 *
 * A Balkan property portal is typed into in a dozen spellings of the same
 * word. "Vlorë", "Vlore" and "vlora" are one city; "Београд", "Beograd" and
 * "Belgrade" are one city; "Σκόπια" and "Skopje" are one city. Every string
 * that enters the engine — query, listing address, place name — is folded to
 * the same lowercase ASCII form first, so matching never has to care which
 * keyboard the user has.
 *
 * The fold is deliberately lossy and one-way. It is a matching key, never a
 * label: what the user *sees* comes from `@/shared/geo/placeNames`, which
 * keeps the local spelling with its diacritics intact.
 */

/**
 * Latin letters that carry no combining mark, so NFD decomposition leaves
 * them alone. `ë → e` falls out of NFD; `đ → d` has to be spelled out.
 */
const LATIN_FOLD: Record<string, string> = {
  đ: 'd',
  ð: 'd',
  ł: 'l',
  ø: 'o',
  æ: 'ae',
  œ: 'oe',
  ß: 'ss',
  þ: 'th',
};

/**
 * Cyrillic → Latin, following the standard Serbian/Macedonian pairing
 * (Gaj's alphabet) and then folded again by the Latin pass, so `ш → š → s`
 * arrives as plain ASCII. Digraphs come first because a single Cyrillic
 * letter can produce two Latin ones (`ж → z`, `љ → lj`).
 */
const CYRILLIC_FOLD: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', ђ: 'd', е: 'e', ж: 'z', з: 'z',
  и: 'i', ј: 'j', к: 'k', л: 'l', љ: 'lj', м: 'm', н: 'n', њ: 'nj', о: 'o',
  п: 'p', р: 'r', с: 's', т: 't', ћ: 'c', у: 'u', ф: 'f', х: 'h', ц: 'c',
  ч: 'c', џ: 'd', ш: 's',
  // Macedonian
  ѓ: 'g', ѕ: 'z', ќ: 'k',
  // Bulgarian / Russian letters that appear in Bulgarian place names
  й: 'i', щ: 'st', ъ: 'a', ь: '', ю: 'ju', я: 'ja', ы: 'i', э: 'e',
};

/**
 * Greek → Latin, using the transliteration Greek place names are marketed
 * under (Αθήνα → athina, Θεσσαλονίκη → thessaloniki). Accented vowels are
 * stripped by NFD before this table is consulted.
 */
const GREEK_FOLD: Record<string, string> = {
  α: 'a', β: 'v', γ: 'g', δ: 'd', ε: 'e', ζ: 'z', η: 'i', θ: 'th', ι: 'i',
  κ: 'k', λ: 'l', μ: 'm', ν: 'n', ξ: 'x', ο: 'o', π: 'p', ρ: 'r', σ: 's',
  ς: 's', τ: 't', υ: 'y', φ: 'f', χ: 'ch', ψ: 'ps', ω: 'o',
};

const SCRIPT_FOLD: Record<string, string> = { ...LATIN_FOLD, ...CYRILLIC_FOLD, ...GREEK_FOLD };
const SCRIPT_FOLD_PATTERN = new RegExp(`[${Object.keys(SCRIPT_FOLD).join('')}]`, 'g');

/**
 * Fold a string to its lowercase ASCII matching key, keeping word breaks as
 * single spaces: `"  Fushë-Krujë "` → `"fushe kruje"`.
 *
 * Digits survive — house numbers and listing references are searchable.
 */
export const foldText = (value: string): string => {
  if (!value) return '';

  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(SCRIPT_FOLD_PATTERN, (char) => SCRIPT_FOLD[char] ?? char)
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
};

/**
 * Words the engine drops from a query because they carry no signal in this
 * domain — every listing is a property in a place, so "property in Budva"
 * and "Budva" are the same search. Kept deliberately short: a stop word list
 * that grows starts eating real place names (Bar in Montenegro, Prizren's
 * "Ura", the Croatian "Grad").
 */
const STOP_WORDS = new Set([
  'a', 'an', 'the', 'in', 'at', 'on', 'of', 'for', 'to', 'and', 'with', 'near',
  'me', 'my',
  // Domain filler
  'property', 'properties', 'listing', 'listings', 'estate', 'real',
  'buy', 'sale', 'sell', 'rent', 'rental',
  // Balkan-language equivalents of "in"/"the"
  'ne', 'na', 'u', 'v', 'vo', 'se', 'te',
]);

export const isStopWord = (token: string): boolean => STOP_WORDS.has(token);

/** Split folded text into its word tokens. */
export const tokenize = (value: string): string[] => {
  const folded = foldText(value);
  return folded ? folded.split(' ') : [];
};

/**
 * Query tokens: folded words with filler removed.
 *
 * Stop words are only dropped when something else survives — a user who
 * types just "rent" still gets a search rather than an empty one.
 */
export const tokenizeQuery = (value: string): string[] => {
  const tokens = tokenize(value);
  const meaningful = tokens.filter((token) => !isStopWord(token));
  return meaningful.length > 0 ? meaningful : tokens;
};

/**
 * Fold a string while remembering where every folded character came from.
 *
 * Highlighting needs this: the engine matches against the folded key, but the
 * bold has to land on the original text the user is looking at — and the two
 * are not the same length, because folding strips diacritics, collapses runs
 * of punctuation and turns one letter into two (`љ → lj`). `offsets[i]` is
 * the index in `value` that produced `folded[i]`.
 */
export interface FoldedWithOffsets {
  folded: string;
  offsets: number[];
}

export const foldWithOffsets = (value: string): FoldedWithOffsets => {
  const folded: string[] = [];
  const offsets: number[] = [];

  for (let index = 0; index < value.length; index += 1) {
    const decomposed = value[index].toLowerCase().normalize('NFD');

    for (const char of decomposed) {
      if (char >= '\u0300' && char <= '\u036f') continue; // combining mark

      const mapped = SCRIPT_FOLD[char] ?? char;
      for (const out of mapped) {
        if (/[a-z0-9]/.test(out)) {
          folded.push(out);
          offsets.push(index);
        } else if (folded.length > 0 && folded[folded.length - 1] !== ' ') {
          // Any run of non-alphanumerics becomes the single space that
          // `foldText` would have produced.
          folded.push(' ');
          offsets.push(index);
        }
      }
    }
  }

  // Match `foldText`'s trim.
  while (folded.length > 0 && folded[folded.length - 1] === ' ') {
    folded.pop();
    offsets.pop();
  }

  return { folded: folded.join(''), offsets };
};
