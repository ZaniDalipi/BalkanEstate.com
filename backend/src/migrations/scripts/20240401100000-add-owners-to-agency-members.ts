import type { Migration, MigrationContext, MigrationResult } from '../types';

const migration: Migration = {
  id: '20240401100000-add-owners-to-agency-members',
  name: 'Add agency owners to agents array',
  description:
    'Ensures every agency\'s owner appears in its agents array and updates totalAgents count.',

  async up(ctx: MigrationContext): Promise<MigrationResult> {
    const { db, dryRun } = ctx;
    let affectedDocuments = 0;

    try {
      const agencies = db.collection('agencies');
      const allAgencies = await agencies.find({}).toArray();

      if (dryRun) {
        let wouldUpdate = 0;
        for (const agency of allAgencies) {
          const ownerIdStr = agency.ownerId?.toString();
          const isOwnerInAgents = (agency.agents || []).some(
            (agentId: any) => agentId.toString() === ownerIdStr
          );
          if (!isOwnerInAgents) wouldUpdate++;
        }
        return {
          migrationId: migration.id,
          name: migration.name,
          direction: 'up',
          success: true,
          durationMs: 0,
          affectedDocuments: wouldUpdate,
        };
      }

      for (const agency of allAgencies) {
        const ownerIdStr = agency.ownerId?.toString();
        const isOwnerInAgents = (agency.agents || []).some(
          (agentId: any) => agentId.toString() === ownerIdStr
        );

        if (!isOwnerInAgents) {
          const updatedAgents = [agency.ownerId, ...(agency.agents || [])];
          await agencies.updateOne(
            { _id: agency._id },
            {
              $set: {
                agents: updatedAgents,
                totalAgents: updatedAgents.length,
              },
            }
          );
          affectedDocuments++;
        }
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

  // No safe rollback — cannot determine which owners were added vs. already present
  down: undefined,
};

export default migration;
