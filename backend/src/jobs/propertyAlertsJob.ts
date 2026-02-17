/**
 * Property Alerts Job
 *
 * Handles two types of alerts:
 * 1. New Listing Alerts - When new properties match saved searches
 * 2. Price Drop Alerts - When saved/favorited properties have price reductions
 *
 * NOTE: Alerts are only sent to users with active subscriptions (buyer or pro tier)
 */

import Property, { IProperty } from '../models/Property';
import SavedSearch, { IFilters } from '../models/SavedSearch';
import { cronLogger } from '../utils/logger';
import Favorite from '../models/Favorite';
import PropertyAlert from '../models/PropertyAlert';
import PriceHistory from '../models/PriceHistory';
import { sendPropertyAlert, sendPriceDropAlert, sendSavedSearchPriceDropAlert, sendNewListingsDigest } from '../services/emailService';

// Subscription tiers that have access to property alerts
const ALERT_ELIGIBLE_TIERS = ['buyer', 'pro', 'agency_owner', 'agency_agent'];
const ALERT_ELIGIBLE_STATUSES = ['active', 'trial', 'grace', 'pending_cancellation'];

/**
 * Check if a property matches saved search filters
 */
function propertyMatchesFilters(property: IProperty, filters: IFilters): boolean {
  // Price range
  if (filters.minPrice && property.price < filters.minPrice) return false;
  if (filters.maxPrice && property.price > filters.maxPrice) return false;

  // Beds, baths, living rooms
  if (filters.beds && property.beds < filters.beds) return false;
  if (filters.baths && property.baths < filters.baths) return false;
  if (filters.livingRooms && property.livingRooms < filters.livingRooms) return false;

  // Square footage
  if (filters.minSqft && property.sqft < filters.minSqft) return false;
  if (filters.maxSqft && property.sqft > filters.maxSqft) return false;

  // Country
  if (filters.country && filters.country !== 'all' && property.country !== filters.country) return false;

  // Property type
  if (filters.propertyType && filters.propertyType !== 'any' && property.propertyType !== filters.propertyType) return false;

  // Year built
  if (filters.minYearBuilt && property.yearBuilt < filters.minYearBuilt) return false;
  if (filters.maxYearBuilt && property.yearBuilt > filters.maxYearBuilt) return false;

  // Parking
  if (filters.minParking && property.parking < filters.minParking) return false;

  // Furnishing, heating, condition, etc.
  if (filters.furnishing && filters.furnishing !== 'any' && property.furnishing !== filters.furnishing) return false;
  if (filters.heatingType && filters.heatingType !== 'any' && property.heatingType !== filters.heatingType) return false;
  if (filters.condition && filters.condition !== 'any' && property.condition !== filters.condition) return false;
  if (filters.viewType && filters.viewType !== 'any' && property.viewType !== filters.viewType) return false;
  if (filters.energyRating && filters.energyRating !== 'any' && property.energyRating !== filters.energyRating) return false;

  // Boolean amenities
  if (filters.hasBalcony === true && !property.hasBalcony) return false;
  if (filters.hasGarden === true && !property.hasGarden) return false;
  if (filters.hasElevator === true && !property.hasElevator) return false;
  if (filters.hasSecurity === true && !property.hasSecurity) return false;
  if (filters.hasAirConditioning === true && !property.hasAirConditioning) return false;
  if (filters.hasPool === true && !property.hasPool) return false;
  if (filters.petsAllowed === true && !property.petsAllowed) return false;

  // Floor number
  if (filters.minFloorNumber && property.floorNumber && property.floorNumber < filters.minFloorNumber) return false;
  if (filters.maxFloorNumber && property.floorNumber && property.floorNumber > filters.maxFloorNumber) return false;

  // Distance filters
  if (filters.maxDistanceToCenter && property.distanceToCenter && property.distanceToCenter > filters.maxDistanceToCenter) return false;
  if (filters.maxDistanceToSea && property.distanceToSea && property.distanceToSea > filters.maxDistanceToSea) return false;
  if (filters.maxDistanceToSchool && property.distanceToSchool && property.distanceToSchool > filters.maxDistanceToSchool) return false;
  if (filters.maxDistanceToHospital && property.distanceToHospital && property.distanceToHospital > filters.maxDistanceToHospital) return false;

  // Text query (search in address, city, description)
  if (filters.query && filters.query.trim()) {
    const query = filters.query.toLowerCase();
    const searchableText = `${property.address} ${property.city} ${property.description || ''} ${property.title || ''}`.toLowerCase();
    if (!searchableText.includes(query)) return false;
  }

  return true;
}

