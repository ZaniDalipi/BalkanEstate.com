import { cronLogger } from '../utils/logger';
import Property from '../models/Property';
import User from '../models/User';
import { invalidateCache } from '../middleware/cache';

/**
 * Rental Expiry Job
 *
 * Automatically marks rented properties as available when their
 * rentedUntil date has passed. Runs hourly via cron.
 *
 * When a property's rentedUntil date expires:
 * 1. Status changes from 'rented' to 'active'
 * 2. Rental period is saved to rentalHistory
 * 3. Owner's listing count is incremented back
 * 4. Cache is invalidated for immediate visibility
 */
export const processExpiredRentals = async (): Promise<number> => {
  // Use start of today so properties rented until today stay rented all day
  // and only get released the next day
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Find all rented properties where the rental period ended before today
  // (rentedUntil < today means the date has fully passed)
  const expiredRentals = await Property.find({
    status: 'rented',
    rentedUntil: { $lt: today },
  });

  if (expiredRentals.length === 0) {
    return 0;
  }

  let processed = 0;

  for (const property of expiredRentals) {
    try {
      // Save rental period to history
      if (property.rentedAt) {
        let monthlyRent = property.price;
        if (property.rentPeriod === 'weekly') monthlyRent = property.price * 4.33;
        else if (property.rentPeriod === 'daily') monthlyRent = property.price * 30;

        await Property.updateOne(
          { _id: property._id },
          {
            $push: {
              rentalHistory: {
                startDate: property.rentedAt,
                endDate: property.rentedUntil,
                monthlyRent,
                ...(property.currentTenantName && { tenantName: property.currentTenantName }),
                ...(property.currentRentalNotes && { notes: property.currentRentalNotes }),
              },
            },
          }
        );
      }

      // Mark as active and clear rental fields
      await Property.updateOne(
        { _id: property._id },
        {
          $set: {
            status: 'active',
            availableFrom: new Date(),
          },
          $unset: {
            rentedAt: 1,
            rentedUntil: 1,
            currentTenantName: 1,
            currentRentalNotes: 1,
          },
        }
      );

      // Increment owner's listing count back
      await User.updateOne(
        { _id: property.sellerId },
        { $inc: { listingsCount: 1 } }
      );

      cronLogger.info(
        `🏠 Auto-released rental: ${property.title || property._id} (owner: ${property.sellerId})`
      );
      processed++;
    } catch (error) {
      cronLogger.error(
        `Failed to auto-release rental ${property._id}:`,
        error
      );
    }
  }

  // Invalidate cache if any properties were updated
  if (processed > 0) {
    invalidateCache('/api/properties');
  }

  return processed;
};
