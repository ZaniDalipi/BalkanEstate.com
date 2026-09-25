process.env.SKIP_TEST_DB = 'true';

import { Types } from 'mongoose';

const mockPropertyFindOne = jest.fn();
const mockPropertyUpdateOne = jest.fn();
const mockPropertyFindOneAndUpdate = jest.fn();
const mockPropertyExists = jest.fn();
const mockDraftFindOne = jest.fn();
const mockDraftFindOneAndUpdate = jest.fn();
const mockDraftCreate = jest.fn();
const mockSourceFindOne = jest.fn();
const mockSourceUpdateOne = jest.fn();
const mockGetMonthlyUsage = jest.fn();

jest.mock('../models/Property', () => ({
  __esModule: true,
  default: {
    findOne: (...a: unknown[]) => mockPropertyFindOne(...a),
    updateOne: (...a: unknown[]) => mockPropertyUpdateOne(...a),
    findOneAndUpdate: (...a: unknown[]) => mockPropertyFindOneAndUpdate(...a),
    exists: (...a: unknown[]) => mockPropertyExists(...a),
  },
}));
jest.mock('../models/ImportedListingDraft', () => ({
  __esModule: true,
  default: {
    findOne: (...a: unknown[]) => mockDraftFindOne(...a),
    findOneAndUpdate: (...a: unknown[]) => mockDraftFindOneAndUpdate(...a),
    create: (...a: unknown[]) => mockDraftCreate(...a),
  },
}));
jest.mock('../models/ListingSource', () => ({
  __esModule: true,
  default: {
    findOne: (...a: unknown[]) => ({ select: () => mockSourceFindOne(...a) }),
    findById: () => ({ select: () => ({ lean: async () => ({ name: 'century21albania.com' }) }) }),
    updateOne: (...a: unknown[]) => mockSourceUpdateOne(...a),
  },
}));
jest.mock('../models/User', () => ({
  __esModule: true,
  default: {
    findById: () => ({ select: () => ({ lean: async () => ({ role: 'agent' }) }) }),
    updateOne: jest.fn(async () => ({})),
  },
}));
jest.mock('../services/listingLimitService', () => ({
  __esModule: true,
  default: { getMonthlyUsage: (...a: unknown[]) => mockGetMonthlyUsage(...a) },
}));
jest.mock('../services/geocodingService', () => ({ geocodeAddress: jest.fn(async () => null) }));
jest.mock('../sockets/propertySocket', () => ({
  emitPropertyCreated: jest.fn(),
  emitPropertyUpdated: jest.fn(),
}));
jest.mock('../middleware/cache', () => ({ invalidateCache: jest.fn(async () => undefined) }));

import { acceptDraft, getDraft, linkPublishedDraft, queueForReview } from '../services/importReviewService';
import { hashReviewFields } from '../services/importReviewFields';

const userId = new Types.ObjectId();
const source = { _id: new Types.ObjectId(), slug: 'user-feed', userId } as never;

const incoming = {
  title: 'Flat',
  price: 100000,
  city: 'Tirana',
  country: 'Albania',
  lat: 41.3,
  lng: 19.8,
  sourceUrl: 'https://src.example/1',
} as Record<string, unknown>;

const lean = (value: unknown) => ({ lean: async () => value });