/**
 * Check if property is within drawn bounds
 * Supports two formats:
 * 1. Leaflet bounds: { _southWest: { lat, lng }, _northEast: { lat, lng } }
 * 2. GeoJSON polygon: { coordinates: [[[lng, lat], ...]] }
 */
function propertyInBounds(property: IProperty, drawnBoundsJSON: string | null): boolean {
  if (!drawnBoundsJSON) return true; // No bounds = match all

  try {
    const bounds = JSON.parse(drawnBoundsJSON);
    if (!bounds) return true;

    // Handle Leaflet bounds format (rectangle)
    if (bounds._southWest && bounds._northEast) {
      const sw = bounds._southWest;
      const ne = bounds._northEast;

      // Check if property is within the rectangle
      const lat = property.lat;
      const lng = property.lng;

      const inLatRange = lat >= sw.lat && lat <= ne.lat;
      const inLngRange = lng >= sw.lng && lng <= ne.lng;

      return inLatRange && inLngRange;
    }

    // Handle GeoJSON polygon format
    if (bounds.coordinates && Array.isArray(bounds.coordinates[0])) {
      const point = [property.lng, property.lat];
      const polygon = bounds.coordinates[0];

      // Ray casting algorithm for point-in-polygon
      let inside = false;
      for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const xi = polygon[i][0], yi = polygon[i][1];
        const xj = polygon[j][0], yj = polygon[j][1];

        if (((yi > point[1]) !== (yj > point[1])) &&
            (point[0] < (xj - xi) * (point[1] - yi) / (yj - yi) + xi)) {
          inside = !inside;
        }
      }
      return inside;
    }

    return true; // Unknown format, include the property
  } catch {
    return true; // If bounds parsing fails, include the property
  }
}

/**
 * Process new listing alerts for all saved searches
 * Runs every 15 minutes for instant alerts, or as scheduled for daily/weekly
 */
