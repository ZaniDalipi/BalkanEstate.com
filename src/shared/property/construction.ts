/**
 * Construction status — "ready to move in" vs "expected to be finished in X".
 *
 * A listing that does not exist yet is a different product from a finished
 * one: the same "Year built 2028" cell means *was built* on one and *might be
 * built* on the other. This module is the one place that says which of the two
 * a record is, so the badge, the details row and the write path can never
 * disagree.
 *
 * Read side only — pure, dependency-free and safe to call on unvalidated
 * records straight off the API. The write side (form submit, API ingestion)
 * lives in `@/shared/utils/validation` and imports the rules from here, so the
 * ceiling is stated once.
 */

/** Whether the building exists today, or is still going up. */
export type ConstructionStatus = 'ready' | 'under-construction';

export const CONSTRUCTION_STATUSES = ['ready', 'under-construction'] as const;

/**
 * How many years ahead a completion date may be promised.
 *
 * Deliberately the same ceiling `validateYearBuilt` already applies to
 * `yearBuilt` (currentYear + 5): an under-construction listing mirrors its
 * expected year into `yearBuilt`, so two different ceilings would let a record
 * pass one guard and fail the other.
 */
export const COMPLETION_YEAR_HORIZON = 5;

/**
 * What the UI may say about a record's construction state.
 *
 * `expectedYear` is `null` — never a guessed or partial value — when the year
 * is missing, unusable or already past. A listing whose promised year has come
 * and gone reads as "Under construction" with no date rather than advertising
 * a deadline it already missed.
 */
export type ConstructionInfo =
  | { status: 'ready' }
  | { status: 'under-construction'; expectedYear: number | null };

const READY: ConstructionInfo = { status: 'ready' };

/**
 * Coerce an untrusted value to a known status. Anything unrecognised (a legacy
 * record with no field at all, a typo, a hostile payload) is 'ready', which is
 * what every listing written before this feature actually is.
 */
export function normalizeConstructionStatus(value: unknown): ConstructionStatus {
  return value === 'under-construction' ? 'under-construction' : 'ready';
}

/** True when `year` is a plausible, still-future completion year. */
export function isUsableCompletionYear(value: unknown, now: Date = new Date()): boolean {
  const year = typeof value === 'string' ? Number(value.trim()) : value;
  if (typeof year !== 'number' || !Number.isInteger(year)) return false;

  const currentYear = now.getFullYear();
  return year >= currentYear && year <= currentYear + COMPLETION_YEAR_HORIZON;
}

/**
 * Read a property's construction state.
 *
 * Takes the two loose fields rather than a `Property` so it can also be used
 * on form state and on raw API payloads, which is where the bad values are.
 */
export function resolveConstruction(
  input: { constructionStatus?: unknown; expectedCompletionYear?: unknown } | null | undefined,
  now: Date = new Date(),
): ConstructionInfo {
  if (!input) return READY;
  if (normalizeConstructionStatus(input.constructionStatus) === 'ready') return READY;

  const raw = input.expectedCompletionYear;
  const year = typeof raw === 'string' ? Number(raw.trim()) : raw;

  return {
    status: 'under-construction',
    expectedYear: isUsableCompletionYear(year, now) ? (year as number) : null,
  };
}

/** Convenience predicate for the many call sites that only need the flag. */
export function isUnderConstruction(
  input: { constructionStatus?: unknown } | null | undefined,
): boolean {
  return !!input && normalizeConstructionStatus(input.constructionStatus) === 'under-construction';
}

/** The years a seller may pick from, oldest first. */
export function completionYearOptions(now: Date = new Date()): number[] {
  const currentYear = now.getFullYear();
  return Array.from({ length: COMPLETION_YEAR_HORIZON + 1 }, (_, i) => currentYear + i);
}

/**
 * The year fields as they are persisted.
 *
 * One writer for the preview object, the submitted payload and any importer,
 * so a previewed listing and the saved one cannot disagree about what year the
 * listing carries.
 *
 * An under-construction listing mirrors its completion year into `yearBuilt`.
 * `yearBuilt` is required by the schema and is what every existing sort and
 * year filter reads; leaving it at "this year" would file a 2029 handover
 * under 2026. The mirrored value is never *shown* as a year built — the UI
 * asks `resolveConstruction` first.
 *
 * An unusable year degrades to 'ready' rather than writing a promise with no
 * date on it. The form's boundary validator (`validateConstruction`) rejects
 * that combination before it gets here; this is the belt-and-braces path.
 */
export function buildConstructionFields(
  input: {
    constructionStatus?: unknown;
    expectedCompletionYear?: unknown;
    yearBuilt: number | string;
  },
  now: Date = new Date(),
): { yearBuilt: number; constructionStatus: ConstructionStatus; expectedCompletionYear?: number } {
  const enteredYearBuilt = Number(input.yearBuilt) || 0;
  const info = resolveConstruction(input, now);

  if (info.status === 'ready' || info.expectedYear === null) {
    return { yearBuilt: enteredYearBuilt, constructionStatus: 'ready' };
  }

  return {
    yearBuilt: info.expectedYear,
    constructionStatus: 'under-construction',
    expectedCompletionYear: info.expectedYear,
  };
}
