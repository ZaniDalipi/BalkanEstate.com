import path from 'path';
import dotenv from 'dotenv';

/**
 * Load environment variables — import this FIRST, before anything that reads
 * process.env at import time.
 *
 * Reads `.env.{NODE_ENV}` (development when unset), then `.env` as fallback;
 * a value set earlier always wins. Both files are looked up in the backend
 * folder, so a script started from anywhere sees the same settings as the server.
 */
const backendRoot = path.resolve(__dirname, '../..');
const mode = process.env.NODE_ENV === 'production' ? 'production' : process.env.NODE_ENV === 'staging' ? 'staging' : 'development';

dotenv.config({ path: path.join(backendRoot, `.env.${mode}`), quiet: true } as dotenv.DotenvConfigOptions);
dotenv.config({ path: path.join(backendRoot, '.env'), quiet: true } as dotenv.DotenvConfigOptions);

export const loadedEnvFiles = [`.env.${mode}`, '.env'].map((f) => path.join(backendRoot, f));