export async function processNewListingAlerts(frequency: 'instant' | 'daily' | 'weekly' = 'instant'): Promise<void> {
  cronLogger.info(`🔔 Processing ${frequency} new listing alerts...`);

  try {
    // Get all saved searches with alerts enabled for this frequency
    const savedSearches = await SavedSearch.find({
      alertsEnabled: true,
      alertFrequency: frequency,
    }).populate('userId', 'email name subscription');

    if (savedSearches.length === 0) {
      cronLogger.info('   No saved searches with alerts enabled');
      return;
    }

    // Filter to only users with active subscriptions (buyer or pro tier)
    const eligibleSearches = savedSearches.filter(search => {
      const user = search.userId as any;
      if (!user || !user.subscription) return false;

      const { tier, status } = user.subscription;
      const isEligibleTier = ALERT_ELIGIBLE_TIERS.includes(tier);
      const isActiveStatus = ALERT_ELIGIBLE_STATUSES.includes(status);

      return isEligibleTier && isActiveStatus;
    });

    cronLogger.info(`   ${savedSearches.length} saved searches, ${eligibleSearches.length} with eligible subscriptions`);

    // Determine time window based on frequency
    let since: Date;
    switch (frequency) {
      case 'instant':
        since = new Date(Date.now() - 15 * 60 * 1000); // Last 15 minutes
        break;
      case 'daily':
        since = new Date(Date.now() - 24 * 60 * 60 * 1000); // Last 24 hours
        break;
      case 'weekly':
        since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // Last 7 days
        break;
    }

    // Get new active properties created since the time window
    const newProperties = await Property.find({
      status: 'active',
      createdAt: { $gte: since },
    });

    if (newProperties.length === 0) {
      cronLogger.info('   No new properties found');
      return;
    }

    if (eligibleSearches.length === 0) {
      cronLogger.info('   No users with eligible subscriptions');
      return;
    }

    cronLogger.info(`   Found ${newProperties.length} new properties, checking ${eligibleSearches.length} eligible saved searches`);

    // Process each saved search (only for users with active subscriptions)
    for (const search of eligibleSearches) {
      const user = search.userId as any;
      if (!user || !user.email) continue;

      // Find matching properties
      const matchingProperties = newProperties.filter(property => {
        // Skip if already seen
        if (search.seenPropertyIds.includes(String(property._id))) return false;

        // Check filters and bounds
        return propertyMatchesFilters(property, search.filters) &&
               propertyInBounds(property, search.drawnBoundsJSON);
      });

      if (matchingProperties.length === 0) continue;

      // Found matches for saved search

      // Create alerts and send notification
      const alertPromises = matchingProperties.map(property =>
        PropertyAlert.create({
          userId: user._id,
          propertyId: property._id,
          alertType: 'new_listing',
          savedSearchId: search._id,
          emailSent: false,
        })
      );
      await Promise.all(alertPromises);

      // Update seen property IDs
      const newSeenIds = matchingProperties.map(p => String(p._id));
      await SavedSearch.updateOne(
        { _id: search._id },
        {
          $addToSet: { seenPropertyIds: { $each: newSeenIds } },
          $set: { lastAlertSentAt: new Date() },
        }
      );

      // Send email notification
      try {
        if (frequency === 'instant' && matchingProperties.length <= 3) {
          // Send individual alerts for instant notifications
          for (const property of matchingProperties) {
            await sendPropertyAlert({
              recipientEmail: user.email,
              recipientName: user.name || 'User',
              searchName: search.name,
              property: {
                id: String(property._id),
                title: property.title || `${property.address}, ${property.city}`,
                address: property.address,
                city: property.city,
                price: property.price,
                beds: property.beds,
                baths: property.baths,
                sqft: property.sqft,
                imageUrl: property.imageUrl,
              },
            });

            // Mark alert as sent
            await PropertyAlert.updateOne(
              { userId: user._id, propertyId: property._id, alertType: 'new_listing' },
              { emailSent: true, emailSentAt: new Date() }
            );
          }
        } else {
          // Send digest for multiple properties or non-instant frequency
          await sendNewListingsDigest({
            recipientEmail: user.email,
            recipientName: user.name || 'User',
            searchName: search.name,
            properties: matchingProperties.map(p => ({
              id: String(p._id),
              title: p.title || `${p.address}, ${p.city}`,
              address: p.address,
              city: p.city,
              price: p.price,
              beds: p.beds,
              baths: p.baths,
              sqft: p.sqft,
              imageUrl: p.imageUrl,
            })),
            frequency,
          });

          // Mark all alerts as sent
          await PropertyAlert.updateMany(
            { userId: user._id, savedSearchId: search._id, emailSent: false },
            { emailSent: true, emailSentAt: new Date() }
          );
        }
      } catch (emailError) {
        cronLogger.error('   Failed to send property alert email:', emailError);
      }
    }

    cronLogger.info('✅ New listing alerts processed');
  } catch (error) {
    cronLogger.error('❌ Error processing new listing alerts:', error);
    throw error;
  }
}

/**
 * Process price drop alerts for favorited properties
 */
