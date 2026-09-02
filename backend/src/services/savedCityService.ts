/**
 * Saved cities — the reader's Explore-Cities subscriptions.
 *
 * The server is the authority on what can be saved: a city must exist in
 * `CityMarketData`, or the save is rejected. That keeps the list joinable
 * against real market data (no free-text junk that could never produce an
 * update) and means the digest can trust every stored row.
 */

import mongoose from 'mongoose';
import SavedCity, { ISavedCity } from '../models/SavedCity';
import CityMarketData from '../models/CityMarketData';
import { escapeRegex } from '../utils/escapeRegex';
import { apiLogger } from '../utils/logger';

export interface SavedCityView {
  city: string;
  country: string;
  countryCode: string;
  savedAt: Date;
}

export type SaveCityFailure =
  | { ok: false; reason: 'invalid'; message: string }
  | { ok: false; reason: 'unknown-city'; message: string }
  | { ok: false; reason: 'limit'; message: string };

export type ToggleSavedCityResult =
  | { ok: true; saved: boolean; city: SavedCityView | null }
  | SaveCityFailure;

/** A reader following hundreds of cities would make their digest meaningless. */
export const MAX_SAVED_CITIES_PER_USER = 50;

const MAX_NAME_LENGTH = 120;

/** Normalised identity shared with the digest's change matching. */
export function savedCityKey(city: string, country: string): string {
  return `${city.trim().toLowerCase()}|${country.trim().toLowerCase()}`;
}

interface ParsedCityInput {
  city: string;
  country: string;
}

/**
 * Validate the request body. Rejects anything that is not a plausible city
 * name rather than trimming it into shape, so a malformed client gets a 400
 * instead of a silently different row.
 */
export function parseCityInput(input: unknown): ParsedCityInput | null {
  if (!input || typeof input !== 'object') return null;
  const raw = input as Record<string, unknown>;

  const city = typeof raw.city === 'string' ? raw.city.trim() : '';
  const country = typeof raw.country === 'string' ? raw.country.trim() : '';

  if (!city || !country) return null;
  if (city.length > MAX_NAME_LENGTH || country.length > MAX_NAME_LENGTH) return null;

  return { city, country };
}

/** Case-insensitive exact match against the city directory. */
async function findKnownCity(city: string, country: string): Promise<{
  city: string;
  country: string;
  countryCode: string;
} | null> {
  const row = await CityMarketData.findOne({
    city: { $regex: new RegExp(`^${escapeRegex(city)}$`, 'i') },
    country: { $regex: new RegExp(`^${escapeRegex(country)}$`, 'i') },
  })
    .select('city country countryCode')
    .lean<{ city: string; country: string; countryCode: string } | null>();

  return row ?? null;
}

export async function listSavedCities(userId: mongoose.Types.ObjectId | string): Promise<SavedCityView[]> {
  const rows = await SavedCity.find({ userId })
    .sort({ createdAt: -1 })
    .select('city country countryCode createdAt')
    .lean<Array<Pick<ISavedCity, 'city' | 'country' | 'countryCode' | 'createdAt'>>>();

  return rows.map(row => ({
    city: row.city,
    country: row.country,
    countryCode: row.countryCode,
    savedAt: row.createdAt,
  }));
}

export async function isCitySaved(
  userId: mongoose.Types.ObjectId | string,
  city: string,
  country: string,
): Promise<boolean> {
  const count = await SavedCity.countDocuments({ userId, cityKey: savedCityKey(city, country) });
  return count > 0;
}

/**
 * Add or remove a saved city.
 *
 * Idempotent by construction: the unique (userId, cityKey) index is the
 * arbiter, so two concurrent saves cannot create a duplicate — the second one
 * surfaces as a duplicate-key error and is reported as "already saved".
 */
export async function toggleSavedCity(
  userId: mongoose.Types.ObjectId | string,
  input: unknown,
): Promise<ToggleSavedCityResult> {
  const parsed = parseCityInput(input);
  if (!parsed) {
    return { ok: false, reason: 'invalid', message: 'A city and country are required' };
  }

  const cityKey = savedCityKey(parsed.city, parsed.country);

  const existing = await SavedCity.findOne({ userId, cityKey });
  if (existing) {
    await existing.deleteOne();
    return { ok: true, saved: false, city: null };
  }

  const known = await findKnownCity(parsed.city, parsed.country);
  if (!known) {
    return {
      ok: false,
      reason: 'unknown-city',
      message: `We don't track market data for ${parsed.city}, ${parsed.country} yet`,
    };
  }

  const saved = await SavedCity.countDocuments({ userId });
  if (saved >= MAX_SAVED_CITIES_PER_USER) {
    return {
      ok: false,
      reason: 'limit',
      message: `You can follow up to ${MAX_SAVED_CITIES_PER_USER} cities`,
    };
  }

  try {
    const created = await SavedCity.create({
      userId,
      // Store the directory's spelling, not the client's.
      city: known.city,
      country: known.country,
      countryCode: known.countryCode,
      cityKey,
    });

    return {
      ok: true,
      saved: true,
      city: {
        city: created.city,
        country: created.country,
        countryCode: created.countryCode,
        savedAt: created.createdAt,
      },
    };
  } catch (error) {
    // Duplicate key: a concurrent request already saved it. The reader's
    // intent ("follow this city") is satisfied, so report success.
    if (error instanceof Error && 'code' in error && (error as { code?: number }).code === 11000) {
      return {
        ok: true,
        saved: true,
        city: {
          city: known.city,
          country: known.country,
          countryCode: known.countryCode,
          savedAt: new Date(),
        },
      };
    }
    apiLogger.error('Failed to save city:', error);
    throw error;
  }
}

/**
 * Saved city keys for a batch of users, in one query.
 * Used by the digest to decide who hears about which city.
 */
export async function loadSavedCityKeysForUsers(
  userIds: Array<mongoose.Types.ObjectId | string>,
): Promise<Map<string, Set<string>>> {
  const byUser = new Map<string, Set<string>>();
  if (userIds.length === 0) return byUser;

  const rows = await SavedCity.find({ userId: { $in: userIds } })
    .select('userId cityKey')
    .lean<Array<{ userId: mongoose.Types.ObjectId; cityKey: string }>>();

  for (const row of rows) {
    const key = String(row.userId);
    const set = byUser.get(key) ?? new Set<string>();
    set.add(row.cityKey);
    byUser.set(key, set);
  }

  return byUser;
}

/** User ids following any of the given cities — the saved-cities digest audience. */
export async function findUserIdsFollowingCities(cityKeys: string[]): Promise<string[]> {
  if (cityKeys.length === 0) return [];

  const ids = await SavedCity.distinct('userId', { cityKey: { $in: cityKeys } });
  return ids.map(id => String(id));
}
