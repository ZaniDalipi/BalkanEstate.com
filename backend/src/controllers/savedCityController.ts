import { Request, Response } from 'express';
import { IUser } from '../models/User';
import {
  listSavedCities,
  toggleSavedCity,
  isCitySaved,
  MAX_SAVED_CITIES_PER_USER,
} from '../services/savedCityService';
import { apiLogger } from '../utils/logger';
import { getParam } from '../utils/validateParams';

/** Routes are mounted behind `protect`, but never trust that alone. */
const requireUser = (req: Request, res: Response): IUser | null => {
  if (!req.user) {
    res.status(401).json({ message: 'Not authorized' });
    return null;
  }
  return req.user as IUser;
};

/**
 * @desc    List the cities the signed-in reader follows
 * @route   GET /api/saved-cities
 * @access  Private
 *
 * Returns identities only. Market figures come from the city endpoints the
 * page already loads, so there is exactly one source for those numbers.
 */
export const getSavedCities = async (req: Request, res: Response): Promise<void> => {
  const user = requireUser(req, res);
  if (!user) return;

  try {
    const cities = await listSavedCities(user._id);
    res.json({ cities, count: cities.length, limit: MAX_SAVED_CITIES_PER_USER });
  } catch (error: unknown) {
    apiLogger.error('Get saved cities error:', error);
    res.status(500).json({ message: 'Error fetching saved cities' });
  }
};

/**
 * @desc    Follow or unfollow a city
 * @route   POST /api/saved-cities/toggle
 * @access  Private
 */
export const toggleSavedCityController = async (req: Request, res: Response): Promise<void> => {
  const user = requireUser(req, res);
  if (!user) return;

  try {
    const result = await toggleSavedCity(user._id, req.body);

    // Narrowed on the `reason` field rather than `ok`, so this reads the same
    // way under the repo's stricter and looser tsconfigs.
    if ('reason' in result) {
      // 400 for a malformed request, 404 for a city we do not track, 409 when
      // the reader is at their follow limit — each is a different fix.
      const status = result.reason === 'invalid' ? 400 : result.reason === 'unknown-city' ? 404 : 409;
      res.status(status).json({ message: result.message, reason: result.reason });
      return;
    }

    res.json({ saved: result.saved, city: result.city });
  } catch (error: unknown) {
    apiLogger.error('Toggle saved city error:', error);
    res.status(500).json({ message: 'Error updating saved cities' });
  }
};

/**
 * @desc    Whether the reader follows one city
 * @route   GET /api/saved-cities/check/:city/:country
 * @access  Private
 */
export const checkSavedCity = async (req: Request, res: Response): Promise<void> => {
  const user = requireUser(req, res);
  if (!user) return;

  try {
    const city = getParam(req, 'city');
    const country = getParam(req, 'country');

    if (!city || !country) {
      res.status(400).json({ message: 'City and country are required' });
      return;
    }

    res.json({ saved: await isCitySaved(user._id, city, country) });
  } catch (error: unknown) {
    apiLogger.error('Check saved city error:', error);
    res.status(500).json({ message: 'Error checking saved city' });
  }
};