export async function processPriceDropAlerts(): Promise<void> {
  cronLogger.info('🔔 Processing price drop alerts...');

  try {
    // Get all favorites with price alerts enabled
    const favorites = await Favorite.find({
      priceAlertEnabled: true,
    }).populate('userId', 'email name subscription').populate('propertyId', 'title address city price beds baths sqft imageUrl');

    if (favorites.length === 0) {
      cronLogger.info('   No favorites with price alerts enabled');
      return;
    }

    // Filter to only users with active subscriptions
    const eligibleFavorites = favorites.filter(fav => {
      const user = fav.userId as any;
      if (!user || !user.subscription) return false;

      const { tier, status } = user.subscription;
      const isEligibleTier = ALERT_ELIGIBLE_TIERS.includes(tier);
      const isActiveStatus = ALERT_ELIGIBLE_STATUSES.includes(status);

      return isEligibleTier && isActiveStatus;
    });

    cronLogger.info(`   ${favorites.length} favorites with alerts, ${eligibleFavorites.length} with eligible subscriptions`);

    if (eligibleFavorites.length === 0) {
      cronLogger.info('   No users with eligible subscriptions');
      return;
    }

    let alertsSent = 0;

    for (const favorite of eligibleFavorites) {
      const user = favorite.userId as any;
      const property = favorite.propertyId as any;

      if (!user || !user.email || !property) continue;

      // Check if price has dropped
      const currentPrice = property.price;
      const savedPrice = favorite.priceAtSave || favorite.lastAlertedPrice || currentPrice;

      if (currentPrice >= savedPrice) continue;

      // Calculate price drop
      const priceDrop = savedPrice - currentPrice;
      const percentageDrop = Math.round((priceDrop / savedPrice) * 100);

      // Only alert for significant drops (at least 1%)
      if (percentageDrop < 1) continue;

      // Check if we already sent an alert for this price
      if (favorite.lastAlertedPrice && favorite.lastAlertedPrice <= currentPrice) continue;

      cronLogger.info(`   Price drop: ${property.address} - €${savedPrice} → €${currentPrice} (-${percentageDrop}%)`);

      // Create alert
      await PropertyAlert.create({
        userId: user._id,
        propertyId: property._id,
        alertType: 'price_drop',
        previousPrice: savedPrice,
        newPrice: currentPrice,
        percentageChange: -percentageDrop,
        emailSent: false,
      });

      // Send email
      try {
        await sendPriceDropAlert({
          recipientEmail: user.email,
          recipientName: user.name || 'User',
          property: {
            id: String(property._id),
            title: property.title || `${property.address}, ${property.city}`,
            address: property.address,
            city: property.city,
            previousPrice: savedPrice,
            newPrice: currentPrice,
            percentageDrop,
            beds: property.beds,
            baths: property.baths,
            sqft: property.sqft,
            imageUrl: property.imageUrl,
          },
        });

        // Update favorite with last alerted price
        await Favorite.updateOne(
          { _id: favorite._id },
          { lastAlertedPrice: currentPrice }
        );

        // Mark alert as sent
        await PropertyAlert.updateOne(
          { userId: user._id, propertyId: property._id, alertType: 'price_drop', emailSent: false },
          { emailSent: true, emailSentAt: new Date() }
        );

        alertsSent++;
      } catch (emailError) {
        cronLogger.error('   Failed to send price drop email:', emailError);
      }
    }

    cronLogger.info(`✅ Price drop alerts (favorites) processed: ${alertsSent} alerts sent`);

    // ====================================================
    // SAVED SEARCH PRICE DROP ALERTS
    // Check properties that had recent price changes against saved searches
    // ====================================================
    await processSavedSearchPriceDropAlerts();

  } catch (error) {
    cronLogger.error('❌ Error processing price drop alerts:', error);
    throw error;
  }
}

/**
 * Process price drop/increase alerts for saved searches (scheduled)
 * Finds properties with recent price changes and checks them against saved searches
 */
