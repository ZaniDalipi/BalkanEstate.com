import type { Migration, MigrationContext, MigrationResult } from '../types';

const migration: Migration = {
  id: '20240315100000-migrate-property-roles',
  name: 'Add createdAsRole to properties',
  description:
    'Sets createdAsRole on existing properties based on the seller\'s primaryRole, availableRoles, or current role. Also adds agency metadata for agent-created properties.',

  async up(ctx: MigrationContext): Promise<MigrationResult> {
    const { db, dryRun } = ctx;
    let affectedDocuments = 0;

    try {
      const properties = db.collection('properties');
      const users = db.collection('users');

      // Find properties missing createdAsRole
      const pending = await properties
        .find({
          $or: [
            { createdAsRole: { $exists: false } },
            { createdAsRole: null },
          ],
        })
        .toArray();

      if (dryRun) {
        return {
          migrationId: migration.id,
          name: migration.name,
          direction: 'up',
          success: true,
          durationMs: 0,
          affectedDocuments: pending.length,
        };
      }

      for (const property of pending) {
        const seller = await users.findOne({ _id: property.sellerId });

        if (!seller) continue;

        let roleToUse: string = 'private_seller';

        if (seller.primaryRole) {
          roleToUse = seller.primaryRole === 'agent' ? 'agent' : 'private_seller';
        } else if (seller.availableRoles?.length > 0) {
          roleToUse = seller.availableRoles[0] === 'agent' ? 'agent' : 'private_seller';
        } else if (seller.role) {
          roleToUse = seller.role === 'agent' ? 'agent' : 'private_seller';
        }

        const updateDoc: Record<string, any> = { createdAsRole: roleToUse };

        if (roleToUse === 'agent') {
          if (seller.agencyName) updateDoc.createdByAgencyName = seller.agencyName;
          if (seller.licenseNumber) updateDoc.createdByLicenseNumber = seller.licenseNumber;
        }

        await properties.updateOne({ _id: property._id }, { $set: updateDoc });
        affectedDocuments++;
      }

      return {
        migrationId: migration.id,
        name: migration.name,
        direction: 'up',
        success: true,
        durationMs: 0,
        affectedDocuments,
      };
    } catch (error: any) {
      return {
        migrationId: migration.id,
        name: migration.name,
        direction: 'up',
        success: false,
        durationMs: 0,
        error: error.message,
      };
    }
  },

  async down(ctx: MigrationContext): Promise<MigrationResult> {
    const { db, dryRun } = ctx;
    let affectedDocuments = 0;

    try {
      const properties = db.collection('properties');

      const withRole = await properties
        .find({ createdAsRole: { $exists: true } })
        .toArray();

      if (dryRun) {
        return {
          migrationId: migration.id,
          name: migration.name,
          direction: 'down',
          success: true,
          durationMs: 0,
          affectedDocuments: withRole.length,
        };
      }

      const result = await properties.updateMany(
        { createdAsRole: { $exists: true } },
        {
          $unset: {
            createdAsRole: '',
            createdByAgencyName: '',
            createdByLicenseNumber: '',
          },
        }
      );

      affectedDocuments = result.modifiedCount;

      return {
        migrationId: migration.id,
        name: migration.name,
        direction: 'down',
        success: true,
        durationMs: 0,
        affectedDocuments,
      };
    } catch (error: any) {
      return {
        migrationId: migration.id,
        name: migration.name,
        direction: 'down',
        success: false,
        durationMs: 0,
        error: error.message,
      };
    }
  },
};

export default migration;
