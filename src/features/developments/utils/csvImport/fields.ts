/**
 * The unit fields an import can fill, with the column names people actually
 * use for them in English, Albanian and the BCMS languages (plus Greek,
 * Bulgarian, Macedonian and Romanian basics). Headers are compared without
 * accents, case or punctuation.
 */
export const IMPORT_FIELDS = [
  'unitNumber',
  'building',
  'floor',
  'unitType',
  'beds',
  'baths',
  'livingRooms',
  'totalArea',
  'netArea',
  'terraceArea',
  'balconies',
  'price',
  'pricePerSqm',
  'currency',
  'availability',
  'orientation',
  'viewType',
  'features',
  'description',
] as const;
export type ImportField = (typeof IMPORT_FIELDS)[number];
/** A column that is deliberately not imported (e.g. computed export columns). */
export const IGNORE = 'ignore' as const;
export type ColumnTarget = ImportField | typeof IGNORE;

/** Most specific first: "price per m2" must win over "price", "net area" over "area". */
export const FIELD_SYNONYMS: [ColumnTarget, string[]][] = [
  [IGNORE, ['effective availability', 'visibility', 'linked listings', 'listings', 'updated']],
  ['pricePerSqm', ['price per m2', 'price m2', 'eur m2', 'price per sqm', 'cijena po m2', 'cena po m2', 'cmimi per m2', 'cmimi m2', 'ppm2']],
  ['netArea', ['net area', 'neto', 'neto povrsina', 'neto kvadratura', 'siperfaqja neto', 'net m2', 'internal area', 'usable area']],
  ['terraceArea', ['terrace area', 'terrace', 'terasa', 'tarraca', 'balcony area', 'povrsina terase']],
  ['livingRooms', ['living rooms', 'living room', 'dnevni boravak', 'dnevna soba', 'dhoma ndenje', 'salon']],
  ['unitNumber', ['unit number', 'unit no', 'unit', 'apartment number', 'apartment no', 'apartment', 'apt', 'flat', 'no', 'nr', 'number', 'broj stana', 'stan', 'oznaka', 'sifra', 'banesa', 'numri i baneses', 'numri', 'njesia', 'apartamenti', 'id']],
  ['building', ['building', 'block', 'blok', 'tower', 'object', 'objekt', 'objekat', 'zgrada', 'lamela', 'ulaz', 'ndertesa', 'kulla', 'objekti', 'blloku']],
  ['floor', ['floor', 'level', 'storey', 'story', 'kat', 'sprat', 'etaz', 'etaza', 'etazh', 'etazhi', 'kati', 'niveli', 'nivo']],
  ['unitType', ['unit type', 'type', 'tip', 'tip stana', 'lloji', 'vrsta', 'kind', 'category']],
  ['beds', ['bedrooms', 'beds', 'bedroom', 'rooms', 'sobe', 'spavace sobe', 'broj soba', 'dhoma gjumi', 'dhoma', 'odaje']],
  ['baths', ['bathrooms', 'baths', 'bathroom', 'kupatila', 'kupatilo', 'kupaonice', 'banjo', 'banje', 'wc', 'tualete']],
  ['balconies', ['balconies', 'balcony', 'balkoni', 'balkon', 'ballkone', 'ballkon']],
  ['totalArea', ['total area', 'area', 'size', 'm2', 'sqm', 'surface', 'gross area', 'povrsina', 'kvadratura', 'siperfaqja', 'siperfaqe', 'quadratura']],
  ['currency', ['currency', 'valuta', 'monedha']],
  ['price', ['price', 'total price', 'cijena', 'cena', 'cmimi', 'iznos', 'vrijednost', 'pret']],
  ['availability', ['availability', 'status', 'statusi', 'dostupnost', 'raspolozivost', 'gjendja', 'disponueshmeria']],
  ['orientation', ['orientation', 'facing', 'orijentacija', 'orientimi', 'strana sveta']],
  ['viewType', ['view', 'pogled', 'pamja', 'pamje']],
  ['features', ['features', 'feature', 'tags', 'karakteristike', 'veçori', 'vecori', 'oprema', 'extras']],
  ['description', ['description', 'notes', 'note', 'opis', 'pershkrimi', 'pershkrim', 'komentar', 'comment']],
];

/** Lowercase, no accents, no punctuation; "m²" and "m^2" read as "m2". */
export const normaliseHeader = (h: string): string =>
  h
    .toLowerCase()
    .replace(/m²|m\^2|sq\.?\s?m/g, 'm2')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[đ]/g, 'd')
    .replace(/[€$/()[\].:#_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/**
 * The best target for each header: an exact synonym first, then a header that
 * contains a synonym as a whole word. Each field is used once (the first
 * column wins); anything unrecognised is ignored.
 */
export const guessColumns = (headers: string[]): ColumnTarget[] => {
  const used = new Set<ColumnTarget>();
  const norm = headers.map(normaliseHeader);
  const result: ColumnTarget[] = headers.map(() => IGNORE);
  const claim = (i: number, target: ColumnTarget) => {
    result[i] = target;
    if (target !== IGNORE) used.add(target);
  };
  const assigned = new Set<number>();
  for (const exact of [true, false]) {
    for (const [target, words] of FIELD_SYNONYMS) {
      if (target !== IGNORE && used.has(target)) continue;
      const variants = words.map(normaliseHeader);
      const i = norm.findIndex((h, idx) => !assigned.has(idx) && variants.some((w) => (exact ? h === w : ` ${h} `.includes(` ${w} `))));
      if (i >= 0) {
        claim(i, target);
        assigned.add(i);
      }
    }
  }
  return result;
};