const draftDoc = (overrides: Record<string, unknown>): Record<string, any> => ({
  save: jest.fn(async () => undefined),
  deleteOne: jest.fn(async () => undefined),
  markModified: jest.fn(),
  ...overrides,
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe('queueForReview', () => {
  it('queues a listing that is not on the platform yet instead of publishing it', async () => {
    mockPropertyFindOne.mockReturnValue(lean(null));
    mockDraftFindOne.mockResolvedValue(null);

    await expect(queueForReview(source, 'ext-1', incoming as never)).resolves.toBe('queuedNew');
    expect(mockDraftCreate).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'new', status: 'pending', sourceListingId: 'ext-1' })
    );
    expect(mockPropertyFindOneAndUpdate).not.toHaveBeenCalled();
  });

  it('never brings back a listing the owner rejected', async () => {
    mockPropertyFindOne.mockReturnValue(lean(null));
    mockDraftFindOne.mockResolvedValue(draftDoc({ status: 'rejected', incomingHash: 'old' }));

    await expect(queueForReview(source, 'ext-1', incoming as never)).resolves.toBe('skipped');
    expect(mockDraftCreate).not.toHaveBeenCalled();
  });

  it('keeps the owner’s edits when the feed sends new values for a pending draft', async () => {
    const edited = { ...incoming, price: 90000 };
    const draft = draftDoc({ status: 'pending', incomingHash: 'old', editedAt: new Date(), data: edited });
    mockPropertyFindOne.mockReturnValue(lean(null));
    mockDraftFindOne.mockResolvedValue(draft);

    await expect(queueForReview(source, 'ext-1', { ...incoming, price: 110000 } as never)).resolves.toBe('refreshed');
    expect(draft.data).toBe(edited);
    expect((draft as unknown as { original: Record<string, unknown> }).original.price).toBe(110000);
  });

  it('refreshes an untouched pending draft with the feed’s new values', async () => {
    const draft = draftDoc({ status: 'pending', incomingHash: 'old', data: incoming });
    mockPropertyFindOne.mockReturnValue(lean(null));
    mockDraftFindOne.mockResolvedValue(draft);

    await queueForReview(source, 'ext-1', { ...incoming, price: 110000 } as never);
    expect((draft as unknown as { data: Record<string, unknown> }).data.price).toBe(110000);
  });

  it('queues a change to a published listing for review rather than applying it', async () => {
    mockPropertyFindOne.mockReturnValue(lean({ _id: new Types.ObjectId(), ...incoming }));
    mockDraftFindOne.mockResolvedValue(null);

    await expect(queueForReview(source, 'ext-1', { ...incoming, price: 80000 } as never)).resolves.toBe('queuedUpdate');
    expect(mockDraftFindOneAndUpdate).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        $set: expect.objectContaining({ kind: 'update', status: 'pending', changedFields: ['price'] }),
      }),
      expect.anything()
    );
    expect(mockPropertyUpdateOne).not.toHaveBeenCalled();
  });

  it('does not re-ask about a change the owner already rejected', async () => {
    const changed = { ...incoming, price: 80000 };
    mockPropertyFindOne.mockReturnValue(lean({ _id: new Types.ObjectId(), ...incoming }));
    mockDraftFindOne.mockResolvedValue(draftDoc({ status: 'rejected', incomingHash: hashReviewFields(changed) }));

    await expect(queueForReview(source, 'ext-1', changed as never)).resolves.toBe('skipped');
    expect(mockDraftFindOneAndUpdate).not.toHaveBeenCalled();
  });

  it('only touches the fetch time when the published listing is unchanged', async () => {
    mockPropertyFindOne.mockReturnValue(lean({ _id: new Types.ObjectId(), ...incoming }));
    mockDraftFindOne.mockResolvedValue(null);

    await expect(queueForReview(source, 'ext-1', incoming as never)).resolves.toBe('unchanged');
    expect(mockPropertyUpdateOne).toHaveBeenCalledWith(expect.anything(), {
      $set: { sourceFetchedAt: expect.any(Date) },
    });
  });
});

describe('acceptDraft', () => {
  const pendingNew = () =>
    draftDoc({
      _id: new Types.ObjectId(),
      source: (source as { _id: Types.ObjectId })._id,
      sourceListingId: 'ext-1',
      kind: 'new',
      status: 'pending',
      data: incoming,
      original: incoming,
    });

  it('refuses to publish past the monthly listing limit', async () => {
    mockDraftFindOne.mockResolvedValue(pendingNew());
    mockSourceFindOne.mockResolvedValue({ slug: 'user-feed' });
    mockGetMonthlyUsage.mockResolvedValue({ remaining: 0 });

    await expect(acceptDraft(userId, 'id')).rejects.toMatchObject({ code: 'LISTING_LIMIT_REACHED' });
    expect(mockPropertyFindOneAndUpdate).not.toHaveBeenCalled();
  });

  it('refuses to publish a draft without a city', async () => {
    mockDraftFindOne.mockResolvedValue({ ...pendingNew(), data: { ...incoming, city: undefined } });
    mockSourceFindOne.mockResolvedValue({ slug: 'user-feed' });

    await expect(acceptDraft(userId, 'id')).rejects.toMatchObject({ code: 'DRAFT_INCOMPLETE' });
  });

  it('publishes the edited listing as active and marks the draft accepted', async () => {
    const draft = pendingNew();
    const propertyId = new Types.ObjectId();
    mockDraftFindOne.mockResolvedValue(draft);
    mockSourceFindOne.mockResolvedValue({ slug: 'user-feed' });
    mockGetMonthlyUsage.mockResolvedValue({ remaining: 3 });
    mockPropertyFindOneAndUpdate.mockResolvedValue({ _id: propertyId, toObject: () => ({}) });

    await expect(acceptDraft(userId, 'id')).resolves.toMatchObject({ kind: 'new' });
    expect(mockPropertyFindOneAndUpdate).toHaveBeenCalledWith(
      { source: 'user-feed', sourceListingId: 'ext-1' },
      expect.objectContaining({ $set: expect.objectContaining({ status: 'active', price: 100000 }) }),
      expect.anything()
    );
    expect(draft).toMatchObject({ status: 'accepted', propertyId });
  });

  it('will not accept a draft twice', async () => {
    mockDraftFindOne.mockResolvedValue({ ...pendingNew(), status: 'accepted' });
    await expect(acceptDraft(userId, 'id')).rejects.toMatchObject({ code: 'DRAFT_NOT_PENDING' });
  });
});

