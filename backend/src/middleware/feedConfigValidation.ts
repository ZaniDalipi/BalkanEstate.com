import type { Response } from 'express';
import type { ListingAdapterType } from '../models/ListingSource';
import { checkAdapterConfig } from '../services/listingAdapters/adapterConfig';

/**
 * Check a feed's settings before saving. Returns them brought up to date, or
 * answers 400 with every problem — `{ field, code, message }` like the other
 * validation errors — and returns null, so a feed that cannot run is never saved.
 */
export const feedConfigOrRespond = (
  res: Response,
  adapterType: ListingAdapterType,
  adapterConfig: unknown
): Record<string, unknown> | null => {
  const check = checkAdapterConfig(adapterType, adapterConfig ?? {});
  if (check.ok === false) {
    res.status(400).json({ message: check.problems[0].message, code: 'FEED_CONFIG_INVALID', errors: check.problems });
    return null;
  }
  return check.config;
};
