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
import User from '../src/models/User';
import PriceHistory from '../src/models/PriceHistory';
import PropertyAlert from '../src/models/PropertyAlert';

async function testPropertyAlerts() {
  console.log('🔔 Property Alerts Test Script\n');
  console.log('================================\n');

  try {
    // Connect to database
    await connectDB();
    console.log('✅ Connected to database\n');

    // Get some stats
    const savedSearchCount = await SavedSearch.countDocuments({ alertsEnabled: true });
    const favoriteCount = await Favorite.countDocuments({ priceAlertEnabled: true });
    const propertyCount = await Property.countDocuments({ status: 'active' });
    const priceHistoryCount = await PriceHistory.countDocuments();
    const alertsSentCount = await PropertyAlert.countDocuments();

    console.log('📊 Current Stats:');
    console.log(`   - Saved searches with alerts enabled: ${savedSearchCount}`);
    console.log(`   - Favorites with price alerts enabled: ${favoriteCount}`);
    console.log(`   - Active properties: ${propertyCount}`);
    console.log(`   - Price history records: ${priceHistoryCount}`);
    console.log(`   - Alerts sent (total): ${alertsSentCount}`);
    console.log('');

    // Check if there are saved searches to test with
    if (savedSearchCount === 0) {
      console.log('⚠️  No saved searches found with alerts enabled.');
      console.log('   To test new listing alerts:');
      console.log('   1. Save a search on the website');
      console.log('   2. Make sure "alertsEnabled" is true in the database');
      console.log('');
    }

    if (favoriteCount === 0) {
      console.log('⚠️  No favorites found with price alerts enabled.');
      console.log('   To test price drop alerts:');
      console.log('   1. Save a property to favorites');
      console.log('   2. Make sure "priceAlertEnabled" is true in the database');
      console.log('');
    }

    // Show sample saved searches
    const sampleSearches = await SavedSearch.find({ alertsEnabled: true })
      .populate('userId', 'email name')
      .limit(3);

    if (sampleSearches.length > 0) {
      console.log('📋 Sample Saved Searches with Alerts:');
      for (const search of sampleSearches) {
        const user = search.userId as any;
        console.log(`   - "${search.name}" by ${user?.email || 'Unknown'}`);
        console.log(`     Frequency: ${search.alertFrequency}, Last alert: ${search.lastAlertSentAt || 'Never'}`);
      }
      console.log('');
    }

    // Show sample favorites
    const sampleFavorites = await Favorite.find({ priceAlertEnabled: true })
      .populate('userId', 'email name')
      .populate('propertyId', 'title address price')
      .limit(3);

    if (sampleFavorites.length > 0) {
      console.log('💾 Sample Favorites with Price Alerts:');
      for (const fav of sampleFavorites) {
        const user = fav.userId as any;
        const property = fav.propertyId as any;
        console.log(`   - "${property?.title || property?.address}" saved by ${user?.email || 'Unknown'}`);
        console.log(`     Price at save: €${fav.priceAtSave}, Current: €${property?.price}`);
      }
      console.log('');
    }

    // Ask user what to test
    console.log('================================');
    console.log('🧪 Running Tests...\n');

    // Test 1: Process New Listing Alerts (instant)
    console.log('1️⃣  Testing New Listing Alerts (instant frequency)...');
    try {
      await processNewListingAlerts('instant');
      console.log('   ✅ New listing alerts processed successfully\n');
    } catch (error: any) {
      console.log(`   ❌ Error: ${error.message}\n`);
    }

    // Test 2: Process Price Drop Alerts
    console.log('2️⃣  Testing Price Drop Alerts...');
    try {
      await processPriceDropAlerts();
      console.log('   ✅ Price drop alerts processed successfully\n');
    } catch (error: any) {
      console.log(`   ❌ Error: ${error.message}\n`);
    }

    // Test 3: Record a price change (if there's an active property)
    const testProperty = await Property.findOne({ status: 'active' });
    if (testProperty) {
      console.log('3️⃣  Testing Price History Recording...');
      const originalPrice = testProperty.price;
      const testPrice = originalPrice - 1000; // Simulate €1000 price drop

      try {
        await recordPriceChange(String(testProperty._id), testPrice, originalPrice);
        console.log(`   ✅ Price change recorded: €${originalPrice} → €${testPrice}`);

        // Check if it was recorded
        const history = await PriceHistory.findOne({ propertyId: testProperty._id }).sort({ changedAt: -1 });
        if (history) {
          console.log(`   📊 Recorded: ${history.changeType} (${history.percentageChange}%)\n`);
        }
      } catch (error: any) {
        console.log(`   ❌ Error: ${error.message}\n`);
      }
    }

    console.log('================================');
    console.log('✅ Test complete!\n');

    console.log('📧 Email Configuration:');
    console.log(`   - RESEND_API_KEY: ${process.env.RESEND_API_KEY ? '✅ Set' : '❌ Not set'}`);
    console.log(`   - SMTP_HOST: ${process.env.SMTP_HOST || '❌ Not set'}`);
    console.log('');

    if (!process.env.RESEND_API_KEY && !process.env.SMTP_HOST) {
      console.log('⚠️  No email service configured!');
      console.log('   Alerts are processed but emails won\'t be sent.');
      console.log('   Add RESEND_API_KEY to your .env file to enable emails.');
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from database');
    process.exit(0);
  }
}

testPropertyAlerts();
