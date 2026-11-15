import { Request, Response } from 'express';
import { apiLogger } from '../utils/logger';
import { resolveId } from '../utils/idObfuscation';
import {
  cancelOpenHouse,
  cancelRsvp,
  createOpenHouse,
  listForHost,
  listUpcomingForProperty,
  rsvp,
  ServiceResult,
} from '../services/openHouse/openHouseService';

const userIdOf = (req: Request): string | undefined => (req.user ? String((req.user as { _id: unknown })._id) : undefined);

const param = (req: Request, name: string): string => {
  const raw = req.params[name];
  return typeof raw === 'string' ? resolveId(raw) ?? raw : '';
};

function send<T>(res: Response, result: ServiceResult<T>, okStatus = 200, key = 'data'): void {
  if (result.ok === false) {
    res.status(result.status).json({ message: result.error, errors: [{ field: 'openHouse', message: result.error }] });
    return;
  }
  res.status(okStatus).json({ [key]: result.value });
}

const handle = (label: string, fn: (req: Request, res: Response) => Promise<void>) =>
  async (req: Request, res: Response): Promise<void> => {
    try {
      await fn(req, res);
    } catch (error) {
      apiLogger.error(`[openHouse] ${label} failed:`, error);
      res.status(500).json({ message: 'Something went wrong with the open house. Please try again.' });
    }
  };

/** GET /api/open-houses/property/:propertyId — public */
export const getPropertyOpenHouses = handle('list', async (req, res) => {
  send(res, await listUpcomingForProperty(param(req, 'propertyId'), { userId: userIdOf(req) }), 200, 'openHouses');
});

/** POST /api/open-houses — owner only */
export const postOpenHouse = handle('create', async (req, res) => {
  const propertyId = typeof req.body?.propertyId === 'string' ? resolveId(req.body.propertyId) ?? '' : '';
  send(res, await createOpenHouse(propertyId, userIdOf(req) ?? '', req.body), 201, 'openHouse');
});

/** DELETE /api/open-houses/:id — owner only */
export const deleteOpenHouse = handle('cancel', async (req, res) => {
  send(res, await cancelOpenHouse(param(req, 'id'), userIdOf(req) ?? ''), 200, 'cancelled');
});

/** POST /api/open-houses/:id/rsvp — public, rate limited */
export const postRsvp = handle('rsvp', async (req, res) => {
  send(res, await rsvp(param(req, 'id'), req.body ?? {}, userIdOf(req)), 201, 'openHouse');
});

/** DELETE /api/open-houses/:id/rsvp — the visitor themself */
export const deleteRsvp = handle('cancel rsvp', async (req, res) => {
  const rsvpId = typeof req.body?.rsvpId === 'string' ? req.body.rsvpId : undefined;
  send(res, await cancelRsvp(param(req, 'id'), { userId: userIdOf(req), rsvpId }), 200, 'openHouse');
});

/** GET /api/open-houses/mine — the host's upcoming open houses with RSVPs */
export const getMyOpenHouses = handle('mine', async (req, res) => {
  const propertyId = typeof req.query.propertyId === 'string' ? resolveId(req.query.propertyId) ?? undefined : undefined;
  res.json({ openHouses: await listForHost(userIdOf(req) ?? '', propertyId) });
});