async function processSavedSearchPriceDropAlerts(): Promise<void> {
  cronLogger.info('🔔 Processing saved search price change alerts...');

  try {
    // Find price changes from the last 2 hours (the cron runs hourly, use 2h for safety overlap)
    const since = new Date(Date.now() - 2 * 60 * 60 * 1000);

    const recentPriceChanges = await PriceHistory.find({
      changeType: { $in: ['increase', 'decrease'] },
      changedAt: { $gte: since },
    });

    if (recentPriceChanges.length === 0) {
      cronLogger.info('   No recent price changes found');
      return;
    }

    cronLogger.info(`   Found ${recentPriceChanges.length} recent price changes`);

    // Get all saved searches with alerts enabled
    const savedSearches = await SavedSearch.find({
      alertsEnabled: { $ne: false },
    }).populate('userId', 'email name subscription');

    // Filter to eligible users
    const eligibleSearches = savedSearches.filter(search => {
      const user = search.userId as any;
      if (!user || !user.subscription) return false;
      const { tier, status } = user.subscription;
      return ALERT_ELIGIBLE_TIERS.includes(tier) && ALERT_ELIGIBLE_STATUSES.includes(status);
    });

    if (eligibleSearches.length === 0) {
      cronLogger.info('   No eligible saved searches with alerts');
      return;
    }

    cronLogger.info(`   ${eligibleSearches.length} eligible saved searches to check`);

    let alertsSent = 0;

    // Process each price change
    for (const priceChange of recentPriceChanges) {
      const property = await Property.findById(priceChange.propertyId);
      if (!property || property.status !== 'active') continue;

      const previousPrice = priceChange.previousPrice;
      const newPrice = priceChange.price;
      if (!previousPrice || previousPrice === newPrice) continue;

      const isPriceDrop = newPrice < previousPrice;
      const priceChangeAmount = Math.abs(previousPrice - newPrice);
      const percentageChange = Math.round((priceChangeAmount / previousPrice) * 100);

      // Only alert for significant changes (at least 1%)
      if (percentageChange < 1) continue;

      const alertType = isPriceDrop ? 'price_drop' : 'price_increase';
      const changeLabel = isPriceDrop ? 'drop' : 'increase';

      for (const search of eligibleSearches) {
        const user = search.userId as any;
        if (!user?.email) continue;

        // Check if property matches this saved search filters and bounds
        if (!propertyMatchesFilters(property, search.filters)) continue;
        if (!propertyInBounds(property, search.drawnBoundsJSON)) continue;

        // Check if we already sent an alert for this price change (avoid duplicates)
        const existingAlert = await PropertyAlert.findOne({
          userId: user._id,
          propertyId: property._id,
          alertType,
          newPrice,
          createdAt: { $gte: since },
        });

        if (existingAlert) continue;

        try {
          await PropertyAlert.create({
            userId: user._id,
            propertyId: property._id,
            alertType,
            savedSearchId: search._id,
            previousPrice,
            newPrice,
            percentageChange: isPriceDrop ? -percentageChange : percentageChange,
            emailSent: true,
            emailSentAt: new Date(),
          });

          await sendSavedSearchPriceDropAlert({
            recipientEmail: user.email,
            recipientName: user.name || 'User',
            searchName: search.name,
            property: {
              id: String(property._id),
              title: property.title || `${property.address}, ${property.city}`,
              address: property.address,
              city: property.city,
              previousPrice,
              newPrice,
              percentageDrop: percentageChange,
              isPriceIncrease: !isPriceDrop,
              beds: property.beds,
              baths: property.baths,
              sqft: property.sqft,
              imageUrl: property.imageUrl,
            },
          });

          alertsSent++;
          cronLogger.info(`   ✉️ Sent price ${changeLabel} alert to ${user.email} (saved search: "${search.name}", property: ${property.title || property.address})`);
        } catch (err) {
          cronLogger.error(`   Failed to send saved search price ${changeLabel} alert to ${user.email}:`, err);
        }
      }
    }

    cronLogger.info(`✅ Saved search price change alerts processed: ${alertsSent} alerts sent`);
  } catch (error) {
    cronLogger.error('❌ Error processing saved search price change alerts:', error);
  }
}

/**
 * Record price change in history
 * Call this when a property price is updated
 */
