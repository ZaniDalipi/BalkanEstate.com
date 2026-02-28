import mongoose from 'mongoose';

type Db = typeof mongoose extends { connection: { db: infer D } } ? NonNullable<D> : never;

/** Result of a single migration execution */
export interface MigrationResult {
  migrationId: string;
  name: string;
  direction: 'up' | 'down';
  success: boolean;
  durationMs: number;
  error?: string;
  affectedDocuments?: number;
}

/** Context passed to every migration's up/down function */
export interface MigrationContext {
  db: Db;
  dryRun: boolean;
  environment: string;
}

/** Shape every migration file must export */
export interface Migration {
  id: string;
  name: string;
  description: string;
  up: (ctx: MigrationContext) => Promise<MigrationResult>;
  down?: (ctx: MigrationContext) => Promise<MigrationResult>;
}

/** A single record stored in the _migrations collection */
export interface IMigrationRecord {
  migrationId: string;
  name: string;
  description: string;
  appliedAt: Date;
  durationMs: number;
  environment: string;
  checksum: string;
  rolledBackAt?: Date;
}

/** Status of one migration (discovered file + DB state) */
export interface MigrationStatus {
  migrationId: string;
  name: string;
  description: string;
  state: 'pending' | 'applied';
  appliedAt?: Date;
  hasDown: boolean;
  checksumMatch?: boolean;
}

/** Validation result matching project's pure-function validation pattern */
export interface MigrationValidationResult {
  isValid: boolean;
  error?: string;
}

/** Options for the migration runner */
export interface MigrationRunOptions {
  dryRun?: boolean;
  target?: string;
}

/** Options for the rollback runner */
export interface MigrationRollbackOptions {
  dryRun?: boolean;
  count?: number;
}
