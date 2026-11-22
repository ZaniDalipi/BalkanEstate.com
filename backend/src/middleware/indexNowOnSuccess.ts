import type { NextFunction, Request, Response } from 'express';
import { isIndexNowEnabled } from '../config/indexNow';
import { notifyListingChanged } from '../services/indexNow/indexNowService';

/** The listing id in a create response (`{ property: { id | _id } }`). */
export const listingIdFromBody = (body: unknown): string | undefined => {
  if (!body || typeof body !== 'object') return undefined;
  const property = (body as { property?: unknown }).property;
  if (!property || typeof property !== 'object') return undefined;
  const { id, _id } = property as { id?: unknown; _id?: unknown };
  const value = id ?? _id;
  return value === undefined || value === null ? undefined : String(value);
};

/**
 * After a listing write route answers 2xx, announce the listing to IndexNow.
 * The listing is the `:id` route param, or for a create, the id in the
 * response. Runs after the response is sent, so it adds nothing to the
 * request; off outside production.
 */
export const indexNowOnSuccess = (options: { deleted?: boolean } = {}) =>
  (req: Request, res: Response, next: NextFunction): void => {
    if (!isIndexNowEnabled()) {
      next();
      return;
    }
    let createdId: string | undefined;
    if (!req.params.id) {
      const json = res.json.bind(res);
      res.json = (body?: unknown) => {
        createdId = listingIdFromBody(body);
        return json(body);
      };
    }
    res.on('finish', () => {
      if (res.statusCode < 200 || res.statusCode >= 300) return;
      const id = (req.params.id as string | undefined) ?? createdId;
      if (id) void notifyListingChanged(id, options);
    });
    next();
  };
