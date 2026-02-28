import type { Migration, MigrationValidationResult } from './types';

/**
 * Regex for valid migration filenames:
 *   <14-digit timestamp>-<kebab-case-name>.ts
 *   e.g. 20240301120000-add-user-indexes.ts
 */
const FILENAME_PATTERN = /^\d{14}-.+\.ts$/;

const TIMESTAMP_LENGTH = 14;

/**
 * Validate that a migration filename follows the required convention.
 *
 * Expected format: `YYYYMMDDHHmmss-<kebab-case-description>.ts`
 */
export function validateMigrationFilename(
  filename: string
): MigrationValidationResult {
  if (!filename || filename.trim().length === 0) {
    return { isValid: false, error: 'Migration filename must not be empty' };
  }

  if (!FILENAME_PATTERN.test(filename)) {
    return {
      isValid: false,
      error: `Invalid migration filename "${filename}". Expected format: YYYYMMDDHHmmss-description.ts (e.g. 20240301120000-add-user-indexes.ts)`,
    };
  }

  const timestampStr = filename.slice(0, TIMESTAMP_LENGTH);
  const year = parseInt(timestampStr.slice(0, 4), 10);
  const month = parseInt(timestampStr.slice(4, 6), 10);
  const day = parseInt(timestampStr.slice(6, 8), 10);
  const hour = parseInt(timestampStr.slice(8, 10), 10);
  const minute = parseInt(timestampStr.slice(10, 12), 10);
  const second = parseInt(timestampStr.slice(12, 14), 10);

  if (
    year < 2020 || year > 2099 ||
    month < 1 || month > 12 ||
    day < 1 || day > 31 ||
    hour < 0 || hour > 23 ||
    minute < 0 || minute > 59 ||
    second < 0 || second > 59
  ) {
    return {
      isValid: false,
      error: `Invalid timestamp in migration filename "${filename}". Timestamp must be a valid date in YYYYMMDDHHmmss format`,
    };
  }

  return { isValid: true };
}

/**
 * Validate that a migration module exports the required interface.
 */
export function validateMigrationModule(
  mod: unknown,
  filename: string
): MigrationValidationResult {
  if (!mod || typeof mod !== 'object') {
    return {
      isValid: false,
      error: `Migration "${filename}" does not export a valid module`,
    };
  }

  const migration = mod as Partial<Migration>;

  if (!migration.id || typeof migration.id !== 'string') {
    return {
      isValid: false,
      error: `Migration "${filename}" must export an "id" string`,
    };
  }

  if (!migration.name || typeof migration.name !== 'string') {
    return {
      isValid: false,
      error: `Migration "${filename}" must export a "name" string`,
    };
  }

  if (!migration.description || typeof migration.description !== 'string') {
    return {
      isValid: false,
      error: `Migration "${filename}" must export a "description" string`,
    };
  }

  if (!migration.up || typeof migration.up !== 'function') {
    return {
      isValid: false,
      error: `Migration "${filename}" must export an "up" function`,
    };
  }

  if (migration.down !== undefined && typeof migration.down !== 'function') {
    return {
      isValid: false,
      error: `Migration "${filename}" has a "down" export that is not a function`,
    };
  }

  // Verify the id matches the filename timestamp prefix
  const expectedIdPrefix = filename.slice(0, TIMESTAMP_LENGTH);
  if (!migration.id.startsWith(expectedIdPrefix)) {
    return {
      isValid: false,
      error: `Migration "${filename}" id "${migration.id}" must start with the filename timestamp "${expectedIdPrefix}"`,
    };
  }

  return { isValid: true };
}
