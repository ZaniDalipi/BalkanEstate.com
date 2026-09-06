process.env.SKIP_TEST_DB = 'true';

import Property from '../models/Property';
import { SUBSCRIPTION_STORES } from '../models/Subscription';
import Subscription from '../models/Subscription';
import { TYPE_ATTRIBUTES, attributesForType, normalizeTypeAttributes } from '../config/typeAttributes';
import { ALLOWED_PROPERTY_FIELDS, ALLOWED_UPDATE_FIELDS } from '../controllers/propertyController';

/**
 * A listing carries only the attributes its type has — the client strips the
 * rest before submitting, and the schema's pre-validate hook strips them
 * again server-side. The schema then has to agree that their absence is
 * correct: while `beds`, `baths` and `livingRooms` were unconditionally
 * required, every land, parking and commercial listing was rejected with a
 * 400 "Validation failed" naming three fields the form was right not to send.
 */
const listing = (overrides: Record<string, unknown>) => new Property({
  sellerId: '507f1f77bcf86cd799439011',
  createdAsRole: 'private_seller',
  createdByName: 'Seller',
  createdByEmail: 'seller@example.com',
  listingType: 'sale',
  title: 'A listing',
  price: 120000,
  address: 'Rruga 1',
  city: 'Tirana',
  country: 'Albania',
  sqft: 400,
  yearBuilt: 2010,
  description: 'Description',
  imageUrl: 'https://example.com/a.jpg',
  lat: 41.32,
  lng: 19.81,
  ...overrides,
});

/**
 * Validated the way a save does — asynchronously, so the pre-validate hooks
 * that strip the attributes a type does not carry actually run. `validateSync`
 * skips them and would test a document no write ever produces.
 */
const failedPaths = async (doc: ReturnType<typeof listing>): Promise<string[]> => {
  try {
    await doc.validate();
    return [];
  } catch (error) {
    return Object.keys((error as { errors: Record<string, unknown> }).errors);
  }
};

describe('room counts are required only where the type has them', () => {
  it.each(['land', 'parking', 'commercial'])(
    'accepts a %s listing that sends no bedroom, bathroom or living room count',
    async (propertyType) => {
      expect(await failedPaths(listing({ propertyType }))).toEqual([]);
    },
  );

  it.each(['house', 'apartment', 'villa', 'luxury-villa'])(
    'still asks a %s listing for its room counts',
    async (propertyType) => {
      expect((await failedPaths(listing({ propertyType }))).sort()).toEqual(['baths', 'beds', 'livingRooms']);
    },
  );

  it('accepts a residential listing once the counts are supplied', async () => {
    const doc = listing({ propertyType: 'apartment', beds: 2, baths: 1, livingRooms: 1 });
    expect(await failedPaths(doc)).toEqual([]);
    expect(doc.get('beds')).toBe(2);
  });

  it('requires each count exactly where the type table says it belongs', async () => {
    for (const propertyType of ['house', 'apartment', 'villa', 'luxury-villa', 'commercial', 'parking', 'land', 'other']) {
      const attributes = attributesForType(propertyType);
      const required = await failedPaths(listing({ propertyType }));
      for (const field of ['beds', 'baths', 'livingRooms']) {
        expect(required.includes(field)).toBe(attributes.includes(field as never));
      }
    }
  });

  it('files no room count on a type that has none, rather than a zero', async () => {
    const doc = listing({ propertyType: 'land', beds: 3, baths: 2 });
    expect(await failedPaths(doc)).toEqual([]);
    expect(doc.get('beds')).toBeUndefined();
    expect(doc.get('baths')).toBeUndefined();
  });
});

/**
 * The agency system issues subscriptions with `store: 'agency_creation'`. The
 * schema enum was a hand-copy of the `SubscriptionStore` union that had lost
 * that member, so those writes type-checked and then failed on save — the
 * /auth/me auto-sync logged "`agency_creation` is not a valid enum value" on
 * every request and never persisted the subscription.
 */
describe('every subscription store the type allows can be saved', () => {
  it.each(SUBSCRIPTION_STORES)('accepts store %s', (store) => {
    const doc = new Subscription({
      userId: '507f1f77bcf86cd799439011',
      store,
      productId: 'pro_monthly',
      purchaseDate: new Date(),
      expirationDate: new Date(Date.now() + 86400000),
    });
    const error = doc.validateSync();
    expect(error?.errors?.store).toBeUndefined();
  });
});

/**
 * The write allow-list drops anything it does not name. It named the room
 * counts by hand and had never gained 'openPlanArea' or 'parkingType', so a
 * shop's open-plan area and a garage's arrangement were collected from the
 * seller, sent, and thrown away before the save — the listing then showed
 * zeroes it had never been given.
 */
describe('the write allow-list carries every type attribute', () => {
  it.each(TYPE_ATTRIBUTES)('accepts %s', (attribute) => {
    expect(ALLOWED_PROPERTY_FIELDS as readonly string[]).toContain(attribute);
  });

  it('lets each one be changed on an existing listing too', () => {
    for (const attribute of TYPE_ATTRIBUTES) {
      expect(ALLOWED_UPDATE_FIELDS).toContain(attribute);
    }
  });
});

/** An area is measured, not counted — an open-plan floor can be 102.5 m². */
describe('areas may be fractional, counts may not', () => {
  it('stores a fractional open-plan area', () => {
    const result = normalizeTypeAttributes('commercial', { openPlanArea: 102.5 });
    expect(result.ok).toBe(true);
    expect(result.fields.openPlanArea).toBe(102.5);
  });

  it('still refuses half an office', () => {
    expect(normalizeTypeAttributes('commercial', { offices: 1.5 }).ok).toBe(false);
  });

  it('refuses a negative or absurd area', () => {
    expect(normalizeTypeAttributes('commercial', { openPlanArea: -1 }).ok).toBe(false);
    expect(normalizeTypeAttributes('commercial', { openPlanArea: 100000 }).ok).toBe(false);
  });

  it('saves a shop with its offices and open-plan area intact', async () => {
    const doc = listing({ propertyType: 'commercial', offices: 4, openPlanArea: 102.5, toilets: 2 });
    expect(await failedPaths(doc)).toEqual([]);
    expect(doc.get('offices')).toBe(4);
    expect(doc.get('openPlanArea')).toBe(102.5);
  });

  it('saves a garage with its spaces and arrangement intact', async () => {
    const doc = listing({ propertyType: 'parking', parking: 2, parkingType: 'underground' });
    expect(await failedPaths(doc)).toEqual([]);
    expect(doc.get('parking')).toBe(2);
    expect(doc.get('parkingType')).toBe('underground');
  });
});
