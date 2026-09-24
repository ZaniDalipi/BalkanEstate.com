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

import type { PropertyType } from './propertyTypes';
import type { TypeAttribute } from './typeAttributes';

/**
 * Which type-specific measurement stands in for `sqft`, tried in order, when
 * the total-area field is 0 or absent.
 *
 * The whole property first, the part inside it second: a house or villa is
 * the plot it occupies, so `landArea` leads and `buildingArea` is detail
 * beneath it, and a flat's gross area leads its net. The headline figure
 * never states less than the property is. A type with no breakdown field
 * (parking, land) has nothing to fall back to.
 */
const AREA_FALLBACKS: Partial<Record<PropertyType, readonly TypeAttribute[]>> = {
  apartment: ['grossArea', 'netArea'],
  house: ['landArea', 'buildingArea'],
  villa: ['landArea', 'buildingArea'],
  'luxury-villa': ['landArea', 'buildingArea'],
  commercial: ['openPlanArea'],
  other: ['grossArea', 'netArea', 'landArea', 'buildingArea', 'openPlanArea'],
};

/** A measurement worth using: a finite, positive number. Zero means "not measured". */
const isUsableArea = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value > 0;

/**
 * `sqft` as it should be stored: the type's own breakdown when it has one,
 * otherwise the entered total, otherwise 0 — a record that genuinely gives no
 * area anywhere keeps stating that, rather than having one invented for it.
 */
export function resolveTotalArea(
  propertyType: unknown,
  input: { sqft?: unknown } & Partial<Record<TypeAttribute, unknown>>,
): number {
  // The breakdown first, the plain total second — the client's rule exactly.
  // For a type that has a breakdown the form does not offer the plain box, so
  // a `sqft` behind it is either derived from that breakdown or predates it;
  // the fields the seller sees are the ones the listing is sized by.
  const fallbacks = AREA_FALLBACKS[propertyType as PropertyType] ?? [];
  for (const attribute of fallbacks) {
    const value = input[attribute];
    if (isUsableArea(value)) return value;
  }

  if (isUsableArea(input.sqft)) return input.sqft;

  return typeof input.sqft === 'number' && Number.isFinite(input.sqft) ? input.sqft : 0;
}
