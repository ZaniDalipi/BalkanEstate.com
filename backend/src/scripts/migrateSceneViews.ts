/**
 * Migration: building views + development uniqueness indexes.
 *
 * Idempotent — safe to run any number of times, on any environment:
 *
 *   npm run migrate:development-views            # apply
 *   DRY_RUN=true npm run migrate:development-views   # report only
 *
 * 1. Backfills scenes created before multi-view support to the `main` view
 *    (viewKey 'main', viewDirection 'front', sortOrder 0).
 * 2. Drops the superseded single-view index `scene_per_target_unique` where it
 *    was built, so a building can hold several views.
 * 3. Reports live duplicates that would block the soft-delete-aware unique
 *    indexes (development slug, building slug, unit number). Those indexes
 *    failed to build before the partial-filter fix, so duplicates may exist;
 *    they are reported, never auto-deleted — resolve them, then re-run.
 * 4. Builds every declared development index (createIndexes adds, never drops;
 *    the only index this script removes is the legacy one named in step 2).
 *
 * Rollback: the backfilled fields are additive and ignored by older code; the
 * dropped index can be recreated by checking out the previous model and
 * running createIndexes, though it will then refuse a second view per target.
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Development from '../models/Development';
import DevelopmentBuilding from '../models/DevelopmentBuilding';
import DevelopmentUnit from '../models/DevelopmentUnit';
import DevelopmentScene from '../models/DevelopmentScene';
import { scriptLogger as log } from '../utils/logger';
import { resolveScriptMongoUri, redactMongoUri } from '../utils/scriptMongoUri';

dotenv.config();

const DRY_RUN = process.env.DRY_RUN === 'true';
const LEGACY_SCENE_INDEX = 'scene_per_target_unique';

interface DuplicateGroup {
  _id: Record<string, unknown>;
  count: number;
}

const findDuplicates = async (
  model: mongoose.Model<any>,
  group: Record<string, string>,
  extraMatch: Record<string, unknown> = {}
): Promise<DuplicateGroup[]> =>
  model.aggregate<DuplicateGroup>([
    { $match: { deletedAt: null, ...extraMatch } },
    { $group: { _id: group, count: { $sum: 1 } } },
    { $match: { count: { $gt: 1 } } },
    { $limit: 50 },
  ]);

async function run(): Promise<void> {
  // Same database as the running server (MONGODB_URI), never a different one.
  const { uri: mongoUri, source: mongoSource } = resolveScriptMongoUri();
  await mongoose.connect(mongoUri);
  log.info(`Connected to ${redactMongoUri(mongoUri)} (from ${mongoSource})${DRY_RUN ? ' (DRY RUN — no writes)' : ''}`);

  try {
    // 1. Backfill legacy scenes to the main view.
    const legacy = { $or: [{ viewKey: { $exists: false } }, { viewKey: null }] };
    const legacyCount = await DevelopmentScene.collection.countDocuments(legacy);
    if (legacyCount > 0 && !DRY_RUN) {
      await DevelopmentScene.collection.updateMany(legacy, {
        $set: { viewKey: 'main', viewDirection: 'front', sortOrder: 0 },
      });
    }
    log.info(`Scenes ${DRY_RUN ? 'to backfill' : 'backfilled'} to the main view: ${legacyCount}`);

    // 2. Drop the superseded single-view index if it was ever built.
    const sceneIndexes = await DevelopmentScene.collection.indexes().catch(() => []);
    if (sceneIndexes.some((ix) => ix.name === LEGACY_SCENE_INDEX)) {
      if (!DRY_RUN) await DevelopmentScene.collection.dropIndex(LEGACY_SCENE_INDEX);
      log.info(`${DRY_RUN ? 'Would drop' : 'Dropped'} legacy index ${LEGACY_SCENE_INDEX}`);
    } else {
      log.info(`Legacy index ${LEGACY_SCENE_INDEX} not present — nothing to drop`);
    }

    // 3. Report duplicates that would block the unique indexes.
    const checks: Array<[string, Promise<DuplicateGroup[]>]> = [
      ['development slug', findDuplicates(Development, { slug: '$slug' })],
      ['building slug per development', findDuplicates(DevelopmentBuilding, { d: '$developmentId', s: '$slug' })],
      [
        'unit number per entrance',
        findDuplicates(DevelopmentUnit, { e: '$entranceId', n: '$unitNumber' }, { entranceId: { $type: 'objectId' } }),
      ],
      [
        'unit number per building',
        findDuplicates(DevelopmentUnit, { b: '$buildingId', n: '$unitNumber' }, { entranceId: null }),
      ],
      [
        'scene per target view',
        findDuplicates(DevelopmentScene, { d: '$developmentId', t: '$targetType', i: '$targetId', v: '$viewKey' }),
      ],
    ];
    let blocked = false;
    for (const [label, pending] of checks) {
      const dups = await pending;
      if (dups.length > 0) {
        blocked = true;
        log.error(`✗ ${dups.length} duplicate group(s) for ${label}:`);
        dups.forEach((d) => log.error(`   ${JSON.stringify(d._id)} ×${d.count}`));
      } else {
        log.info(`✓ no duplicates for ${label}`);
      }
    }

    // 4. Build every index (skipped when duplicates would make it fail).
    if (blocked) {
      log.error('Resolve the duplicates above, then re-run to build the unique indexes.');
      process.exitCode = 1;
    } else if (!DRY_RUN) {
      for (const model of [Development, DevelopmentBuilding, DevelopmentUnit, DevelopmentScene]) {
        await model.createIndexes();
      }
      log.info('✅ Development indexes are in place.');
    }
  } catch (error) {
    log.error('Migration failed:', error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

run();
