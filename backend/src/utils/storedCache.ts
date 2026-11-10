/**
 * Read and write `AreaInsightCache` documents. Best-effort: with no database
 * connection (tests, a database hiccup) reads miss and writes are skipped,
 * so a lookup still works, only uncached.
 */
import mongoose from 'mongoose';
import AreaInsightCache from '../models/AreaInsightCache';
import { apiLogger } from './logger';

const dbReady = () => mongoose.connection.readyState === 1;

export const readStored = async <T>(key: string): Promise<T | null> => {
  if (!dbReady()) return null;
  try {
    const doc = await AreaInsightCache.findOne({ key, expiresAt: { $gt: new Date() } }).maxTimeMS(2000).lean();
    return (doc?.value as T | undefined) ?? null;
  } catch (err) {
    apiLogger.warn(`Area cache read failed: ${err instanceof Error ? err.message : String(err)}`);
    return null;
  }
};

export const writeStored = async (key: string, value: unknown, ttlMs: number): Promise<void> => {
  if (!dbReady()) return;
  try {
    await AreaInsightCache.updateOne(
      { key },
      { $set: { value, expiresAt: new Date(Date.now() + ttlMs) } },
      { upsert: true }
    );
  } catch (err) {
    apiLogger.warn(`Area cache write failed: ${err instanceof Error ? err.message : String(err)}`);
  }
};
