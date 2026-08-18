import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import VillaDestination from '../models/VillaDestination';
import { scriptLogger } from '../utils/logger';

const log = scriptLogger.child('SeedVillaDestinations');

const env = process.env.NODE_ENV || 'development';
const envFile = env === 'development' ? '.env' : `.env.${env}`;
dotenv.config({ path: path.resolve(__dirname, '../../', envFile) });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/balkan-estate';

/**
 * The destinations the home-page corridor shipped with, mirrored from
 * `src/features/home/data/villaDestinations.ts`.
 *
 * `imageCity`/`imageCountry` point at the seeded Cloudinary city photo used
 * until an admin uploads a specific one. Several are regions rather than
 * seeded cities, so they borrow the nearest city that has a photo — which is
 * exactly what admins are expected to replace, since a Ferizaj photo standing
 * in for Jezerc is approximate by design.
 */
const DESTINATIONS = [
  { name: 'Jezerc',        query: 'Jezerc',        country: 'Kosovo',                 imageCity: 'Ferizaj',   imageCountry: 'Kosovo',                 lat: 42.3100, lng: 21.0500, zoom: 12 },
  { name: 'Brezovica',     query: 'Brezovica',     country: 'Kosovo',                 imageCity: 'Prizren',   imageCountry: 'Kosovo',                 lat: 42.1736, lng: 20.9394, zoom: 12 },
  { name: 'Rugova',        query: 'Rugova',        country: 'Kosovo',                 imageCity: 'Peja',      imageCountry: 'Kosovo',                 lat: 42.6500, lng: 20.1500, zoom: 12 },
  { name: 'Prevallë',      query: 'Prevallë',      country: 'Kosovo',                 imageCity: 'Prizren',   imageCountry: 'Kosovo',                 lat: 42.1900, lng: 20.8700, zoom: 12 },
  { name: 'Batllava',      query: 'Batllava',      country: 'Kosovo',                 imageCity: 'Prishtina', imageCountry: 'Kosovo',                 lat: 42.7833, lng: 21.2833, zoom: 12 },
  { name: 'Bay of Kotor',  query: 'Kotor',         country: 'Montenegro',             imageCity: 'Kotor',     imageCountry: 'Montenegro',             lat: 42.4247, lng: 18.7712, zoom: 12 },
  { name: 'Budva Riviera', query: 'Budva',         country: 'Montenegro',             imageCity: 'Budva',     imageCountry: 'Montenegro',             lat: 42.2864, lng: 18.8400, zoom: 12 },
  { name: 'Ulcinj',        query: 'Ulcinj',        country: 'Montenegro',             imageCity: 'Ulcinj',    imageCountry: 'Montenegro',             lat: 41.9294, lng: 19.2244, zoom: 12 },
  { name: 'Dubrovnik',     query: 'Dubrovnik',     country: 'Croatia',                imageCity: 'Dubrovnik', imageCountry: 'Croatia',                lat: 42.6507, lng: 18.0944, zoom: 13 },
  { name: 'Split',         query: 'Split',         country: 'Croatia',                imageCity: 'Split',     imageCountry: 'Croatia',                lat: 43.5081, lng: 16.4402, zoom: 12 },
  { name: 'Lake Ohrid',    query: 'Ohrid',         country: 'North Macedonia',        imageCity: 'Ohrid',     imageCountry: 'North Macedonia',        lat: 41.1172, lng: 20.8016, zoom: 11 },
  { name: 'Ksamil',        query: 'Ksamil',        country: 'Albania',                imageCity: 'Sarande',   imageCountry: 'Albania',                lat: 39.7667, lng: 20.0016, zoom: 13 },
  { name: 'Vlorë',         query: 'Vlorë',         country: 'Albania',                imageCity: 'Vlore',     imageCountry: 'Albania',                lat: 40.4667, lng: 19.4833, zoom: 12 },
  { name: 'Trebinje',      query: 'Trebinje',      country: 'Bosnia and Herzegovina', imageCity: 'Trebinje',  imageCountry: 'Bosnia and Herzegovina', lat: 42.7111, lng: 18.3436, zoom: 12 },
];

async function seedVillaDestinations(): Promise<void> {
  log.info(`🌍 Environment: ${env.toUpperCase()}`);

  try {
    await mongoose.connect(MONGODB_URI);
    log.info('✅ Connected to MongoDB');

    let created = 0;
    let skipped = 0;

    for (const [index, dest] of DESTINATIONS.entries()) {
      // Match on `query`, the field that actually drives the villa search —
      // re-running must never duplicate a destination an admin has renamed.
      const existing = await VillaDestination.findOne({ query: dest.query });
      if (existing) {
        skipped++;
        continue;
      }
      await VillaDestination.create({ ...dest, displayOrder: index, isActive: true });
      created++;
    }

    log.info(`🎉 Created ${created} destination(s), left ${skipped} existing untouched`);
    log.info('   Admins can now edit these and upload a photo per place.');
  } catch (error) {
    log.error('❌ Seed error:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    log.info('👋 Disconnected from MongoDB');
  }
}

seedVillaDestinations();
