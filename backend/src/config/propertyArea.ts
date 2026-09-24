/**
 * Backfill a listing's total area from its own type-specific breakdown.
 *
 * A mirror of `src/shared/property/area.ts` on the client, for the same
 * reason the type-attribute and construction rules are mirrored: this is the
 * last word on what gets stored, so a listing created by the React form, the
 * importer, an admin edit or a seed script is backfilled the same way.
 *
 * `sqft` is required by the schema and is the one size every listing states,
 * but an apartment is also quoted gross and net, a villa its plot and its
 * build, a shop its open-plan floor — separate boxes from the total-area one.
 * Leaving the total blank while filling the breakdown used to store a literal
 * 0, which then printed as "0 m²" on a listing that gave a real measurement.
 */

import { attributesForType, MEASURED_ATTRIBUTES, type TypeAttribute } from './typeAttributes';

/**
 * The area fields a listing of this type describes itself by, if any.
 * Read from the type table so it cannot drift from what the form collects.
 */
const breakdownFieldsOf = (propertyType: unknown): readonly TypeAttribute[] =>
  attributesForType(propertyType).filter((attribute) => MEASURED_ATTRIBUTES.has(attribute));

/** A measurement worth using: a finite, positive number. Zero means "not measured". */
const isUsableArea = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value > 0;

/**
 * `sqft` as it should be stored: the largest measurement the seller actually
 * gave among the fields the type describes itself by, falling back to a plain
 * stated total only when that breakdown says nothing — or 0 when the record
 * gives no area anywhere, which it keeps stating rather than having one
 * invented for it.
 *
 * Mirrors `resolveDisplayArea` on the client exactly, so the figure the
 * database sorts and filters by is the figure the pages show.
 */
export function resolveTotalArea(
  propertyType: unknown,
  input: { sqft?: unknown } & Partial<Record<TypeAttribute, unknown>>,
): number {
  let widest = 0;
  for (const field of breakdownFieldsOf(propertyType)) {
    const value = input[field];
    if (isUsableArea(value) && value > widest) widest = value;
  }
  if (widest > 0) return widest;

  return isUsableArea(input.sqft) ? input.sqft : 0;
}
