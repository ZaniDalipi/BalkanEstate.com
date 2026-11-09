import type { Schema } from 'mongoose';
import { encodeId } from './idObfuscation';

/**
 * Make a schema's JSON speak obfuscated ids for its references, not only `_id`.
 *
 * The global toJSON transform (config/database.ts) rewrites `_id` → `id` and
 * nothing else, so a document's ObjectId references went out as raw hex while
 * the ids they point at went out encoded. The client then compared the two —
 * `floor.buildingId === building.id` — and never matched. Applying this to a
 * schema replaces the global transform for it (keeping its `_id` → `id` and
 * `__v` removal) and encodes every listed reference, including arrays of them
 * and nested ones (`builder.businessListingId`).
 */
export const encodeRefsOnJSON = (schema: Schema, refFields: readonly string[]): void => {
  const encode = (v: unknown): unknown => (v == null || v === '' ? v : encodeId(String(v)));
  schema.set('toJSON', {
    transform(_doc: unknown, ret: Record<string, unknown>) {
      if (ret._id) {
        ret.id = encodeId(String(ret._id));
        delete ret._id;
      }
      for (const path of refFields) {
        const keys = path.split('.');
        const field = keys.pop() as string;
        let holder: Record<string, unknown> | undefined = ret;
        for (const k of keys) holder = holder && typeof holder[k] === 'object' && holder[k] !== null ? (holder[k] as Record<string, unknown>) : undefined;
        if (!holder) continue;
        const value = holder[field];
        if (Array.isArray(value)) holder[field] = value.map(encode);
        else if (value != null) holder[field] = encode(value);
      }
      delete ret.__v;
      return ret;
    },
  });
};
