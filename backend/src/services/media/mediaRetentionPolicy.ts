/**
 * How long listing media is kept in Cloudinary after a listing ends.
 *
 * Deleted listings keep a single archive thumbnail; sold listings keep their
 * full gallery (they still show as "sold"). After the periods below, the
 * retention job removes those files so they stop being billed as storage.
 *
 * Configure with env vars (whole or fractional years, 0 < n ≤ 20):
 *   MEDIA_RETENTION_DELETED_YEARS  (default 1)
 *   MEDIA_RETENTION_SOLD_YEARS     (default 2)
 */

export interface MediaRetentionPolicy {
  deletedYears: number;
  soldYears: number;
}

export const DEFAULT_MEDIA_RETENTION: MediaRetentionPolicy = {
  deletedYears: 1,
  soldYears: 2,
};

const MAX_YEARS = 20;
const MS_PER_YEAR = 365.25 * 24 * 60 * 60 * 1000;

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

/** Validate one retention value from the environment. */
export const validateRetentionYears = (raw: string | undefined): ValidationResult => {
  if (raw === undefined || raw.trim() === '') return { isValid: true };
  const value = Number(raw);
  if (!Number.isFinite(value)) return { isValid: false, error: `"${raw}" is not a number` };
  if (value <= 0) return { isValid: false, error: 'must be greater than 0' };
  if (value > MAX_YEARS) return { isValid: false, error: `must be at most ${MAX_YEARS} years` };
  return { isValid: true };
};

/**
 * Read the policy from `env`, falling back to the default for any value that
 * is missing or invalid. Invalid values are reported through `onInvalid` so a
 * typo is visible in the logs instead of silently purging early.
 */
export const readMediaRetentionPolicy = (
  env: Record<string, string | undefined> = process.env,
  onInvalid: (name: string, error: string) => void = () => undefined
): MediaRetentionPolicy => {
  const read = (name: string, fallback: number): number => {
    const raw = env[name];
    const result = validateRetentionYears(raw);
    if (!result.isValid) {
      onInvalid(name, result.error || 'invalid');
      return fallback;
    }
    return raw === undefined || raw.trim() === '' ? fallback : Number(raw);
  };

  return {
    deletedYears: read('MEDIA_RETENTION_DELETED_YEARS', DEFAULT_MEDIA_RETENTION.deletedYears),
    soldYears: read('MEDIA_RETENTION_SOLD_YEARS', DEFAULT_MEDIA_RETENTION.soldYears),
  };
};

/** The date before which media of that age is due for removal. */
export const retentionCutoff = (years: number, now: Date = new Date()): Date =>
  new Date(now.getTime() - years * MS_PER_YEAR);
