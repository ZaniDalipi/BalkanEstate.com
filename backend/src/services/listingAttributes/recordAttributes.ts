import { applyAttribute, type MappedListing } from './applyAttribute';
import { fieldForFeedKey, type AttributeField } from './labelMap';

/**
 * Attribute-by-attribute mapping of a structured feed record (JSON API item,
 * parsed XML element, embedded page state…).
 *
 * Walks every key of the record, recognises it with the multilingual
 * dictionary and fills the matching canonical field when it is still empty.
 * Understands the shapes feeds use for attributes:
 *
 *   { bathrooms: 2 }                                  plain key
 *   { num_bathrooms: "2" }, { bedroomsCount: 3 }       prefixed / suffixed key
 *   { surface_area: { built: 120, plot: 500 } }        nested group (parent + key)
 *   { price: { _: "150000", currency: "EUR" } }        XML text node with attributes
 *   { attributes: [{ name: "Kupatila", value: "2" }] } name / value lists
 *
 * Never overwrites a field the configured field map already set.
 */

const SKIP_KEYS = new Set([
  'detailhtml', 'html', 'description', 'desc', 'content', 'body', 'images', 'image', 'photos', 'gallery', 'media',
  // Nested people / companies carry their own address and id — not the listing's.
  'agent', 'agents', 'agency', 'seller', 'owner', 'user', 'contact', 'broker', 'company', 'office', 'publisher',
]);
/** Keys holding a street address. The page dictionary files these under city; a feed keeps them apart. */
const ADDRESS_KEYS = new Set(['address', 'adresa', 'adresse', 'адреса', 'адрес', 'indirizzo', 'street', 'streetaddress', 'ulica']);
const NAME_KEYS = ['name', 'label', 'key', 'title', 'attribute', 'naziv', 'code'];
const VALUE_KEYS = ['value', 'val', 'text', 'vrijednost', 'vrednost', '_', '#text', '$t', 'amount'];
/** Fields where a vague key like "address" or "location" must not beat a precise one like "city". */
const WEAK_KEYS = new Set(['location', 'lokacija', 'district', 'place']);
const MAX_DEPTH = 5;
const MAX_VALUE_LENGTH = 200;

interface Pair { field: AttributeField; value: string; weak: boolean }

const lower = (k: string): string => k.toLowerCase().replace(/[^\p{L}\d]/gu, '');

/** Text of a primitive, or of an XML-style `{ _: text, attr: … }` / `{ value: … }` object. */
const scalarOf = (v: unknown): string | undefined => {
  if (v == null) return undefined;
  if (typeof v === 'string') {
    const t = v.trim();
    return t && t.length <= MAX_VALUE_LENGTH ? t : undefined;
  }
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : undefined;
  if (Array.isArray(v)) return v.length === 1 ? scalarOf(v[0]) : undefined;
  if (typeof v === 'object') {
    const o = v as Record<string, unknown>;
    for (const k of VALUE_KEYS) if (k in o) return scalarOf(o[k]);
  }
  return undefined;
};

/** Booleans mean something for a few fields: `parking: true`, `furnished: false`. */
const booleanValue = (field: AttributeField, v: boolean): string | undefined => {
  if (field === 'parking') return v ? '1' : undefined;
  if (field === 'furnishing') return v ? 'furnished' : 'unfurnished';
  return undefined;
};

const toPair = (key: string, value: unknown, parentKey?: string): Pair | null => {
  const field = ADDRESS_KEYS.has(lower(key))
    ? 'address'
    : (parentKey && fieldForFeedKey(`${parentKey}_${key}`)) || fieldForFeedKey(key);
  if (!field) return null;
  const text = typeof value === 'boolean' ? booleanValue(field, value) : scalarOf(value);
  if (!text) return null;
  return { field, value: text, weak: WEAK_KEYS.has(lower(key)) };
};

/** `[{ name: "Bathrooms", value: 2 }, …]` → pairs. */
const pairsFromNameValueList = (list: unknown[]): Pair[] => {
  const out: Pair[] = [];
  for (const entry of list) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) continue;
    const o = entry as Record<string, unknown>;
    const nameKey = NAME_KEYS.find((k) => typeof scalarOf(o[k]) === 'string');
    const valueKey = VALUE_KEYS.find((k) => k in o && k !== nameKey);
    if (!nameKey || !valueKey) continue;
    const pair = toPair(String(scalarOf(o[nameKey])), o[valueKey]);
    if (pair) out.push(pair);
  }
  return out;
};

const collectPairs = (node: unknown, depth: number, parentKey: string | undefined, out: Pair[]): void => {
  if (depth > MAX_DEPTH || node == null || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    out.push(...pairsFromNameValueList(node));
    return;
  }
  for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
    if (SKIP_KEYS.has(lower(key))) continue;
    const pair = toPair(key, value, parentKey);
    if (pair) {
      out.push(pair);
      continue;
    }
    if (value && typeof value === 'object') collectPairs(value, depth + 1, key, out);
  }
};

/** Every attribute the record carries, as canonical field / text pairs (precise keys first). */
export const extractRecordAttributes = (record: unknown): Pair[] => {
  const pairs: Pair[] = [];
  collectPairs(record, 0, undefined, pairs);
  return [...pairs.filter((p) => !p.weak), ...pairs.filter((p) => p.weak)];
};

/** Fill the still-empty fields of `target` from the record's attributes. Returns `target`. */
export const fillFromRecordAttributes = (record: unknown, target: MappedListing): MappedListing => {
  for (const { field, value } of extractRecordAttributes(record)) applyAttribute(target, field, value);
  return target;
};
