/**
 * Buffered view counting.
 *
 * Every property detail request used to perform two writes on the request path:
 * `$inc { views }` on the property, then `$inc { stats.totalViews }` on the
 * seller's user document — awaited one after the other. Two consequences at
 * scale: a popular listing serialises every viewer behind a write lock on the
 * same document (and a busy seller behind their own), and each view costs two
 * extra database round trips before the response can be sent.
 *
 * Counts are accumulated in memory and flushed periodically as two bulkWrite
 * calls, so a thousand views of one listing cost one increment instead of a
 * thousand.
 *
 * Trade-off: counts are eventually consistent (up to FLUSH_INTERVAL_MS behind)
 * and a hard process kill loses at most one interval's worth. The response
 * still reports the incremented value immediately, so a viewer never sees a
 * stale number for the page they just opened.
 */

import mongoose from 'mongoose';
import Property from '../models/Property';
import User from '../models/User';
import { apiLogger } from './logger';

const FLUSH_INTERVAL_MS = 10_000;

/** Flush early if traffic is heavy, so the buffer can't grow without bound. */
const MAX_PENDING_KEYS = 5_000;

const pendingPropertyViews = new Map<string, number>();
const pendingSellerViews = new Map<string, number>();

let flushing = false;

const bump = (buffer: Map<string, number>, id: string, by: number) => {
  buffer.set(id, (buffer.get(id) || 0) + by);
};

/**
 * Records one view of a property (and, when known, of its seller).
 *
 * Deliberately synchronous and side-effect free from the caller's point of
 * view — the request path should never wait for a counter.
 */
export const recordPropertyView = (propertyId: string, sellerId?: string): void => {
  if (!propertyId) return;

  bump(pendingPropertyViews, String(propertyId), 1);
  if (sellerId) bump(pendingSellerViews, String(sellerId), 1);

  if (pendingPropertyViews.size + pendingSellerViews.size >= MAX_PENDING_KEYS) {
    void flushViewCounts();
  }
};

/**
 * Writes buffered counts and clears the buffers.
 *
 * On failure the counts are merged back so a transient database problem
 * doesn't silently discard them.
 */
export const flushViewCounts = async (): Promise<void> => {
  if (flushing) return;
  if (pendingPropertyViews.size === 0 && pendingSellerViews.size === 0) return;
  if (mongoose.connection.readyState !== 1) return;

  flushing = true;

  const properties = new Map(pendingPropertyViews);
  const sellers = new Map(pendingSellerViews);
  pendingPropertyViews.clear();
  pendingSellerViews.clear();

  try {
    const now = new Date();
    const work: Promise<unknown>[] = [];

    if (properties.size > 0) {
      work.push(
        Property.bulkWrite(
          [...properties].map(([id, count]) => ({
            updateOne: {
              filter: { _id: new mongoose.Types.ObjectId(id) },
              update: { $inc: { views: count } },
            },
          })),
          { ordered: false }
        )
      );
    }

    if (sellers.size > 0) {
      work.push(
        User.bulkWrite(
          [...sellers].map(([id, count]) => ({
            updateOne: {
              filter: { _id: new mongoose.Types.ObjectId(id) },
              update: {
                $inc: { 'stats.totalViews': count },
                $set: { 'stats.lastUpdated': now },
              },
            },
          })),
          { ordered: false }
        )
      );
    }

    await Promise.all(work);
  } catch (error) {
    // Put the counts back rather than losing them.
    for (const [id, count] of properties) bump(pendingPropertyViews, id, count);
    for (const [id, count] of sellers) bump(pendingSellerViews, id, count);
    apiLogger.error('View count flush failed, counts retained for next flush:', error);
  } finally {
    flushing = false;
  }
};

let timer: NodeJS.Timeout | null = null;

/** Starts the periodic flush. Safe to call more than once. */
export const startViewCounter = (): void => {
  if (timer || process.env.NODE_ENV === 'test') return;
  timer = setInterval(() => void flushViewCounts(), FLUSH_INTERVAL_MS);
  // Never hold the process open for a counter.
  timer.unref?.();
};

/** Stops the periodic flush and writes whatever is buffered. */
export const stopViewCounter = async (): Promise<void> => {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
  await flushViewCounts();
};