describe('getDraft', () => {
  it('returns the listing as it would be published, without owner or scrape internals', async () => {
    mockDraftFindOne.mockResolvedValue(
      draftDoc({
        _id: new Types.ObjectId(),
        source: new Types.ObjectId(),
        kind: 'new',
        status: 'pending',
        changedFields: [],
        fetchedAt: new Date(),
        data: {
          ...incoming,
          amenities: ['pool'],
          sellerId: new Types.ObjectId(),
          createdByEmail: 'agent@example.com',
          createdByName: 'Agent',
          sourceMetadata: { raw: '<html>' },
        },
        original: incoming,
      })
    );

    const draft = await getDraft(userId, 'id');
    expect(draft.sourceName).toBe('century21albania.com');
    expect(draft.listing).toMatchObject({ title: 'Flat', amenities: ['pool'] });
    for (const hidden of ['sellerId', 'createdByEmail', 'createdByName', 'sourceMetadata']) {
      expect(draft.listing).not.toHaveProperty(hidden);
    }
  });
});

describe('linkPublishedDraft', () => {
  const pendingNew = () =>
    draftDoc({
      _id: new Types.ObjectId(),
      source: new Types.ObjectId(),
      sourceSlug: 'user-feed',
      sourceListingId: 'ext-1',
      sourceUrl: 'https://src.example/1',
      kind: 'new',
      status: 'pending',
      data: { ...incoming, sourceMetadata: { originalImages: ['https://src.example/a.jpg'] } },
    });
  const created = { _id: new Types.ObjectId(), source: undefined };

  it('ties a listing published through the listing form back to its feed item', async () => {
    const draft = pendingNew();
    mockDraftFindOne.mockResolvedValue(draft);
    mockPropertyFindOne.mockReturnValue({ select: async () => created });
    mockPropertyExists.mockResolvedValue(null);

    await linkPublishedDraft(userId, 'id', 'pid');
    expect(mockPropertyUpdateOne).toHaveBeenCalledWith(
      { _id: created._id },
      {
        $set: expect.objectContaining({
          source: 'user-feed',
          sourceListingId: 'ext-1',
          sourceMetadata: { originalImages: ['https://src.example/a.jpg'] },
        }),
      }
    );
    expect(draft).toMatchObject({ status: 'accepted', propertyId: created._id });
  });

  it('refuses a listing that belongs to someone else', async () => {
    mockDraftFindOne.mockResolvedValue(pendingNew());
    mockPropertyFindOne.mockReturnValue({ select: async () => null });
    await expect(linkPublishedDraft(userId, 'id', 'pid')).rejects.toMatchObject({ code: 'PROPERTY_NOT_FOUND' });
    expect(mockPropertyUpdateOne).not.toHaveBeenCalled();
  });

  it('refuses when the feed item was already published', async () => {
    mockDraftFindOne.mockResolvedValue(pendingNew());
    mockPropertyFindOne.mockReturnValue({ select: async () => created });
    mockPropertyExists.mockResolvedValue({ _id: new Types.ObjectId() });
    await expect(linkPublishedDraft(userId, 'id', 'pid')).rejects.toMatchObject({ code: 'DRAFT_ALREADY_PUBLISHED' });
  });
});
