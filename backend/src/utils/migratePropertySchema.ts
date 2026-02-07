import Property from '../models/Property';
import { dbLogger } from './logger';

/**
 * Ensures all property documents have every field defined in the schema
 * with proper default values. This keeps production in sync with development.
 *
 * Safe to run multiple times — uses $ifNull so existing values are never overwritten.
 */
export const migratePropertySchema = async (): Promise<{ commonUpdated: number; rentalUpdated: number }> => {
  // Step 1: Add missing common fields to ALL properties
  const commonResult = await Property.updateMany(
    {},
    [
      {
        $set: {
          listingType: { $ifNull: ['$listingType', 'sale'] },
          hasBalcony: { $ifNull: ['$hasBalcony', false] },
          hasGarden: { $ifNull: ['$hasGarden', false] },
          hasElevator: { $ifNull: ['$hasElevator', false] },
          hasSecurity: { $ifNull: ['$hasSecurity', false] },
          hasAirConditioning: { $ifNull: ['$hasAirConditioning', false] },
          hasPool: { $ifNull: ['$hasPool', false] },
          petsAllowed: { $ifNull: ['$petsAllowed', false] },
          hasVirtualTour360: { $ifNull: ['$hasVirtualTour360', false] },
          hasGeneratedVideo: { $ifNull: ['$hasGeneratedVideo', false] },
          isPromoted: { $ifNull: ['$isPromoted', false] },
          hasUrgentBadge: { $ifNull: ['$hasUrgentBadge', false] },
          specialFeatures: { $ifNull: ['$specialFeatures', []] },
          materials: { $ifNull: ['$materials', []] },
          amenities: { $ifNull: ['$amenities', []] },
          views: { $ifNull: ['$views', 0] },
          saves: { $ifNull: ['$saves', 0] },
          inquiries: { $ifNull: ['$inquiries', 0] },
          priceIntervals: { $ifNull: ['$priceIntervals', []] },
        },
      },
    ]
  );

  // Step 2: Add missing rental-specific fields to all rent listings
  const rentalResult = await Property.updateMany(
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
 */
export const ensurePropertySchemaSync = async (): Promise<void> => {
  try {
    const { commonUpdated, rentalUpdated } = await migratePropertySchema();

    if (commonUpdated > 0 || rentalUpdated > 0) {
      dbLogger.info(`🔧 Property schema sync: ${commonUpdated} properties updated, ${rentalUpdated} rental listings updated`);
    } else {
      dbLogger.info('✅ Property schema is up to date');
    }
  } catch (error) {
    dbLogger.error('❌ Error syncing property schema:', error);
  }
};
