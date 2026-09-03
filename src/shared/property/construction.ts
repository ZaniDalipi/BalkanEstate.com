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
 * bounds are stated once.
 */

/** Whether the building exists today, or is still going up. */
export type ConstructionStatus = 'ready' | 'under-construction';

export const CONSTRUCTION_STATUSES = ['ready', 'under-construction'] as const;

/**
 * The window a completion year may fall in.
 *
 * Wide on purpose. A handover date is the seller's own estimate — some are
 * years out, some slipped and are already behind — so these bounds only ask
 * "is this a year at all", not "is this a good plan". Anything narrower
 * silently overrules a seller who knows their project better than we do.
 */
export const MIN_COMPLETION_YEAR = 1900;
export const COMPLETION_YEAR_HORIZON = 50;

/**
 * What the UI may say about a record's construction state.
 *
 * `expectedYear` is `null` — never a guessed or partial value — when no year
 * was given or the stored value is not a usable year. The completion year is
 * optional, so "under construction, date not announced" is an ordinary state,
 * not an error.
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

/** True when `value` is a whole year inside the plausible window. */
export function isUsableCompletionYear(value: unknown, now: Date = new Date()): boolean {
  const year = typeof value === 'string' ? Number(value.trim()) : value;
  if (typeof year !== 'number' || !Number.isInteger(year)) return false;

  return year >= MIN_COMPLETION_YEAR && year <= now.getFullYear() + COMPLETION_YEAR_HORIZON;
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

/**
 * The year fields as they are persisted.
 *
 * One writer for the preview object, the submitted payload and any importer,
 * so a previewed listing and the saved one cannot disagree about what year the
 * listing carries.
 *
 * An under-construction listing with a year mirrors it into `yearBuilt`.
 * `yearBuilt` is required by the schema and is what every existing sort and
 * year filter reads; leaving it at "this year" would file a 2029 handover
 * under 2026. The mirrored value is never *shown* as a year built — the UI
 * asks `resolveConstruction` first.
 *
 * Without a usable year the status still stands: the listing stays under
 * construction and simply carries no date, and `yearBuilt` keeps whatever was
 * entered. Dropping the status instead would silently republish an unfinished
 * building as a finished one.
 *
 * "No year" is written as an explicit `null`, never by leaving the key out.
 * The update endpoint reads an absent field as "unchanged", so an omitted key
 * would make a cleared handover date impossible to save — the old year would
 * come straight back on the next load.
 */
export function buildConstructionFields(
  input: {
    constructionStatus?: unknown;
    expectedCompletionYear?: unknown;
    yearBuilt: number | string;
  },
  now: Date = new Date(),
): { yearBuilt: number; constructionStatus: ConstructionStatus; expectedCompletionYear: number | null } {
  const enteredYearBuilt = Number(input.yearBuilt) || 0;
  const info = resolveConstruction(input, now);

  if (info.status === 'ready') {
    return { yearBuilt: enteredYearBuilt, constructionStatus: 'ready', expectedCompletionYear: null };
  }

  if (info.expectedYear === null) {
    return { yearBuilt: enteredYearBuilt, constructionStatus: 'under-construction', expectedCompletionYear: null };
  }

  return {
    yearBuilt: info.expectedYear,
    constructionStatus: 'under-construction',
    expectedCompletionYear: info.expectedYear,
  };
}
