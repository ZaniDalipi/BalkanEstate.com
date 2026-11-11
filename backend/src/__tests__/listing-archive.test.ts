/**
 * Removed listings are kept in the archive with who removed them, and admins
 * can page and filter that archive.
 */

import mongoose from 'mongoose';
import ArchivedListing from '../models/ArchivedListing';
import type { IProperty } from '../models/Property';
import {
  archiveDeletedListings,
  archiveThumbnailPublicId,
  buildDeletedArchiveRecord,
} from '../services/listingArchiveService';
import {
  buildArchiveFilter,
  listArchivedListings,
  parseArchiveListQuery,
} from '../services/archivedListingQuery';

const property = (overrides: Partial<Record<string, unknown>> = {}): IProperty =>
  ({
    _id: new mongoose.Types.ObjectId(),
    sellerId: new mongoose.Types.ObjectId(),
    createdByName: 'Ana Seller',
    createdByEmail: 'ana@example.com',
    createdAsRole: 'private_seller',
    status: 'active',
    title: 'Sea view flat',
    listingType: 'sale',
    price: 120000,
    address: 'Rruga 1',
    city: 'Durrës',
    country: 'Albania',
    propertyType: 'apartment',
    imageUrl: 'https://cdn.example.com/main.jpg',
    imagePublicId: 'users/a/listings/x/main',
    views: 42,
    saves: 3,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  }) as unknown as IProperty;

const admin = { kind: 'admin' as const, userId: String(new mongoose.Types.ObjectId()), name: 'Admin', email: 'admin@example.com' };

describe('buildDeletedArchiveRecord', () => {
  it('records who removed the listing, its last status and how long it was up', () => {
    const record = buildDeletedArchiveRecord(property(), admin, new Date('2026-01-11T00:00:00Z'));
    expect(record.deletedBy).toEqual(admin);
    expect(record.previousStatus).toBe('active');
    expect(record.archiveReason).toBe('deleted');
    expect(record.daysOnMarket).toBe(10);
    expect(record.totalViews).toBe(42);
    expect(record.thumbnailPublicId).toBe('users/a/listings/x/main');
  });

  it('fills required fields the listing left empty, so the archive is never rejected', () => {
    const record = buildDeletedArchiveRecord(
      property({ createdByEmail: '', address: '', city: undefined, createdAsRole: 'external', price: NaN }),
      admin
    );
    expect(record.sellerEmail).toBe('Unknown');
    expect(record.address).toBe('Unknown');
    expect(record.city).toBe('Unknown');
    expect(record.createdAsRole).toBe('private_seller');
    expect(record.price).toBe(0);
  });

  it('keeps the first photo when the listing has no main photo', () => {
    expect(archiveThumbnailPublicId(property({ imagePublicId: undefined, images: [{ publicId: 'first' }] }))).toBe('first');
  });
});

describe('archive query parsing', () => {
  it('drops unknown values and clamps paging', () => {
    expect(parseArchiveListQuery({ reason: 'hacked', deletedBy: 'admin', page: '-3', limit: '5000', search: '  flat ' }))
      .toEqual({ reason: undefined, deletedBy: 'admin', search: 'flat', page: 1, limit: 100 });
  });

  it('escapes the search so it is matched as plain text', () => {
    const filter = buildArchiveFilter(parseArchiveListQuery({ search: 'a.*' }));
    const first = (filter.$or as Array<{ title: RegExp }>)[0].title;
    expect(first.test('a.* flat')).toBe(true);
    expect(first.test('abc')).toBe(false);
  });
});

describe('archive in the database', () => {
  it('stores removed listings and lists them newest first, filtered by who removed them', async () => {
    await archiveDeletedListings([property({ title: 'Owner removed' })], { kind: 'owner', name: 'Ana' });
    await archiveDeletedListings([property({ title: 'Admin removed' }), property({ title: 'Also admin' })], admin);

    expect(await ArchivedListing.countDocuments()).toBe(3);

    const byAdmin = await listArchivedListings(parseArchiveListQuery({ deletedBy: 'admin' }));
    expect(byAdmin.total).toBe(2);
    expect(byAdmin.listings.map((l) => l.title).sort()).toEqual(['Admin removed', 'Also admin']);
    expect(byAdmin.counts).toEqual({ deleted: 3, sold: 0, rented: 0 });

    const searched = await listArchivedListings(parseArchiveListQuery({ search: 'owner' }));
    expect(searched.listings.map((l) => l.title)).toEqual(['Owner removed']);
  });

  it('archiving nothing writes nothing', async () => {
    expect(await archiveDeletedListings([], admin)).toBe(0);
  });
});
