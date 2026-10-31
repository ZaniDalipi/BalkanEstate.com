import { JSONPath } from 'jsonpath-plus';

export const queryFirst = (data: unknown, path: string): unknown => {
  const result = JSONPath({ path, json: data as object, wrap: false }) as unknown;
  return result;
};

/**
 * Common id-shaped keys we try when the configured idPath misses. Sources
 * exported with Mongo Extended JSON, partner APIs that use `_id`/`uid`,
 * and ad-hoc samples without any id field all need to land on a stable
 * identifier so upserts stay idempotent across runs.
 */
const ID_FALLBACK_KEYS = ['id', '_id', 'uid', 'uuid', 'listing_id', 'property_id', 'listingId', 'propertyId', 'sku', 'reference'];

const extractIdFromObject = (item: Record<string, unknown>): string | null => {
  for (const key of ID_FALLBACK_KEYS) {
    const v = item[key];
    if (v == null) continue;
    if (typeof v === 'string' || typeof v === 'number') return String(v);
    // Mongo extended JSON: { $oid: '...' }
    if (typeof v === 'object' && !Array.isArray(v) && typeof (v as Record<string, unknown>).$oid === 'string') {
      return (v as Record<string, string>).$oid;
    }
  }
  return null;
};

/**
 * Resolve a stable id for an item. Tries the configured JSONPath first,
 * then falls back to common id keys, then to a hash of the JSON. The
 * synthetic-index suffix is used only as a last resort so the same item
 * gets the same id across runs whenever possible (idempotent upsert).
 */
export const resolveItemId = (item: unknown, idPath: string, syntheticIdx: number): string => {
  const raw = queryFirst(item, idPath);
  if (raw != null) {
    if (typeof raw === 'string' || typeof raw === 'number') return String(raw);
    if (typeof raw === 'object' && typeof (raw as Record<string, unknown>).$oid === 'string') {
      return (raw as Record<string, string>).$oid;
    }
  }
  if (item && typeof item === 'object' && !Array.isArray(item)) {
    const fallback = extractIdFromObject(item as Record<string, unknown>);
    if (fallback) return fallback;
  }
  // Last resort: deterministic hash of the JSON so the same item maps to
  // the same id across runs even when no id field exists.
  try {
    const json = JSON.stringify(item);
    let h = 0;
    for (let i = 0; i < json.length; i++) h = ((h << 5) - h + json.charCodeAt(i)) | 0;
    return `synthetic-${(h >>> 0).toString(36)}`;
  } catch {
    return `synthetic-${syntheticIdx}`;
  }
};

export const queryArray = (data: unknown, path: string): unknown[] => {
  const result = JSONPath({ path, json: data as object }) as unknown[];
  if (Array.isArray(result) && result.length === 1 && Array.isArray(result[0])) return result[0] as unknown[];
  return Array.isArray(result) ? result : [];
};