export async function recordPriceChange(
  propertyId: string,
  newPrice: number,
  previousPrice?: number
): Promise<void> {
  try {
    let changeType: 'initial' | 'increase' | 'decrease' = 'initial';
    let percentageChange: number | undefined;

    if (previousPrice !== undefined && previousPrice !== newPrice) {
      changeType = newPrice > previousPrice ? 'increase' : 'decrease';
      percentageChange = Math.round(((newPrice - previousPrice) / previousPrice) * 100);
    }

    await PriceHistory.create({
      propertyId,
      price: newPrice,
      previousPrice,
      changeType,
      percentageChange,
      changedAt: new Date(),
    });

    cronLogger.info(`📊 Price history recorded: ${propertyId} - ${changeType} ${percentageChange ? `(${percentageChange}%)` : ''}`);
  } catch (error) {
    cronLogger.error('Error recording price history:', error);
  }
}

/**
 * Process instant alerts for a single newly created/activated property
 * Called immediately when a property is created or activated
 * This provides truly instant notifications instead of waiting for the 15-minute cron
 */
export async function processInstantAlertsForProperty(propertyId: string): Promise<void> {
  cronLogger.info(`🔔 Processing instant alerts for property ${propertyId}...`);

  try {
    // Get the property
    const property = await Property.findById(propertyId);
    if (!property) {
      cronLogger.info(`   ❌ Property ${propertyId} not found`);
      return;
    }

    // Only process active properties
    if (property.status !== 'active') {
      cronLogger.info(`   ⏸️ Property ${propertyId} is not active (status: ${property.status})`);
      return;
    }

    cronLogger.info(`   📍 Property: ${property.title || property.address}, ${property.city} (lat: ${property.lat}, lng: ${property.lng})`);

    // Get all saved searches with instant alerts enabled
    // Note: alertsEnabled defaults to true in schema, but older records may not have it
    // So we check for alertsEnabled !== false (true or undefined)
    const savedSearches = await SavedSearch.find({
      alertsEnabled: { $ne: false },
      $or: [
        { alertFrequency: 'instant' },
        { alertFrequency: { $exists: false } }, // Default to instant for records without alertFrequency
      ],
    }).populate('userId', 'email name subscription');

    cronLogger.info(`   📋 Found ${savedSearches.length} saved searches with instant alerts enabled`);

    if (savedSearches.length === 0) {
      cronLogger.info('   ℹ️ No saved searches with instant alerts enabled');
      return;
    }

    // Log all saved searches for debugging
    savedSearches.forEach((search, i) => {
      const user = search.userId as any;
      cronLogger.info(`   [${i + 1}] Search "${search.name}" by ${user?.email || 'unknown'} - subscription: ${user?.subscription?.tier || 'none'} (${user?.subscription?.status || 'none'})`);
    });

    // Filter to only users with active subscriptions
    const eligibleSearches = savedSearches.filter(search => {
      const user = search.userId as any;
      if (!user || !user.subscription) {
        cronLogger.info(`   ❌ Search "${search.name}" - no user or subscription`);
        return false;
      }

      const { tier, status } = user.subscription;
      const isEligibleTier = ALERT_ELIGIBLE_TIERS.includes(tier);
      const isActiveStatus = ALERT_ELIGIBLE_STATUSES.includes(status);

      if (!isEligibleTier || !isActiveStatus) {
        cronLogger.info(`   ❌ Search "${search.name}" - user ${user.email} not eligible (tier: ${tier}, status: ${status})`);
        return false;
      }

      cronLogger.info(`   ✓ Search "${search.name}" - user ${user.email} is eligible`);
      return true;
    });

    cronLogger.info(`   👥 ${eligibleSearches.length} eligible saved searches (users with Pro subscription)`);

    if (eligibleSearches.length === 0) {
      cronLogger.info('   ℹ️ No users with eligible subscriptions');
      return;
    }

    let alertsSent = 0;

    // Process each saved search
    for (const search of eligibleSearches) {
      const user = search.userId as any;
      if (!user || !user.email) continue;

      // Skip if already seen
      if (search.seenPropertyIds.includes(String(property._id))) {
        cronLogger.info(`   ⏭️ Search "${search.name}" - property already seen`);
        continue;
      }

      // Check if property matches filters
      const matchesFilters = propertyMatchesFilters(property, search.filters);
      if (!matchesFilters) {
        cronLogger.info(`   ⏭️ Search "${search.name}" - property doesn't match filters`);
        continue;
      }

      // Check if property is within bounds
      const inBounds = propertyInBounds(property, search.drawnBoundsJSON);
      if (!inBounds) {
        cronLogger.info(`   ⏭️ Search "${search.name}" - property not in bounds (drawnBoundsJSON: ${search.drawnBoundsJSON ? 'exists' : 'null'})`);
        continue;
      }

      // Property matches this saved search!
      cronLogger.info(`   ✅ Property matches saved search "${search.name}" for user ${user.email}`);

      // Create alert record
      await PropertyAlert.create({
        userId: user._id,
        propertyId: property._id,
        alertType: 'new_listing',
        savedSearchId: search._id,
        emailSent: false,
      });

      // Update seen property IDs
      await SavedSearch.updateOne(
        { _id: search._id },
        {
          $addToSet: { seenPropertyIds: String(property._id) },
          $set: { lastAlertSentAt: new Date() },
        }
      );

      // Send email notification immediately
      try {
        cronLogger.info(`   📧 Sending email to ${user.email}...`);
        await sendPropertyAlert({
          recipientEmail: user.email,
          recipientName: user.name || 'User',
          searchName: search.name,
          property: {
            id: String(property._id),
            title: property.title || `${property.address}, ${property.city}`,
            address: property.address,
            city: property.city,
            price: property.price,
            beds: property.beds,
            baths: property.baths,
            sqft: property.sqft,
            imageUrl: property.imageUrl,
          },
        });

        // Mark alert as sent
        await PropertyAlert.updateOne(
          { userId: user._id, propertyId: property._id, alertType: 'new_listing' },
          { emailSent: true, emailSentAt: new Date() }
        );

        alertsSent++;
        cronLogger.info(`   ✉️ Instant alert email sent to ${user.email}`);
      } catch (emailError) {
        cronLogger.error(`   ❌ Failed to send instant alert email to ${user.email}:`, emailError);
      }
    }

    cronLogger.info(`✅ Instant alerts processed for property ${propertyId}: ${alertsSent} alerts sent`);
  } catch (error) {
    cronLogger.error(`❌ Error processing instant alerts for property ${propertyId}:`, error);
    // Don't throw - we don't want to break the property creation flow
  }
}

