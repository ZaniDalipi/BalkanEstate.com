import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { isIndexNowEnabled } from '../config/indexNow';
import { notifyListingChanged } from '../services/indexNow/indexNowService';
import { notifyAgencyChanged, notifyAgentChanged, notifyDevelopmentChanged } from '../services/indexNow/indexNowPages';

/** The listing id in a create response (`{ property: { id | _id } }`). */
export const listingIdFromBody = (body: unknown): string | undefined => idIn(body, 'property');

/** `body[key].id ?? body[key]._id` as a string, if present. */
const idIn = (body: unknown, key: string): string | undefined => {
  if (!body || typeof body !== 'object') return undefined;
  const record = (body as Record<string, unknown>)[key];
  if (!record || typeof record !== 'object') return undefined;
  const { id, _id } = record as { id?: unknown; _id?: unknown };
  const value = id ?? _id;
  return value === undefined || value === null ? undefined : String(value);
};

/** What a write route announces once it has answered 2xx. */
type Announce = (req: Request, body: unknown) => void;

/**
 * After the route answers 2xx, run `announce` with the request and the JSON
 * body it sent. Runs after the response is sent, so it adds nothing to the
 * request; off outside production.
 */
export const announceOnSuccess = (announce: Announce): RequestHandler =>
  (req: Request, res: Response, next: NextFunction): void => {
    if (!isIndexNowEnabled()) {
      next();
      return;
    }
    let body: unknown;
    const json = res.json.bind(res);
    res.json = (value?: unknown) => {
      body = value;
      return json(value);
    };
    res.on('finish', () => {
      if (res.statusCode < 200 || res.statusCode >= 300) return;
      announce(req, body);
    });
    next();
  };

const signedInUserId = (req: Request): string | undefined => {
  const user = (req as Request & { user?: { _id?: unknown } }).user;
  return user?._id ? String(user._id) : undefined;
};

/**
 * A listing write: the listing is the `:id` route param, or for a create,
 * the id in the response.
 */
export const indexNowOnSuccess = (options: { deleted?: boolean } = {}): RequestHandler =>
  announceOnSuccess((req, body) => {
    const id = (req.params.id as string | undefined) ?? listingIdFromBody(body);
    if (id) void notifyListingChanged(id, options);
  });

/** An agency write on `/:id`, or a create (the agency and its owner's agent page are new). */
export const indexNowAgency = (): RequestHandler =>
  announceOnSuccess((req, body) => {
    const id = (req.params.id as string | undefined) ?? idIn(body, 'agency');
    if (id) void notifyAgencyChanged(id);
    if (!req.params.id) void notifyAgentChanged({ userId: signedInUserId(req) });
  });

/** The agent page of the agent in `:id`, or of the signed-in user when the route has no `:id`. */
export const indexNowAgent = (): RequestHandler =>
  announceOnSuccess((req) => {
    const key = req.params.id as string | undefined;
    void notifyAgentChanged(key ? { key } : { userId: signedInUserId(req) });
  });

/**
 * Residence dashboard writes that do not change the public page: a conflict
 * preview, a scene draft, starting a checkout.
 */
const PRIVATE_DEVELOPMENT_WRITE = /\/(preview|draft|billing\/checkout)$/;

/**
 * For `router.param('developmentId', …)` on the residence dashboard: every
 * write (POST/PUT/PATCH/DELETE) that answers 2xx announces the residence's
 * public page. Reads and private writes are left alone.
 */
export const indexNowDevelopmentParam = (req: Request, res: Response, next: NextFunction, developmentId: string): void => {
  if (req.method === 'GET' || req.method === 'HEAD' || PRIVATE_DEVELOPMENT_WRITE.test(req.path)) {
    next();
    return;
  }
  announceOnSuccess(() => void notifyDevelopmentChanged(developmentId))(req, res, next);
};
