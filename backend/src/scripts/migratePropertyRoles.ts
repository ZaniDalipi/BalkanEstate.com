import mongoose from 'mongoose';
import Property from '../models/Property';
import User from '../models/User';
import dotenv from 'dotenv';
import { scriptLogger } from '../utils/logger';

const log = scriptLogger.child('MigratePropertyRoles');

// Load environment variables
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/balkan-estate';

/**
 * Migration script to add createdAsRole to existing properties
 *
 * This script:
 * 1. Finds all properties without a createdAsRole field
 * 2. Looks up the seller's user document
 * 3. Sets createdAsRole based on:
 *    - User's primaryRole if available
 *    - User's first role in availableRoles
 *    - User's current role as fallback
 */

async function migratePropertyRoles() {
    try {
        log.info('🔌 Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        log.info('✅ Connected to MongoDB');

        // Find all properties without createdAsRole
        const properties = await Property.find({
            $or: [
                { createdAsRole: { $exists: false } },
                { createdAsRole: null }
            ]
        });

        log.info(`\n📊 Found ${properties.length} properties to migrate`);

        if (properties.length === 0) {
            log.info('✨ No properties to migrate. All properties have createdAsRole set.');
            await mongoose.disconnect();
            return;
        }

        let migratedCount = 0;
        let errorCount = 0;

        for (const property of properties) {
            try {
                // Look up the seller
                const seller = await User.findById(property.sellerId);

                if (!seller) {
                    log.warn(`⚠️  Property ${property._id}: Seller not found (${property.sellerId})`);
                    errorCount++;
                    continue;
                }

                // Determine the role to use
                let roleToUse: 'private_seller' | 'agent' = 'private_seller';

                // Priority: primaryRole > first role in availableRoles > current role
                if (seller.primaryRole) {
                    roleToUse = seller.primaryRole === 'agent' ? 'agent' : 'private_seller';
                } else if (seller.availableRoles && seller.availableRoles.length > 0) {
                    const firstRole = seller.availableRoles[0];
                    roleToUse = firstRole === 'agent' ? 'agent' : 'private_seller';
                } else if (seller.role) {
                    roleToUse = seller.role === 'agent' ? 'agent' : 'private_seller';
                }

                // Update the property
                property.createdAsRole = roleToUse;

                // If created as agent, add agency info if available
                if (roleToUse === 'agent') {
                    if (seller.agencyName) {
                        property.createdByAgencyName = seller.agencyName;
                    }
                    if (seller.licenseNumber) {
                        property.createdByLicenseNumber = seller.licenseNumber;
                    }
                }

                await property.save();
                migratedCount++;

                log.info(`✅ Property ${property._id}: Set createdAsRole to "${roleToUse}" (Seller: ${seller.name})`);
            } catch (error) {
                log.error(`❌ Error migrating property ${property._id}:`, error);
                errorCount++;
            }
        }

        log.info('\n' + '='.repeat(60));
        log.info(`✨ Migration complete!`);
        log.info(`   - Total properties processed: ${properties.length}`);
        log.info(`   - Successfully migrated: ${migratedCount}`);
        log.info(`   - Errors: ${errorCount}`);
        log.info('='.repeat(60));

        await mongoose.disconnect();
        log.info('🔌 Disconnected from MongoDB');
    } catch (error) {
        log.error('💥 Migration failed:', error);
        process.exit(1);
    }
}

// Run the migration
migratePropertyRoles()
    .then(() => {
        log.info('\n✅ Migration script finished successfully');
        process.exit(0);
    })
    .catch((error) => {
        log.error('\n❌ Migration script failed:', error);
        process.exit(1);
    });
