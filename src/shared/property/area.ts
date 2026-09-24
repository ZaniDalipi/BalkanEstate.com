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

import { MEASURED_ATTRIBUTES, attributesForType, type TypeAttribute } from './typeAttributes';

/**
 * The area fields a listing of this type describes itself by, if any.
 *
 * Read from the type table rather than listed here, so this cannot fall out
 * of step with what the form asks for: add an area to a type there and the
 * total starts accounting for it, with nothing to update in this file.
 */
const breakdownFieldsOf = (propertyType: unknown): readonly TypeAttribute[] =>
  attributesForType(propertyType).filter((attribute) => MEASURED_ATTRIBUTES.has(attribute));

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
 * **The largest measurement the seller actually gave**, taken from the fields
 * the type describes itself by. Nothing is ranked in advance: a flat quoted
 * 98 m² gross and 77 m² net is a 98 m² flat, a villa on a 1500 m² plot with a
 * 500 m² house on it is 1500 m², and each is simply the widest number that
 * listing states. The narrower measurements stay on the page as detail.
 *
 * This replaced a table of per-type priorities, which gave the same answers
 * on ordinary data, was one more thing to keep in step with the form, and
 * outranked the seller whenever their only figure sat in the "wrong" field.
 *
 * The plain `sqft` total is consulted only when the breakdown says nothing —
 * never alongside it. For a type with a breakdown the form does not show that
 * box, so what sits in it is a figure the seller was not looking at: the
 * previously stored total, or the AI's guess from photos. Letting it into the
 * running would mean a seller who *lowers* a villa's plot from 1500 to 1200
 * silently saves 1500 again. Consulted last, it still keeps an older listing
 * whole — one that states only a plain total, from before its breakdown was
 * asked for, reads exactly that.
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

  let widest: ResolvedArea | null = null;
  for (const field of breakdownFieldsOf(property.propertyType)) {
    const value = property[field];
    if (isUsableArea(value) && (widest === null || value > widest.value)) {
      widest = { value, source: field };
    }
  }
  if (widest) return widest;

  return isUsableArea(property.sqft) ? { value: property.sqft, source: 'sqft' } : null;
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
