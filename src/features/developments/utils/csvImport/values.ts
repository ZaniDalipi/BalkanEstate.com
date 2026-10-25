/**
 * Read spreadsheet cells the way people write them: "45.000 €", "45,5 m²",
 * "Prizemlje", "Kati 3", "B1", "e lirë", "Prodato"… Every reader returns
 * `undefined` for an empty cell and `null` for a value it cannot understand,
 * so the caller can tell "not given" from "wrong".
 */
import { normaliseHeader } from './fields';

const clean = (s: string) => normaliseHeader(s);

/** "45.000", "45,5", "1.234,56", "1,234.56", "45 000 €" → number. */
export const parseNumber = (raw: string): number | null | undefined => {
  const s = raw.replace(/[\s ']/g, '').replace(/[^\d.,-]/g, '');
  if (!raw.trim()) return undefined;
  if (!/\d/.test(s)) return null;
  const lastDot = s.lastIndexOf('.');
  const lastComma = s.lastIndexOf(',');
  let normalised: string;
  if (lastDot >= 0 && lastComma >= 0) {
    // The later one is the decimal mark.
    normalised = lastComma > lastDot ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
  } else if (lastComma >= 0) {
    // "45,5" decimal; "45,000" thousands.
    normalised = /,\d{3}$/.test(s) && s.indexOf(',') === lastComma && s.length > 4 ? s.replace(',', '') : s.replace(',', '.');
  } else if ((s.match(/\./g) ?? []).length > 1 || /^\d{1,3}\.\d{3}$/.test(s)) {
    // "1.250.000" or "45.000": dots group thousands.
    normalised = s.replace(/\./g, '');
  } else normalised = s;
  const n = Number(normalised);
  return Number.isFinite(n) ? n : null;
};

const GROUND = ['p', 'pr', 'pz', 'g', 'gf', 'ground', 'ground floor', 'prizemlje', 'prizemje', 'perdhese', 'pdh', 'parter', 'partere', 'ισογειο', 'приземље', 'приземје', 'партер'];
const BASEMENT = ['basement', 'b', 'podrum', 'suteren', 'bodrum', 'nentoke', 'garage', 'garaza', 'sub', 'подрум', 'сутерен', 'υπογειο'];

/** A floor cell → level: "Ground floor"/"P" → 0, "B1"/"Podrum" → -1, "Kati 3"/"3. sprat"/"Floor 3" → 3. */
export const parseLevel = (raw: string): number | null | undefined => {
  const s = clean(raw);
  if (!s) return undefined;
  if (GROUND.includes(s)) return 0;
  const num = raw.match(/-?\d+/) ?? s.match(/\d+/);
  const word = s.replace(/-?\d+/g, '').trim();
  if (BASEMENT.includes(word)) return num ? -Math.abs(Number(num[0])) : -1;
  if (num) return Number(num[0]);
  return null;
};

/** The floor encoded in a unit number when there is no floor column: "401" → 4, "T1205" → 12, "A-302" → 3. */
export const levelFromUnitNumber = (unitNumber: string): number | null => {
  const digits = unitNumber.match(/(\d+)\D*$/)?.[1];
  return digits && digits.length >= 3 ? Number(digits.slice(0, -2)) : null;
};

const AVAILABILITY: [string, string[]][] = [
  ['available', ['available', 'free', 'for sale', 'slobodno', 'slobodan', 'slobodan stan', 'dostupno', 'u prodaji', 'e lire', 'lire', 'e lirë', 'ne shitje', 'disponibil', 'διαθεσιμο', 'свободен', 'слободно', 'слободен']],
  ['reserved', ['reserved', 'reservation', 'rezervisano', 'rezervirano', 'rezervisan', 'rezervuar', 'e rezervuar', 'rezervat', 'κρατημενο', 'резервиран', 'резервисано', 'резервирано']],
  ['sold', ['sold', 'prodato', 'prodano', 'prodat', 'prodan', 'shitur', 'e shitur', 'vandut', 'πωληθηκε', 'продаден', 'продато', 'продадено']],
  ['rented', ['rented', 'leased', 'iznajmljeno', 'izdato', 'dhene me qira', 'me qira', 'inchiriat', 'ενοικιαστηκε', 'изнајмено', 'отдаден']],
  ['not_released', ['not released', 'unreleased', 'coming soon', 'u pripremi', 'uskoro', 'ne shpejt', 'jo ne shitje', 'nije u prodaji']],
  ['unavailable', ['unavailable', 'not available', 'nedostupno', 'i padisponueshem', 'indisponibil']],
];

export const parseAvailability = (raw: string): string | null | undefined => {
  const s = clean(raw);
  if (!s) return undefined;
  const match = AVAILABILITY.find(([, words]) => words.some((w) => clean(w) === s));
  return match ? match[0] : null;
};

const UNIT_TYPES: [string, string[]][] = [
  ['studio', ['studio', 'garsonjera', 'garsonjere', 'garsoniera', 'garsoniere', 'garsonijera', 'гарсоњера', 'гарсониера']],
  ['duplex', ['duplex', 'dupleks', 'dupleksi', 'maisonette']],
  ['penthouse', ['penthouse', 'penthaus', 'pentahaus', 'ph']],
  ['retail', ['retail', 'shop', 'store', 'lokal', 'poslovni prostor', 'dyqan', 'dyqani', 'lokali', 'magazin']],
  ['office', ['office', 'kancelarija', 'ured', 'biro', 'zyre', 'zyra', 'birou']],
  ['apartment', ['apartment', 'flat', 'stan', 'banesa', 'banese', 'apartament', 'apartamenti', 'διαμερισμα', 'стан', 'апартамент']],
];

/** Known types become the app's values (so filters and labels work); anything else is kept as written. */
export const parseUnitType = (raw: string): string | undefined => {
  const s = clean(raw);
  if (!s) return undefined;
  return UNIT_TYPES.find(([, words]) => words.some((w) => clean(w) === s || s.startsWith(`${clean(w)} `)))?.[0] ?? raw.trim().toLowerCase();
};

const FEATURES: [string, string[]][] = [
  ['big_terrace', ['big terrace', 'terrace', 'terasa', 'velika terasa', 'tarrace', 'tarraca']],
  ['duplex', ['duplex', 'dupleks']],
  ['penthouse', ['penthouse']],
  ['studio', ['studio', 'garsonjera']],
  ['garden', ['garden', 'basta', 'vrt', 'dvoriste', 'kopsht', 'oborr']],
  ['corner', ['corner', 'corner unit', 'ugaoni', 'kutni', 'qoshe', 'kendor']],
  ['furnished', ['furnished', 'namjesten', 'namesten', 'mobiluar', 'i mobiluar', 'opremljen']],
  ['parking', ['parking', 'garage', 'garaza', 'parking mjesto', 'parkim', 'garazh', 'vend parkimi']],
  ['storage', ['storage', 'ostava', 'spremiste', 'podrum', 'depo', 'magazine', 'bodrum']],
  ['sea_view', ['sea view', 'pogled na more', 'pamje nga deti', 'pamje deti']],
  ['two_sided', ['two sided', 'two-sided', 'dvostran', 'dvostrano', 'dy anesh', 'dyaneshe']],
  ['smart_home', ['smart home', 'pametna kuca', 'shtepi inteligjente']],
];

/** "Terasa, Parking; Ugaoni" → ['big_terrace', 'parking', 'corner'] (unknown words are dropped). */
export const parseFeatures = (raw: string): string[] | undefined => {
  if (!raw.trim()) return undefined;
  const found = raw
    .split(/[,;|/]+/)
    .map((p) => clean(p))
    .filter(Boolean)
    .map((p) => FEATURES.find(([, words]) => words.some((w) => clean(w) === p))?.[0])
    .filter((f): f is string => !!f);
  return [...new Set(found)];
};

/** "€", "eur", "lek", "den", "km" or a currency written in the price cell → ISO code. */
export const parseCurrency = (raw: string): string | undefined => {
  const s = raw.toLowerCase();
  if (/€|eur/.test(s)) return 'EUR';
  if (/\$|usd/.test(s)) return 'USD';
  if (/lek|\ball\b/.test(s)) return 'ALL';
  if (/den|mkd|ден/.test(s)) return 'MKD';
  if (/din|rsd|дин/.test(s)) return 'RSD';
  if (/\bkm\b|bam/.test(s)) return 'BAM';
  if (/lei|ron/.test(s)) return 'RON';
  if (/лв|bgn/.test(s)) return 'BGN';
  const code = s.trim().toUpperCase();
  return /^[A-Z]{3}$/.test(code) ? code : undefined;
};
