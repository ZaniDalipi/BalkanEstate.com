import Property from '../models/Property';
import User from '../models/User';
import { cronLogger } from '../utils/logger';
import { invalidateCache } from '../middleware/cache';

/**
 * Automatically transitions rented properties back to active
 * when their rentedUntil date has passed.
 *
 * For each expired rental:
 * 1. Saves the rental period to rentalHistory
 * 2. Sets status to 'active'
 * 3. Sets availableFrom to the day after rentedUntil
 * 4. Clears rentedAt and rentedUntil
 * 5. Increments the owner's listingsCount
 */
export const processExpiredRentals = async (): Promise<{ transitioned: number; errors: number }> => {
  const now = new Date();
  let transitioned = 0;
  let errors = 0;

  try {
    // Find all rented properties whose rental period has ended
    const expiredRentals = await Property.find({
      status: 'rented',
      rentedUntil: { $exists: true, $lte: now },
    });

    if (expiredRentals.length === 0) {
      return { transitioned: 0, errors: 0 };
    }

    cronLogger.info(`Found ${expiredRentals.length} rental(s) with expired rentedUntil dates`);

    for (const property of expiredRentals) {
      try {
        // Calculate monthly rent equivalent for history
        let monthlyRent = property.price;
        if (property.rentPeriod === 'weekly') monthlyRent = property.price * 4.33;
        else if (property.rentPeriod === 'daily') monthlyRent = property.price * 30;

        // Save current rental period to history
        if (property.rentedAt) {
          await Property.updateOne(
            { _id: property._id },
            {
              $push: {
                rentalHistory: {
                  startDate: property.rentedAt,
                  endDate: property.rentedUntil,
                  monthlyRent,
                },
              },
            }
          );
        }

        // Compute availableFrom as the day after rentedUntil
        const availableFromDate = new Date(property.rentedUntil!);
        availableFromDate.setDate(availableFromDate.getDate() + 1);
        availableFromDate.setHours(0, 0, 0, 0);

        // Transition property to active
        await Property.updateOne(
          { _id: property._id },
          {
            $set: {
              status: 'active',
              availableFrom: availableFromDate,
            },
            $unset: {
              rentedAt: 1,
              rentedUntil: 1,
            },
          }
        );

        // Increment the owner's listing count back
        await User.updateOne(
          { _id: property.sellerId, listingsCount: { $gte: 0 } },
          { $inc: { listingsCount: 1 } }
        );

        transitioned++;
        cronLogger.info(
          `Transitioned property ${property._id} (${property.title || property.address}) from rented to active`
        );
      } catch (err) {
        errors++;
        cronLogger.error(`Failed to transition property ${property._id}:`, err);
      }
    }

    // Invalidate properties cache so changes appear immediately
    if (transitioned > 0) {
      invalidateCache('/api/properties');
    }
  } catch (err) {
    cronLogger.error('Error in processExpiredRentals job:', err);
  }

  return { transitioned, errors };
};
