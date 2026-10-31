import mongoose, { ClientSession } from 'mongoose';
import { logger } from './logger';

/**
 * Run a multi-document mutation inside a transaction when the connected
 * MongoDB topology supports one (production Atlas is a replica set), and fall
 * back to running it directly otherwise (e.g. a single-node mongod used in
 * tests, where transactions are not available).
 *
 * The callback receives a session that is `undefined` in the fallback path;
 * pass it straight to each query's `.session(session)` — Mongoose treats an
 * `undefined` session as "no session", so one code path serves both modes.
 *
 * This keeps attach/detach atomic where it matters without making every test
 * environment provision a replica set.
 */
export async function withOptionalTransaction<T>(
  work: (session: ClientSession | undefined) => Promise<T>
): Promise<T> {
  let session: ClientSession | undefined;
  try {
    session = await mongoose.startSession();
  } catch {
    // Cannot even create a session — run without one.
    return work(undefined);
  }

  try {
    let result!: T;
    await session.withTransaction(async () => {
      result = await work(session);
    });
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    // Topologies without transaction support surface a recognisable error.
    // Anything else is a genuine failure and must propagate.
    const unsupported =
      message.includes('Transaction numbers are only allowed') ||
      message.includes('Transactions are not supported') ||
      message.includes('replica set') ||
      message.includes('IllegalOperation');
    if (unsupported) {
      logger.warn(
        'Transactions unsupported on this topology; running mutation without one'
      );
      return work(undefined);
    }
    throw error;
  } finally {
    await session?.endSession();
  }
}
