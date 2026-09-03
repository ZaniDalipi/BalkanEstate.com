/**
 * Construction status — server-side rules.
 *
 * Deliberately a mirror of `src/shared/property/construction.ts` rather than a
 * shared import: the backend compiles from its own rootDir, and the two sides
 * guard different things. The client's copy decides what a *form* may submit;
 * this one is the last word on what may be *stored*, and has to hold for the
 * importer and any other API client too.
 *
 * The one rule both copies state: an under-construction listing carries its
 * expected completion year, that year is between this year and
 * `COMPLETION_YEAR_HORIZON` years out, and `yearBuilt` mirrors it.
 */

export type ConstructionStatus = 'ready' | 'under-construction';

export const CONSTRUCTION_STATUSES: ConstructionStatus[] = ['ready', 'under-construction'];

/**
 * The window a completion year may fall in — the same bounds the client's copy
 * applies. Wide on purpose: a handover date is the seller's estimate, some of
 * them years out and some already slipped, so this asks "is this a year at
 * all", not whether the plan is a good one.
 */
export const MIN_COMPLETION_YEAR = 1900;
export const COMPLETION_YEAR_HORIZON = 50;

/** Anything unrecognised — including a missing field on a legacy record — is 'ready'. */
export function normalizeConstructionStatus(value: unknown): ConstructionStatus {
  return value === 'under-construction' ? 'under-construction' : 'ready';
}

/** True when `value` is a whole year inside the plausible window. */
export function isUsableCompletionYear(value: unknown, now: Date = new Date()): boolean {
  const year = typeof value === 'string' ? Number(value.trim()) : value;
  if (typeof year !== 'number' || !Number.isInteger(year)) return false;

  return year >= MIN_COMPLETION_YEAR && year <= now.getFullYear() + COMPLETION_YEAR_HORIZON;
}

export interface ConstructionFields {
  constructionStatus: ConstructionStatus;
  expectedCompletionYear?: number;
  yearBuilt?: number;
}

/**
 * Both members carry both keys (one always `undefined`) so the result can be
 * read from the frontend's non-strict `tsconfig` as well as this package's
 * strict one — a boolean discriminant only narrows under `strictNullChecks`,
 * and the schema hook that consumes this is compiled by both.
 */
export type ConstructionNormalization =
  | { ok: true; fields: ConstructionFields; error?: undefined }
  | { ok: false; error: string; fields?: undefined };

/**
 * Normalize the construction pair for storage.
 *
 * The completion year is optional — an under-construction listing with no
 * announced handover date is an ordinary listing — so the only case rejected
 * is a year that is not a year, which would store a badge with unreadable text
 * on it. Everything else is coerced: an unknown status becomes 'ready', and a
 * stray completion year on a ready listing is dropped instead of failing the
 * write.
 */
export function normalizeConstructionFields(
  input: { constructionStatus?: unknown; expectedCompletionYear?: unknown; yearBuilt?: unknown },
  now: Date = new Date(),
): ConstructionNormalization {
  if (normalizeConstructionStatus(input.constructionStatus) === 'ready') {
    return { ok: true, fields: { constructionStatus: 'ready', expectedCompletionYear: undefined } };
  }

  const raw = input.expectedCompletionYear;
  if (raw === undefined || raw === null || raw === '') {
    // Under construction stands on its own; the listing simply carries no date.
    return { ok: true, fields: { constructionStatus: 'under-construction', expectedCompletionYear: undefined } };
  }

  if (!isUsableCompletionYear(raw, now)) {
    return {
      ok: false,
      error: `expectedCompletionYear must be a whole year between ${MIN_COMPLETION_YEAR} and ${now.getFullYear() + COMPLETION_YEAR_HORIZON}`,
    };
  }

  const year = Number(raw);
  return {
    ok: true,
    // yearBuilt mirrors the completion year so year sorts and year filters,
    // which all read yearBuilt, file the listing under its handover year.
    fields: { constructionStatus: 'under-construction', expectedCompletionYear: year, yearBuilt: year },
  };
}
