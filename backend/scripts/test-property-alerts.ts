/**
 * Test script for Property Alerts functionality
 *
 * Usage: npx ts-node scripts/test-property-alerts.ts
 *
 * This script tests:
 * 1. New Listing Alerts - when properties match saved searches
 * 2. Price Drop Alerts - when favorited properties have price reductions
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.development' });
dotenv.config();

import mongoose from 'mongoose';
import connectDB from '../src/config/database';
import { processNewListingAlerts, processPriceDropAlerts, recordPriceChange } from '../src/jobs/propertyAlertsJob';
import SavedSearch from '../src/models/SavedSearch';
import Favorite from '../src/models/Favorite';
import Property from '../src/models/Property';
import PriceHistory from '../src/models/PriceHistory';
import PropertyAlert from '../src/models/PropertyAlert';
import { scriptLogger } from '../src/utils/logger';

async function testPropertyAlerts() {
  const log = scriptLogger.child('TestAlerts');

  log.info('🔔 Property Alerts Test Script\n');
  log.info('================================\n');

  try {
    // Connect to database
    await connectDB();
    log.info('✅ Connected to database\n');

    // Get some stats
    const savedSearchCount = await SavedSearch.countDocuments({ alertsEnabled: true });
    const favoriteCount = await Favorite.countDocuments({ priceAlertEnabled: true });
    const propertyCount = await Property.countDocuments({ status: 'active' });
    const priceHistoryCount = await PriceHistory.countDocuments();
    const alertsSentCount = await PropertyAlert.countDocuments();

    log.info('📊 Current Stats:');
    log.info(`   - Saved searches with alerts enabled: ${savedSearchCount}`);
    log.info(`   - Favorites with price alerts enabled: ${favoriteCount}`);
    log.info(`   - Active properties: ${propertyCount}`);
    log.info(`   - Price history records: ${priceHistoryCount}`);
    log.info(`   - Alerts sent (total): ${alertsSentCount}`);
    log.info('');

    // Check if there are saved searches to test with
    if (savedSearchCount === 0) {
      log.info('⚠️  No saved searches found with alerts enabled.');
      log.info('   To test new listing alerts:');
      log.info('   1. Save a search on the website');
      log.info('   2. Make sure "alertsEnabled" is true in the database');
      log.info('');
    }

    if (favoriteCount === 0) {
      log.info('⚠️  No favorites found with price alerts enabled.');
      log.info('   To test price drop alerts:');
      log.info('   1. Save a property to favorites');
      log.info('   2. Make sure "priceAlertEnabled" is true in the database');
      log.info('');
    }

    // Show sample saved searches
    const sampleSearches = await SavedSearch.find({ alertsEnabled: true })
      .populate('userId', 'email name')
      .limit(3);

    if (sampleSearches.length > 0) {
      log.info('📋 Sample Saved Searches with Alerts:');
      for (const search of sampleSearches) {
        const user = search.userId as any;
        log.info(`   - "${search.name}" by ${user?.email || 'Unknown'}`);
        log.info(`     Frequency: ${search.alertFrequency}, Last alert: ${search.lastAlertSentAt || 'Never'}`);
      }
      log.info('');
    }

    // Show sample favorites
    const sampleFavorites = await Favorite.find({ priceAlertEnabled: true })
      .populate('userId', 'email name')
      .populate('propertyId', 'title address price')
      .limit(3);

    if (sampleFavorites.length > 0) {
      log.info('💾 Sample Favorites with Price Alerts:');
      for (const fav of sampleFavorites) {
        const user = fav.userId as any;
        const property = fav.propertyId as any;
        log.info(`   - "${property?.title || property?.address}" saved by ${user?.email || 'Unknown'}`);
        log.info(`     Price at save: €${fav.priceAtSave}, Current: €${property?.price}`);
      }
      log.info('');
    }

    // Ask user what to test
    log.info('================================');
    log.info('🧪 Running Tests...\n');

    // Test 1: Process New Listing Alerts (instant)
    log.info('1️⃣  Testing New Listing Alerts (instant frequency)...');
    try {
      await processNewListingAlerts('instant');
      log.info('   ✅ New listing alerts processed successfully\n');
    } catch (error: any) {
      log.info(`   ❌ Error: ${error.message}\n`);
    }

    // Test 2: Process Price Drop Alerts
    log.info('2️⃣  Testing Price Drop Alerts...');
    try {
      await processPriceDropAlerts();
      log.info('   ✅ Price drop alerts processed successfully\n');
    } catch (error: any) {
      log.info(`   ❌ Error: ${error.message}\n`);
    }

    // Test 3: Record a price change (if there's an active property)
    const testProperty = await Property.findOne({ status: 'active' });
    if (testProperty) {
      log.info('3️⃣  Testing Price History Recording...');
      const originalPrice = testProperty.price;
      const testPrice = originalPrice - 1000; // Simulate €1000 price drop

      try {
        await recordPriceChange(String(testProperty._id), testPrice, originalPrice);
        log.info(`   ✅ Price change recorded: €${originalPrice} → €${testPrice}`);

        // Check if it was recorded
        const history = await PriceHistory.findOne({ propertyId: testProperty._id }).sort({ changedAt: -1 });
        if (history) {
          log.info(`   📊 Recorded: ${history.changeType} (${history.percentageChange}%)\n`);
        }
      } catch (error: any) {
        log.info(`   ❌ Error: ${error.message}\n`);
      }
    }

    log.info('================================');
    log.info('✅ Test complete!\n');

    log.info('📧 Email Configuration:');
    log.info(`   - RESEND_API_KEY: ${process.env.RESEND_API_KEY ? '✅ Set' : '❌ Not set'}`);
    log.info(`   - SMTP_HOST: ${process.env.SMTP_HOST || '❌ Not set'}`);
    log.info('');

    if (!process.env.RESEND_API_KEY && !process.env.SMTP_HOST) {
      log.info('⚠️  No email service configured!');
      log.info('   Alerts are processed but emails won\'t be sent.');
      log.info('   Add RESEND_API_KEY to your .env file to enable emails.');
    }

  } catch (error) {
    log.error('❌ Test failed:', error);
  } finally {
    await mongoose.disconnect();
    log.info('\n👋 Disconnected from database');
    process.exit(0);
  }
}

testPropertyAlerts();
