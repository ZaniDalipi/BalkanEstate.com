/**
 * A listing's one total-area figure — the "sqft" every type is measured by.
 *
 * `sqft` is meant to be the single size every listing states, whatever else it
 * carries: it is the stat `statsForType` puts on every card and the number the
 * price-per-m² math divides by. But an apartment is also quoted gross and net,
 * a villa is quoted its plot and its build, a shop its open-plan floor — and
 * those are collected as their own boxes on the form, separate from the total-
 * area box. A seller (or an importer) who fills the breakdown and skips the
 * separate total leaves `sqft` at the schema's default of zero, and every page
 * that prints `property.sqft` then shows "0 m²" next to numbers that say the
 * flat is 79 m².
 *
 * This is the one place that says what to show instead: `sqft` itself when it
 * is a real measurement, otherwise the type's own breakdown, combined into the
 * single figure a buyer compares listings by. Read side only, mirrored by
 * `resolveTotalArea` in `backend/src/config/propertyArea.ts` for the write
 * side, the same split as `construction.ts` and its `buildConstructionFields`.
 */

import type { PropertyType } from '@/shared/types/property.types';
import { MEASURED_ATTRIBUTES, attributesForType, type TypeAttribute } from './typeAttributes';

/**
 * Which type-specific measurement stands in for `sqft`, and in what order,
 * when the total-area box was left empty.
 *
 * A villa lists `landArea` before `buildingArea` everywhere else — that pair
 * is how two villas are compared, plot first — but the *built* area is what
 * "total area" and its price-per-m² mean for every other type, so it is tried
 * first here; the plot is a last resort, not the everyday case. An apartment's
 * gross area is what a listing is headlined by, net a close second. A type
 * with no breakdown field at all (house, parking, land, and anything unknown)
 * has nothing to fall back to — its `sqft` either was given or was not.
 */
const AREA_FALLBACKS: Partial<Record<PropertyType, readonly TypeAttribute[]>> = {
  apartment: ['grossArea', 'netArea'],
  villa: ['buildingArea', 'landArea'],
  'luxury-villa': ['buildingArea', 'landArea'],
  commercial: ['openPlanArea'],
  // Every attribute is on the table for the escape-hatch type, tried in the
  // same built-before-plot order as everywhere else.
  other: ['grossArea', 'netArea', 'buildingArea', 'landArea', 'openPlanArea'],
};

/** A measurement worth showing: a finite, positive number. Zero is "not measured", not "0 m²". */
const isUsableArea = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value > 0;

/**
 * Does this type describe its own size, rather than being given a plain total?
 *
 * The listing form asks a type with a breakdown for that breakdown and hides
 * the generic "Area" box, so for those types the breakdown is the only thing
 * a seller can see and correct — and therefore the only thing allowed to
 * decide the total when a listing is written. Asked here rather than by each
 * caller listing the types out, so the form and the write path cannot come to
 * different conclusions about which boxes a seller was shown.
 */
export const typeHasMeasuredBreakdown = (propertyType: unknown): boolean =>
  attributesForType(propertyType).some((attribute) => MEASURED_ATTRIBUTES.has(attribute));

export interface ResolvedArea {
  /** The figure to show, in m². Always > 0 — see `resolveDisplayArea`'s null case. */
  value: number;
  /** Which field it came from, so a caller can label "≈" onto a fallback if it wants to. */
  source: TypeAttribute | 'sqft';
}

/**
 * The total area to show for a listing, or `null` when nothing on the record
 * says how big it is.
 *
 * Takes the loose fields rather than a `Property` so it can run on a raw API
 * payload, form state or a fully-typed record alike — the same reason
 * `resolveConstruction` does. Returns `null` instead of 0 so a caller hides
 * the stat rather than prints a measurement nobody gave.
 */
export function resolveDisplayArea(
  property:
    | (Partial<Record<TypeAttribute, unknown>> & { sqft?: unknown; propertyType?: unknown })
    | null
    | undefined,
): ResolvedArea | null {
  if (!property) return null;

  if (isUsableArea(property.sqft)) return { value: property.sqft, source: 'sqft' };

  const fallbacks = AREA_FALLBACKS[property.propertyType as PropertyType] ?? [];
  for (const attribute of fallbacks) {
    const value = property[attribute];
    if (isUsableArea(value)) return { value, source: attribute };
  }

  return null;
}

/**
 * `sqft` as it should be stored or displayed: the entered total, or the
 * type's own breakdown combined into one figure, or 0 when the record
 * genuinely has neither.
 *
 * A thin wrapper over `resolveDisplayArea` for the many call sites that want
 * a plain number rather than the `{ value, source }` pair — the write path
 * backfilling `sqft` on submit, and a transform boundary normalising `sqft`
 * on the way in from the API.
 */
export function resolveTotalArea(
  property:
    | (Partial<Record<TypeAttribute, unknown>> & { sqft?: unknown; propertyType?: unknown })
    | null
    | undefined,
): number {
  return resolveDisplayArea(property)?.value ?? 0;
}
