import mongoose from 'mongoose';
import Development from '../models/Development';
import DevelopmentBuilding from '../models/DevelopmentBuilding';
import DevelopmentEntrance from '../models/DevelopmentEntrance';
import DevelopmentFloor from '../models/DevelopmentFloor';
import DevelopmentUnit from '../models/DevelopmentUnit';
import DevelopmentMembership from '../models/DevelopmentMembership';
import DevelopmentClaim from '../models/DevelopmentClaim';
import DevelopmentScene from '../models/DevelopmentScene';
import Property from '../models/Property';
import { logger } from '../utils/logger';

/**
 * Migration: Developments / Residences foundation.
 *
 * This migration is deliberately NON-DESTRUCTIVE and idempotent. The feature's
 * schema changes are purely additive:
 *
 *  - The new development_* collections are created lazily; here we only ensure
 *    their indexes exist (`syncIndexes`), so the first production writes don't
 *    pay the index-build cost and uniqueness is enforced from the start.
 *  - Property gains optional development reference fields. Existing listings
 *    need NO backfill — an absent ref means "standalone listing", which is
 *    exactly what every current listing is. We only build the new Property
 *    indexes.
 *
 * Because nothing is rewritten, rollback is simply reverting the deploy;
 * `down()` drops the empty collections only if they are empty, and never
 * touches Property documents.
 */

const DEVELOPMENT_MODELS = [
  Development,
  DevelopmentBuilding,
  DevelopmentEntrance,
  DevelopmentFloor,
  DevelopmentUnit,
  DevelopmentMembership,
  DevelopmentClaim,
  DevelopmentScene,
];

export async function up(): Promise<void> {
  try {
    logger.info('Developments migration: ensuring indexes...');

    for (const model of DEVELOPMENT_MODELS) {
      await model.syncIndexes();
      logger.info(`  indexes synced for ${model.modelName}`);
    }

    // Build the new Property indexes (developmentId/unitId + compound) without
    // touching any document. syncIndexes is safe to re-run.
    await Property.syncIndexes();
    logger.info('  indexes synced for Property');

    logger.info('Developments migration completed successfully');
  } catch (error) {
    logger.error('Developments migration failed:', error);
    throw error;
  }
}

/**
 * Rollback. Safe by construction: only drops development_* collections that are
 * empty, and leaves Property documents and their optional fields alone (the
 * fields are harmless when unused). Dropping a non-empty collection would be
 * data loss, so we refuse it and tell the operator.
 */
export async function down(): Promise<void> {
  try {
    logger.warn('Rolling back developments migration (empty collections only)...');

    for (const model of DEVELOPMENT_MODELS) {
      const count = await model.estimatedDocumentCount();
      if (count > 0) {
        logger.warn(
          `  skipping ${model.modelName}: ${count} documents present (refusing to drop)`
        );
        continue;
      }
      const name = model.collection.collectionName;
      const exists = await mongoose.connection.db
        ?.listCollections({ name })
        .hasNext();
      if (exists) {
        await model.collection.drop();
        logger.info(`  dropped empty collection ${name}`);
      }
    }

    logger.info('Developments rollback completed');
  } catch (error) {
    logger.error('Developments rollback failed:', error);
    throw error;
  }
}
