import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import mongoose from 'mongoose';
import MigrationRecord from './MigrationModel';
import {
  validateMigrationFilename,
  validateMigrationModule,
} from './MigrationValidator';
import type {
  Migration,
  MigrationContext,
  MigrationResult,
  MigrationRunOptions,
  MigrationRollbackOptions,
  MigrationStatus,
} from './types';
import { migrationLogger } from '../utils/logger';

const log = migrationLogger;

const SCRIPTS_DIR = path.join(__dirname, 'scripts');

/** Compute SHA-256 checksum of a migration file */
function computeChecksum(filePath: string): string {
  const content = fs.readFileSync(filePath, 'utf-8');
  return crypto.createHash('sha256').update(content).digest('hex');
}

/** Get the current environment name */
function getEnvironment(): string {
  return process.env.NODE_ENV || 'development';
}

/**
 * Discover all valid migration files in the scripts directory.
 * Returns them sorted by timestamp (ascending).
 */
export async function discover(): Promise<Migration[]> {
  if (!fs.existsSync(SCRIPTS_DIR)) {
    log.warn(`Migration scripts directory not found: ${SCRIPTS_DIR}`);
    return [];
  }

  const files = fs
    .readdirSync(SCRIPTS_DIR)
    .filter((f) => f.endsWith('.ts') && !f.endsWith('.d.ts'))
    .sort();

  const migrations: Migration[] = [];

  for (const file of files) {
    const filenameValidation = validateMigrationFilename(file);
    if (!filenameValidation.isValid) {
      log.warn(`Skipping invalid migration file: ${filenameValidation.error}`);
      continue;
    }

    const filePath = path.join(SCRIPTS_DIR, file);

    try {
      const mod = require(filePath);
      const exported = mod.default || mod;

      const moduleValidation = validateMigrationModule(exported, file);
      if (!moduleValidation.isValid) {
        log.warn(`Skipping invalid migration module: ${moduleValidation.error}`);
        continue;
      }

      migrations.push(exported as Migration);
    } catch (err: any) {
      log.error(`Failed to load migration "${file}": ${err.message}`);
    }
  }

  return migrations;
}

/**
 * Get the status of all discovered migrations compared against the DB.
 */
export async function getStatus(): Promise<MigrationStatus[]> {
  const migrations = await discover();
  const environment = getEnvironment();
  const applied = await MigrationRecord.find({ environment }).lean();
  const appliedMap = new Map(applied.map((r) => [r.migrationId, r]));

  return migrations.map((m) => {
    const record = appliedMap.get(m.id);
    const filePath = path.join(
      SCRIPTS_DIR,
      fs.readdirSync(SCRIPTS_DIR).find((f) => f.startsWith(m.id.slice(0, 14))) || ''
    );
    const currentChecksum = fs.existsSync(filePath)
      ? computeChecksum(filePath)
      : '';

    return {
      migrationId: m.id,
      name: m.name,
      description: m.description,
      state: record ? 'applied' : 'pending',
      appliedAt: record?.appliedAt,
      hasDown: typeof m.down === 'function',
      checksumMatch: record ? record.checksum === currentChecksum : undefined,
    } satisfies MigrationStatus;
  });
}

/**
 * Run all pending migrations (or up to a specific target).
 */
