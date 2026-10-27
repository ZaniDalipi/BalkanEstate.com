/**
 * Keeps residence units consistent when listings are hard-deleted: the deleted
 * Property ids are pulled from DevelopmentUnit.listingIds and cleared as a
 * primaryListingId. Registered on the Property schema; covers doc.deleteOne(),
 * findOneAndDelete / findByIdAndDelete and deleteMany. Best-effort — a failure
 * here is logged and never fails the delete (reads already skip missing
 * listings).
 */
import mongoose, { type Schema, type Query } from 'mongoose';
import { createLogger } from '../../utils/logger';

const log = createLogger('ListingDevelopmentCleanup');

/** Remove the given listing ids from every development unit that references them. */
export const detachDeletedListings = async (ids: unknown[]): Promise<void> => {
  if (ids.length === 0) return;
  // Resolved lazily: the unit model may not be registered when Property loads.
  const Unit = mongoose.models.DevelopmentUnit;
  if (!Unit) return;
  try {
    await Unit.updateMany({ listingIds: { $in: ids } }, { $pull: { listingIds: { $in: ids } } });
    await Unit.updateMany({ primaryListingId: { $in: ids } }, { $unset: { primaryListingId: 1 } });
  } catch (err) {
    log.warn('Could not detach deleted listings from development units:', err);
  }
};

const pendingIds = new WeakMap<object, unknown[]>();

export const registerListingDevelopmentCleanup = (schema: Schema): void => {
  schema.post('deleteOne', { document: true, query: false }, async function (doc: { _id: unknown }) {
    await detachDeletedListings([doc._id]);
  });

  schema.post('findOneAndDelete', async function (doc: { _id: unknown } | null) {
    if (doc) await detachDeletedListings([doc._id]);
  });

  // deleteMany has no documents afterwards, so capture the ids first.
  schema.pre('deleteMany', async function (this: Query<unknown, unknown>) {
    try {
      const ids = await this.model.find(this.getFilter()).distinct('_id');
      pendingIds.set(this, ids);
    } catch (err) {
      log.warn('Could not resolve listings for development cleanup:', err);
    }
  });
  schema.post('deleteMany', async function (this: Query<unknown, unknown>) {
    const ids = pendingIds.get(this) ?? [];
    pendingIds.delete(this);
    await detachDeletedListings(ids);
  });
};