/**
 * Run all property alert jobs
 */
/**
 * Process instant price change alerts for a specific property
 * Called immediately when a property price changes (drop or increase)
 * Notifies:
 * 1. Users who have this property in favorites (with price alerts enabled)
 * 2. Users whose saved searches match this property
 */
export async function processInstantPriceDropForProperty(
  propertyId: string,
  newPrice: number,
  previousPrice: number
): Promise<void> {
  const isPriceDrop = newPrice < previousPrice;
  const changeLabel = isPriceDrop ? 'drop' : 'increase';
  cronLogger.info(`🔔 Processing instant price ${changeLabel} alerts for property ${propertyId}: €${previousPrice} → €${newPrice}`);

  try {
    const property = await Property.findById(propertyId);
    if (!property) return;

    const priceChange = Math.abs(previousPrice - newPrice);
    const percentageChange = Math.round((priceChange / previousPrice) * 100);

    // Only alert for significant changes (at least 1%)
    if (percentageChange < 1) {
      cronLogger.info(`   ⏭️ Price ${changeLabel} too small (${percentageChange}%), skipping alerts`);
      return;
    }

    const alertType = isPriceDrop ? 'price_drop' : 'price_increase';

    let alertsSent = 0;

    // 1. Alert users who have this property favorited
    const favorites = await Favorite.find({
      propertyId,
      priceAlertEnabled: true,
    }).populate('userId', 'email name subscription');

    for (const favorite of favorites) {
      const user = favorite.userId as any;
      if (!user?.email || !user?.subscription) continue;

      const { tier, status } = user.subscription;
      if (!ALERT_ELIGIBLE_TIERS.includes(tier) || !ALERT_ELIGIBLE_STATUSES.includes(status)) continue;

      // Skip if already alerted for this exact price
      if (favorite.lastAlertedPrice && favorite.lastAlertedPrice === newPrice) continue;

      try {
        await PropertyAlert.create({
          userId: user._id,
          propertyId: property._id,
          alertType,
          previousPrice,
          newPrice,
          percentageChange: isPriceDrop ? -percentageChange : percentageChange,
          emailSent: true,
          emailSentAt: new Date(),
        });

        await sendPriceDropAlert({
          recipientEmail: user.email,
          recipientName: user.name || 'User',
          property: {
            id: String(property._id),
            title: property.title || `${property.address}, ${property.city}`,
            address: property.address,
            city: property.city,
            previousPrice,
            newPrice,
            percentageDrop: percentageChange,
            isPriceIncrease: !isPriceDrop,
            beds: property.beds,
            baths: property.baths,
            sqft: property.sqft,
            imageUrl: property.imageUrl,
          },
        });

        await Favorite.updateOne({ _id: favorite._id }, { lastAlertedPrice: newPrice });
        alertsSent++;
        cronLogger.info(`   ✉️ Sent price ${changeLabel} alert to ${user.email} (favorite)`);
      } catch (err) {
        cronLogger.error(`   Failed to send favorite price ${changeLabel} alert to ${user.email}:`, err);
      }
    }

    // 2. Alert users whose saved searches match this property
    const savedSearches = await SavedSearch.find({
      alertsEnabled: { $ne: false },
    }).populate('userId', 'email name subscription');

    // Track which users already got an alert from favorites to avoid duplicates
    const alertedUserIds = new Set(
      favorites
        .filter(f => (f.userId as any)?._id)
        .map(f => String((f.userId as any)._id))
    );

    for (const search of savedSearches) {
      const user = search.userId as any;
      if (!user?.email || !user?.subscription) continue;

      // Skip users already alerted via favorites
      if (alertedUserIds.has(String(user._id))) continue;

      const { tier, status } = user.subscription;
      if (!ALERT_ELIGIBLE_TIERS.includes(tier) || !ALERT_ELIGIBLE_STATUSES.includes(status)) continue;

      // Check if property matches this saved search filters and bounds
      if (!propertyMatchesFilters(property, search.filters)) continue;
      if (!propertyInBounds(property, search.drawnBoundsJSON)) continue;

      try {
        await PropertyAlert.create({
          userId: user._id,
          propertyId: property._id,
          alertType,
          savedSearchId: search._id,
          previousPrice,
          newPrice,
          percentageChange: isPriceDrop ? -percentageChange : percentageChange,
          emailSent: true,
          emailSentAt: new Date(),
        });

        await sendSavedSearchPriceDropAlert({
          recipientEmail: user.email,
          recipientName: user.name || 'User',
          searchName: search.name,
          property: {
            id: String(property._id),
            title: property.title || `${property.address}, ${property.city}`,
            address: property.address,
            city: property.city,
            previousPrice,
            newPrice,
            percentageDrop: percentageChange,
            isPriceIncrease: !isPriceDrop,
            beds: property.beds,
            baths: property.baths,
            sqft: property.sqft,
            imageUrl: property.imageUrl,
          },
        });

        alertedUserIds.add(String(user._id));
        alertsSent++;
        cronLogger.info(`   ✉️ Sent price ${changeLabel} alert to ${user.email} (saved search: "${search.name}")`);
      } catch (err) {
        cronLogger.error(`   Failed to send saved search price ${changeLabel} alert to ${user.email}:`, err);
      }
    }

    cronLogger.info(`✅ Instant price ${changeLabel} alerts: ${alertsSent} sent for property ${propertyId}`);
  } catch (error) {
    cronLogger.error(`❌ Error processing instant price ${changeLabel} alerts for ${propertyId}:`, error);
  }
}

export async function runPropertyAlertJobs(): Promise<void> {
  await processNewListingAlerts('instant');
  await processPriceDropAlerts();
}
