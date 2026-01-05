/**
 * Property Alerts Job
 *
 * Handles two types of alerts:
 * 1. New Listing Alerts - When new properties match saved searches
 * 2. Price Drop Alerts - When saved/favorited properties have price reductions
 */

import Property, { IProperty } from '../models/Property';
import SavedSearch, { IFilters } from '../models/SavedSearch';
import Favorite from '../models/Favorite';
import PropertyAlert from '../models/PropertyAlert';
import PriceHistory from '../models/PriceHistory';
import { sendPropertyAlert, sendPriceDropAlert, sendNewListingsDigest } from '../services/emailService';

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
 * Check if property is within drawn bounds (GeoJSON polygon)
 */
function propertyInBounds(property: IProperty, drawnBoundsJSON: string | null): boolean {
  if (!drawnBoundsJSON) return true; // No bounds = match all

  try {
    const bounds = JSON.parse(drawnBoundsJSON);
    if (!bounds || !bounds.coordinates || !Array.isArray(bounds.coordinates[0])) return true;

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
  } catch {
    return true; // If bounds parsing fails, include the property
  }
}

/**
 * Process new listing alerts for all saved searches
 * Runs every 15 minutes for instant alerts, or as scheduled for daily/weekly
 */
export async function processNewListingAlerts(frequency: 'instant' | 'daily' | 'weekly' = 'instant'): Promise<void> {
  console.log(`🔔 Processing ${frequency} new listing alerts...`);

  try {
    // Get all saved searches with alerts enabled for this frequency
    const savedSearches = await SavedSearch.find({
      alertsEnabled: true,
      alertFrequency: frequency,
    }).populate('userId', 'email name');

    if (savedSearches.length === 0) {
      console.log('   No saved searches with alerts enabled');
      return;
    }

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
      console.log('   No new properties found');
      return;
    }

    console.log(`   Found ${newProperties.length} new properties, checking ${savedSearches.length} saved searches`);

    // Process each saved search
    for (const search of savedSearches) {
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

      console.log(`   ${matchingProperties.length} matches for "${search.name}" (${user.email})`);

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
        console.error(`   Failed to send email to ${user.email}:`, emailError);
      }
    }

    console.log('✅ New listing alerts processed');
  } catch (error) {
    console.error('❌ Error processing new listing alerts:', error);
    throw error;
  }
}

/**
 * Process price drop alerts for favorited properties
 */
export async function processPriceDropAlerts(): Promise<void> {
  console.log('🔔 Processing price drop alerts...');

  try {
    // Get all favorites with price alerts enabled
    const favorites = await Favorite.find({
      priceAlertEnabled: true,
    }).populate('userId', 'email name').populate('propertyId');

    if (favorites.length === 0) {
      console.log('   No favorites with price alerts enabled');
      return;
    }

    let alertsSent = 0;

    for (const favorite of favorites) {
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

      console.log(`   Price drop: ${property.address} - €${savedPrice} → €${currentPrice} (-${percentageDrop}%)`);

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
        console.error(`   Failed to send price drop email to ${user.email}:`, emailError);
      }
    }

    console.log(`✅ Price drop alerts processed: ${alertsSent} alerts sent`);
  } catch (error) {
    console.error('❌ Error processing price drop alerts:', error);
    throw error;
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

    console.log(`📊 Price history recorded: ${propertyId} - ${changeType} ${percentageChange ? `(${percentageChange}%)` : ''}`);
  } catch (error) {
    console.error('Error recording price history:', error);
  }
}

/**
 * Run all property alert jobs
 */
export async function runPropertyAlertJobs(): Promise<void> {
  await processNewListingAlerts('instant');
  await processPriceDropAlerts();
}
