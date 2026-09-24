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
 * The rule is the same for every type: **the whole property first, the part
 * inside it second.** A house or villa is the plot you buy, so `landArea`
 * leads and `buildingArea` — how much of that plot is built over — is detail
 * beneath it; that also matches the order the pair is declared and shown in
 * everywhere else. A flat's gross area already is its whole extent, with net
 * the part actually walked on. So the headline figure never states less than
 * the property is, and the narrower measurement stays informational.
 *
 * A type with no breakdown field at all (parking, land, and anything unknown)
 * has nothing to fall back to — its `sqft` either was given or was not.
 */
const AREA_FALLBACKS: Partial<Record<PropertyType, readonly TypeAttribute[]>> = {
  apartment: ['grossArea', 'netArea'],
  house: ['landArea', 'buildingArea'],
  villa: ['landArea', 'buildingArea'],
  'luxury-villa': ['landArea', 'buildingArea'],
  commercial: ['openPlanArea'],
  // Every attribute is on the table for the escape-hatch type, tried widest
  // first like everywhere else.
  other: ['grossArea', 'netArea', 'landArea', 'buildingArea', 'openPlanArea'],
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
 * A record to read an area off: a stored listing, an API payload or form
 * state. Loose on purpose — the bad values are in exactly the unvalidated
 * shapes a strict type would refuse to accept.
 */
type AreaSource = Partial<Record<TypeAttribute, unknown>> & {
  sqft?: unknown;
  propertyType?: unknown;
};

/**
 * The total area of a listing, or `null` when nothing on the record says how
 * big it is.
 *
 * One precedence, used reading and writing alike: **the type's own breakdown
 * if it has one, and only then the plain `sqft` total.** The breakdown is what
 * the seller is shown and edits — for a type that has one the form does not
 * even offer the plain box — so a `sqft` sitting behind it is either a figure
 * our own write path derived from that breakdown, or a legacy value from
 * before the breakdown was asked for. Neither should outrank the fields on
 * screen: a villa on a 1500 m² plot reads 1500, whatever total was stored for
 * it when the priority ran the other way.
 *
 * The plain total still wins where there is no breakdown to prefer — a
 * parking space, a plot, or a listing whose breakdown was never filled in —
 * so an older listing never loses the one measurement it has.
 *
 * Takes the loose fields rather than a `Property` so it can run on a raw API
 * payload, form state or a fully-typed record alike — the same reason
 * `resolveConstruction` does. Returns `null` instead of 0 so a caller hides
 * the stat rather than prints a measurement nobody gave.
 */
export function resolveDisplayArea(
  property: AreaSource | null | undefined,
): ResolvedArea | null {
  if (!property) return null;

  const fromBreakdown = resolveBreakdownArea(property);
  if (fromBreakdown) return fromBreakdown;

  return isUsableArea(property.sqft) ? { value: property.sqft, source: 'sqft' } : null;
}

/** The figure read from the type's own breakdown alone, ignoring any total. */
export function resolveBreakdownArea(
  property: AreaSource | null | undefined,
): ResolvedArea | null {
  if (!property) return null;

  const fallbacks = AREA_FALLBACKS[property.propertyType as PropertyType] ?? [];
  for (const attribute of fallbacks) {
    const value = property[attribute];
    if (isUsableArea(value)) return { value, source: attribute };
  }

  return null;
}

/**
 * `sqft` as it should be stored or displayed, or 0 when the record states no
 * size anywhere.
 *
 * A thin wrapper over `resolveDisplayArea` for the many call sites that want a
 * plain number rather than the `{ value, source }` pair — the form on submit,
 * the schema hook, and the transform boundaries normalising `sqft` on the way
 * in from the API.
 */
export function resolveTotalArea(property: AreaSource | null | undefined): number {
  return resolveDisplayArea(property)?.value ?? 0;
}
