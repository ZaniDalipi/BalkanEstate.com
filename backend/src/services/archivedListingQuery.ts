import type { FilterQuery } from 'mongoose';
import ArchivedListing, { IArchivedListing } from '../models/ArchivedListing';
import { escapeRegex } from '../utils/escapeRegex';

/** What the admin archive list can be narrowed by. */
export interface ArchiveListQuery {
  reason?: 'deleted' | 'sold' | 'rented';
  deletedBy?: 'owner' | 'admin' | 'agency';
  search?: string;
  page: number;
  limit: number;
}

const REASONS = ['deleted', 'sold', 'rented'] as const;
const DELETERS = ['owner', 'admin', 'agency'] as const;
const MAX_LIMIT = 100;
const MAX_SEARCH = 100;

const pick = <T extends string>(allowed: readonly T[], value: unknown): T | undefined =>
  typeof value === 'string' && (allowed as readonly string[]).includes(value) ? (value as T) : undefined;

const toInt = (value: unknown, fallback: number, min: number, max: number): number => {
  const n = typeof value === 'string' ? parseInt(value, 10) : NaN;
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};

/** Read the query string safely: unknown values are dropped, numbers are clamped. */
export function parseArchiveListQuery(raw: Record<string, unknown>): ArchiveListQuery {
  const search = typeof raw.search === 'string' ? raw.search.trim().slice(0, MAX_SEARCH) : '';
  return {
    reason: pick(REASONS, raw.reason),
    deletedBy: pick(DELETERS, raw.deletedBy),
    search: search || undefined,
    page: toInt(raw.page, 1, 1, 10_000),
    limit: toInt(raw.limit, 20, 1, MAX_LIMIT),
  };
}

/** The Mongo filter for a parsed query. */
export function buildArchiveFilter(query: ArchiveListQuery): FilterQuery<IArchivedListing> {
  const filter: FilterQuery<IArchivedListing> = {};
  if (query.reason) filter.archiveReason = query.reason;
  if (query.deletedBy) filter['deletedBy.kind'] = query.deletedBy;
  if (query.search) {
    const re = new RegExp(escapeRegex(query.search), 'i');
    filter.$or = [{ title: re }, { address: re }, { city: re }, { sellerName: re }, { sellerEmail: re }];
  }
  return filter;
}

/** A page of archived listings, newest first, with the count per reason. */
export async function listArchivedListings(query: ArchiveListQuery) {
  const filter = buildArchiveFilter(query);
  const [listings, total, reasonCounts] = await Promise.all([
    ArchivedListing.find(filter)
      .sort({ archivedAt: -1 })
      .skip((query.page - 1) * query.limit)
      .limit(query.limit)
      .lean(),
    ArchivedListing.countDocuments(filter),
    ArchivedListing.aggregate<{ _id: string; count: number }>([
      { $group: { _id: '$archiveReason', count: { $sum: 1 } } },
    ]),
  ]);

  const counts = { deleted: 0, sold: 0, rented: 0 };
  for (const { _id, count } of reasonCounts) {
    if (_id === 'deleted' || _id === 'sold' || _id === 'rented') counts[_id] = count;
  }

  return {
    listings,
    total,
    page: query.page,
    pages: Math.max(1, Math.ceil(total / query.limit)),
    counts,
  };
}