export async function runPending(
  options: MigrationRunOptions = {}
): Promise<MigrationResult[]> {
  const { dryRun = false, target } = options;
  const environment = getEnvironment();
  const migrations = await discover();
  const applied = await MigrationRecord.find({ environment }).lean();
  const appliedIds = new Set(applied.map((r) => r.migrationId));

  const pending = migrations.filter((m) => !appliedIds.has(m.id));

  if (pending.length === 0) {
    log.info('No pending migrations to run');
    return [];
  }

  log.info(
    `${dryRun ? '[DRY RUN] ' : ''}Found ${pending.length} pending migration(s)`
  );

  const db = mongoose.connection.db;
  if (!db) {
    throw new Error('Database connection not available');
  }

  const ctx: MigrationContext = { db, dryRun, environment };
  const results: MigrationResult[] = [];

  for (const migration of pending) {
    log.info(
      `${dryRun ? '[DRY RUN] ' : ''}Running migration: ${migration.id} - ${migration.name}`
    );

    const start = Date.now();

    try {
      const result = await migration.up(ctx);
      const durationMs = Date.now() - start;

      results.push({ ...result, durationMs });

      if (!result.success) {
        log.error(
          `Migration ${migration.id} failed: ${result.error}`
        );
        break; // fail-fast
      }

      if (!dryRun) {
        const filePath = path.join(
          SCRIPTS_DIR,
          fs
            .readdirSync(SCRIPTS_DIR)
            .find((f) => f.startsWith(migration.id.slice(0, 14))) || ''
        );
        const checksum = fs.existsSync(filePath)
          ? computeChecksum(filePath)
          : '';

        await MigrationRecord.create({
          migrationId: migration.id,
          name: migration.name,
          description: migration.description,
          appliedAt: new Date(),
          durationMs,
          environment,
          checksum,
        });
      }

      log.info(
        `${dryRun ? '[DRY RUN] ' : ''}Completed ${migration.id} in ${durationMs}ms${result.affectedDocuments !== undefined ? ` (${result.affectedDocuments} documents affected)` : ''}`
      );
    } catch (err: any) {
      const durationMs = Date.now() - start;
      const errorResult: MigrationResult = {
        migrationId: migration.id,
        name: migration.name,
        direction: 'up',
        success: false,
        durationMs,
        error: err.message,
      };
      results.push(errorResult);
      log.error(`Migration ${migration.id} threw an error: ${err.message}`);
      break; // fail-fast
    }

    // Stop if we reached the target
    if (target && migration.id === target) {
      log.info(`Reached target migration: ${target}`);
      break;
    }
  }

  return results;
}

/**
 * Rollback the last N applied migrations.
 */
export async function rollback(
  options: MigrationRollbackOptions = {}
): Promise<MigrationResult[]> {
  const { dryRun = false, count = 1 } = options;
  const environment = getEnvironment();

  // Get applied migrations in reverse order (most recent first)
  const applied = await MigrationRecord.find({ environment })
    .sort({ appliedAt: -1 })
    .limit(count)
    .lean();

  if (applied.length === 0) {
    log.info('No applied migrations to rollback');
    return [];
  }

  const migrations = await discover();
  const migrationMap = new Map(migrations.map((m) => [m.id, m]));

  const db = mongoose.connection.db;
  if (!db) {
    throw new Error('Database connection not available');
  }

  const ctx: MigrationContext = { db, dryRun, environment };
  const results: MigrationResult[] = [];

  log.info(
    `${dryRun ? '[DRY RUN] ' : ''}Rolling back ${applied.length} migration(s)`
  );

  for (const record of applied) {
    const migration = migrationMap.get(record.migrationId);

    if (!migration) {
      log.error(
        `Migration file not found for "${record.migrationId}". Cannot rollback.`
      );
      results.push({
        migrationId: record.migrationId,
        name: record.name,
        direction: 'down',
        success: false,
        durationMs: 0,
        error: 'Migration file not found',
      });
      break;
    }

    if (!migration.down) {
      log.error(
        `Migration "${migration.id}" does not have a down function. Cannot rollback.`
      );
      results.push({
        migrationId: migration.id,
        name: migration.name,
        direction: 'down',
        success: false,
        durationMs: 0,
        error: 'No down function defined for this migration',
      });
      break;
    }

    log.info(
      `${dryRun ? '[DRY RUN] ' : ''}Rolling back: ${migration.id} - ${migration.name}`
    );

    const start = Date.now();

    try {
      const result = await migration.down(ctx);
      const durationMs = Date.now() - start;

      results.push({ ...result, durationMs });

      if (!result.success) {
        log.error(`Rollback of ${migration.id} failed: ${result.error}`);
        break;
      }

      if (!dryRun) {
        await MigrationRecord.deleteOne({
          migrationId: migration.id,
          environment,
        });
      }

      log.info(
        `${dryRun ? '[DRY RUN] ' : ''}Rolled back ${migration.id} in ${durationMs}ms`
      );
    } catch (err: any) {
      const durationMs = Date.now() - start;
      results.push({
        migrationId: migration.id,
        name: migration.name,
        direction: 'down',
        success: false,
        durationMs,
        error: err.message,
      });
      log.error(`Rollback of ${migration.id} threw an error: ${err.message}`);
      break;
    }
  }

  return results;
}
