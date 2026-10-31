/**
 * The rules for an entrance's fields, as pure functions so they can be tested
 * without a database. Every refusal names the field and carries a code the
 * client translates (`apiErrors.<CODE>`).
 */
import { ENTRANCE_KINDS, type EntranceKind } from '../../config/developments';
import { ValidationError } from './developmentService';

export const ENTRANCE_LIMITS = { name: 120, code: 50, note: 200 } as const;

export const ENTRANCE_FIELDS = ['name', 'code', 'kind', 'accessible', 'note', 'order'] as const;
type EntranceField = (typeof ENTRANCE_FIELDS)[number];

export interface EntranceChanges {
  $set: Partial<{ name: string; code: string; kind: EntranceKind; accessible: boolean; note: string; order: number }>;
  $unset: Partial<Record<'code' | 'note', ''>>;
  touched: EntranceField[];
}

const tooLong = (field: string, max: number) =>
  new ValidationError(`${field} must be at most ${max} characters`, { code: 'FIELD_TOO_LONG', field, params: { max } });

/** Optional text: null or blank clears it. */
const optionalText = (value: unknown, field: 'code' | 'note', out: EntranceChanges): void => {
  if (value === null || (typeof value === 'string' && !value.trim())) {
    out.$unset[field] = '';
    return;
  }
  if (typeof value !== 'string') throw new ValidationError(`${field} must be text`, { code: 'FIELD_INVALID', field });
  const v = value.trim();
  if (v.length > ENTRANCE_LIMITS[field]) throw tooLong(field, ENTRANCE_LIMITS[field]);
  out.$set[field] = v;
};

/**
 * Check an entrance body. On create the name is required; on update only the
 * fields present change, and at least one must be.
 */
export const normalizeEntranceInput = (raw: unknown, mode: 'create' | 'update'): EntranceChanges => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new ValidationError('Request body must be an object', { code: 'FIELD_INVALID' });
  const body = raw as Record<string, unknown>;
  const touched = ENTRANCE_FIELDS.filter((f) => body[f] !== undefined);
  if (mode === 'update' && touched.length === 0) throw new ValidationError('No updatable fields supplied', { code: 'NO_CHANGES' });
  if (mode === 'create' && !touched.includes('name')) touched.unshift('name');
  const out: EntranceChanges = { $set: {}, $unset: {}, touched };

  for (const f of touched) {
    const v = body[f];
    if (f === 'name') {
      if (typeof v !== 'string' || !v.trim()) throw new ValidationError('entrance name is required', { code: 'FIELD_REQUIRED', field: 'name' });
      if (v.trim().length > ENTRANCE_LIMITS.name) throw tooLong('name', ENTRANCE_LIMITS.name);
      out.$set.name = v.trim();
    } else if (f === 'code' || f === 'note') optionalText(v, f, out);
    else if (f === 'kind') {
      if (typeof v !== 'string' || !(ENTRANCE_KINDS as readonly string[]).includes(v)) {
        throw new ValidationError('kind must be one of the entrance kinds', { code: 'FIELD_INVALID', field: 'kind' });
      }
      out.$set.kind = v as EntranceKind;
    } else if (f === 'accessible') {
      if (typeof v !== 'boolean') throw new ValidationError('accessible must be true or false', { code: 'FIELD_INVALID', field: 'accessible' });
      out.$set.accessible = v;
    } else if (f === 'order') {
      if (typeof v !== 'number' || !Number.isInteger(v) || v < 0 || v > 999) {
        throw new ValidationError('order must be a whole number from 0 to 999', { code: 'FIELD_RANGE', field: 'order', params: { min: 0, max: 999 } });
      }
      out.$set.order = v;
    }
  }
  return out;
};

/** Names compare without case or surrounding spaces: "Entrance A" and "entrance a" are the same door. */
export const sameEntranceName = (a: string, b: string): boolean => a.trim().toLowerCase() === b.trim().toLowerCase();
