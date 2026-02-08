import mongoose from 'mongoose';
import { dbLogger } from './logger';

/**
 * Ensures all property documents have every field defined in the schema
 * with proper default values. This keeps production in sync with development.
 *
 * Uses the NATIVE MongoDB driver directly (not Mongoose) to bypass strict mode
 * and guarantee fields are written to the database regardless of schema config.
 *
 * Safe to run multiple times — uses $ifNull so existing values are never overwritten.
 */
export const migratePropertySchema = async (): Promise<{ commonUpdated: number; rentalUpdated: number }> => {
  const db = mongoose.connection.db;
  if (!db) {
    throw new Error('Database not connected');
  }

  // Use native MongoDB collection to bypass Mongoose strict mode
  const collection = db.collection('properties');

  // Step 1: Add missing common fields to ALL properties
  const commonResult = await collection.updateMany(
    {},
    [
      {
        $set: {
          // Core listing type
          listingType: { $ifNull: ['$listingType', 'sale'] },
          status: { $ifNull: ['$status', 'active'] },
          createdAsRole: { $ifNull: ['$createdAsRole', 'private_seller'] },

          // Boolean amenities
          hasBalcony: { $ifNull: ['$hasBalcony', false] },
          hasGarden: { $ifNull: ['$hasGarden', false] },
          hasElevator: { $ifNull: ['$hasElevator', false] },
          hasSecurity: { $ifNull: ['$hasSecurity', false] },
          hasAirConditioning: { $ifNull: ['$hasAirConditioning', false] },
          hasPool: { $ifNull: ['$hasPool', false] },
          petsAllowed: { $ifNull: ['$petsAllowed', false] },

          // Virtual tour / video flags
          hasVirtualTour360: { $ifNull: ['$hasVirtualTour360', false] },
          hasGeneratedVideo: { $ifNull: ['$hasGeneratedVideo', false] },

          // Promotion flags
          isPromoted: { $ifNull: ['$isPromoted', false] },
          hasUrgentBadge: { $ifNull: ['$hasUrgentBadge', false] },

          // Array fields
          specialFeatures: { $ifNull: ['$specialFeatures', []] },
          materials: { $ifNull: ['$materials', []] },
          amenities: { $ifNull: ['$amenities', []] },
          priceIntervals: { $ifNull: ['$priceIntervals', []] },

          // Numeric counters
          views: { $ifNull: ['$views', 0] },
          saves: { $ifNull: ['$saves', 0] },
          inquiries: { $ifNull: ['$inquiries', 0] },
          parking: { $ifNull: ['$parking', 0] },
        },
      },
    ]
  );

  // Step 2: Add missing rental-specific fields to all rent listings
  const rentalResult = await collection.updateMany(
    { listingType: 'rent' },
    [
      {
        $set: {
          rentPeriod: { $ifNull: ['$rentPeriod', 'monthly'] },
          securityDeposit: { $ifNull: ['$securityDeposit', 0] },
          minimumLeaseDuration: { $ifNull: ['$minimumLeaseDuration', 1] },
          maximumLeaseDuration: { $ifNull: ['$maximumLeaseDuration', 12] },
          utilitiesIncluded: { $ifNull: ['$utilitiesIncluded', false] },
          internetIncluded: { $ifNull: ['$internetIncluded', false] },
          tenantRequirements: { $ifNull: ['$tenantRequirements', []] },
          maxOccupants: { $ifNull: ['$maxOccupants', 1] },
        },
      },
    ]
  );

  return {
    commonUpdated: commonResult.modifiedCount,
    rentalUpdated: rentalResult.modifiedCount,
  };
};

/**
 * Run on server startup to keep property schema in sync across environments.
 * Logs results so deployment success can be verified in server logs.
 */
export const ensurePropertySchemaSync = async (): Promise<void> => {
  try {
    dbLogger.info('🔄 Running property schema migration...');
    const { commonUpdated, rentalUpdated } = await migratePropertySchema();

    if (commonUpdated > 0 || rentalUpdated > 0) {
      dbLogger.info(`🔧 Property schema sync: ${commonUpdated} properties updated, ${rentalUpdated} rental listings updated`);
    } else {
      dbLogger.info('✅ Property schema is up to date — all fields present');
    }

    // Log total counts for verification
    const db = mongoose.connection.db;
    if (db) {
      const collection = db.collection('properties');
      const totalCount = await collection.countDocuments();
      const rentCount = await collection.countDocuments({ listingType: 'rent' });
      const saleCount = await collection.countDocuments({ listingType: 'sale' });
      dbLogger.info(`📊 Properties: ${totalCount} total (${saleCount} sale, ${rentCount} rent)`);
    }
  } catch (error) {
    dbLogger.error('❌ Error syncing property schema:', error);
  }
};
