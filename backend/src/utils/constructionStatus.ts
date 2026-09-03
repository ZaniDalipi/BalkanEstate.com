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

/** Matches the ceiling the frontend's `validateYearBuilt`/`validateCompletionYear` apply. */
export const COMPLETION_YEAR_HORIZON = 5;

/** Anything unrecognised — including a missing field on a legacy record — is 'ready'. */
export function normalizeConstructionStatus(value: unknown): ConstructionStatus {
  return value === 'under-construction' ? 'under-construction' : 'ready';
}

/** True when `value` is a whole year between this year and the horizon. */
export function isUsableCompletionYear(value: unknown, now: Date = new Date()): boolean {
  const year = typeof value === 'string' ? Number(value.trim()) : value;
  if (typeof year !== 'number' || !Number.isInteger(year)) return false;

  const currentYear = now.getFullYear();
  return year >= currentYear && year <= currentYear + COMPLETION_YEAR_HORIZON;
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
 * Rejects rather than repairs the one case a client can get wrong in a way
 * that matters: "under construction" with no usable year, which would store a
 * badge promising a date the UI cannot show. Everything else is coerced —
 * an unknown status becomes 'ready', and a stray completion year on a ready
 * listing is dropped instead of failing the write.
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
    return { ok: false, error: 'expectedCompletionYear is required when constructionStatus is under-construction' };
  }

  if (!isUsableCompletionYear(raw, now)) {
    const currentYear = now.getFullYear();
    return {
      ok: false,
      error: `expectedCompletionYear must be a whole year between ${currentYear} and ${currentYear + COMPLETION_YEAR_HORIZON}`,
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
