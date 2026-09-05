/**
 * Loads the `.env` files, and must be imported before any module that reads
 * `process.env`.
 *
 * ES imports are all evaluated before the importing module's own body runs, so
 * calling `dotenv.config()` in the middle of `server.ts` is already too late:
 * every module imported above it has been evaluated, and any that captured a
 * variable at module scope captured nothing. That is a silent failure for
 * anything building an allowlist — an empty list rejects everything — and a
 * loud one for uploads, which is how it was found.
 *
 * Importing this module first fixes the ordering for all of them, because
 * imports run in source order. It has no exports on purpose: `import
 * './config/loadEnv'` is the whole interface, and there is nothing to
 * accidentally use before it has run.
 *
 * In production the variables usually come from the real environment (compose
 * `env_file`, or the platform's own settings) and are already present, so the
 * calls below find nothing to do and change nothing.
 */

import dotenv from 'dotenv';

const envFile =
  process.env.NODE_ENV === 'production'
    ? '.env.production'
    : process.env.NODE_ENV === 'staging'
      ? '.env.staging'
      : '.env.development';

// The environment-specific file first: dotenv never overwrites a variable that
// is already set, so whichever is loaded first wins.
dotenv.config({ path: envFile });

// Then plain `.env` as the fallback, which is what most local setups actually
// have. Anything the file above already defined is left alone.
dotenv.config();

/** Which file was preferred, for the startup log. */
export const ENV_FILE = envFile;
