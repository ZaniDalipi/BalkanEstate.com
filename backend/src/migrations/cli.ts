import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { runPending, rollback, getStatus } from './MigrationRunner';
import { migrationLogger } from '../utils/logger';

const log = migrationLogger.child('CLI');

// Load environment-specific config
const env = process.env.NODE_ENV || 'development';
const envFile = env === 'development' ? '.env' : `.env.${env}`;
dotenv.config({ path: path.resolve(__dirname, '../../', envFile) });

const HELP_TEXT = `
Usage: ts-node src/migrations/cli.ts <command> [options]

Commands:
  up, run           Run all pending migrations
  down, rollback    Rollback the last N applied migrations
  status            Show migration status
  create <name>     Create a new migration file

Options:
  --dry-run         Preview changes without applying them
  --target <id>     Run migrations up to (and including) the target
  --count <n>       Number of migrations to rollback (default: 1)
  --help            Show this help message
`;

async function connectDB(): Promise<void> {
  const mongoURI =
    process.env.MONGODB_URI ||
    process.env.MONGO_URI ||
    'mongodb://localhost:27017/balkan-estate';
  await mongoose.connect(mongoURI);
  log.info(`Connected to MongoDB (${env})`);
}

async function disconnectDB(): Promise<void> {
  await mongoose.disconnect();
  log.info('Disconnected from MongoDB');
}

function parseArgs(argv: string[]): {
  command: string;
  dryRun: boolean;
  target?: string;
  count: number;
  name?: string;
} {
  const args = argv.slice(2);
  const command = args[0] || 'help';
  let dryRun = false;
  let target: string | undefined;
  let count = 1;
  let name: string | undefined;

  for (let i = 1; i < args.length; i++) {
    switch (args[i]) {
      case '--dry-run':
        dryRun = true;
        break;
      case '--target':
        target = args[++i];
        break;
      case '--count':
        count = parseInt(args[++i], 10) || 1;
        break;
      default:
        if (!name && !args[i].startsWith('--')) {
          name = args[i];
        }
        break;
    }
  }

  return { command, dryRun, target, count, name };
}

function printStatus(
  statuses: Awaited<ReturnType<typeof getStatus>>
): void {
  if (statuses.length === 0) {
    log.info('No migrations found');
    return;
  }

  const applied = statuses.filter((s) => s.state === 'applied').length;
  const pending = statuses.filter((s) => s.state === 'pending').length;

  log.info(`\nMigration Status (${env}):`);
  log.info(`  Applied: ${applied}  |  Pending: ${pending}  |  Total: ${statuses.length}\n`);

  const COL_ID = 18;
  const COL_NAME = 40;
  const COL_STATE = 12;
  const COL_DATE = 22;

  const header = [
    'ID'.padEnd(COL_ID),
    'Name'.padEnd(COL_NAME),
    'State'.padEnd(COL_STATE),
    'Applied At'.padEnd(COL_DATE),
  ].join(' | ');

  log.info(header);
  log.info('-'.repeat(header.length));

  for (const s of statuses) {
    const stateLabel = s.state === 'applied' ? '[APPLIED]' : '[PENDING]';
    const checksumWarning =
      s.state === 'applied' && s.checksumMatch === false ? ' [MODIFIED]' : '';
    const dateStr = s.appliedAt
      ? s.appliedAt.toISOString().replace('T', ' ').slice(0, 19)
      : '-';

    const row = [
      s.migrationId.slice(0, COL_ID).padEnd(COL_ID),
      s.name.slice(0, COL_NAME).padEnd(COL_NAME),
      (stateLabel + checksumWarning).padEnd(COL_STATE),
      dateStr.padEnd(COL_DATE),
    ].join(' | ');

    log.info(row);
  }
  log.info('');
}

function printResults(
  results: Awaited<ReturnType<typeof runPending>>
): void {
  if (results.length === 0) return;

  const succeeded = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;

  log.info(`\nResults: ${succeeded} succeeded, ${failed} failed`);

  for (const r of results) {
    const status = r.success ? 'OK' : 'FAILED';
    const extra = r.error ? ` — ${r.error}` : '';
    const docs =
      r.affectedDocuments !== undefined
        ? ` (${r.affectedDocuments} documents)`
        : '';
    log.info(`  [${status}] ${r.migrationId} (${r.durationMs}ms)${docs}${extra}`);
  }
}

function createMigrationFile(name: string): void {
  const now = new Date();
  const timestamp = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
    String(now.getHours()).padStart(2, '0'),
    String(now.getMinutes()).padStart(2, '0'),
    String(now.getSeconds()).padStart(2, '0'),
  ].join('');

  const kebab = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  const filename = `${timestamp}-${kebab}.ts`;
  const filePath = path.join(__dirname, 'scripts', filename);

  const template = `import type { Migration, MigrationContext, MigrationResult } from '../types';

const migration: Migration = {
  id: '${timestamp}-${kebab}',
  name: '${name}',
  description: 'TODO: describe what this migration does',

  async up(ctx: MigrationContext): Promise<MigrationResult> {
    const { db, dryRun } = ctx;
    let affectedDocuments = 0;

    try {
      // TODO: implement migration logic
      // const collection = db.collection('yourCollection');
      //
      // if (!dryRun) {
      //   const result = await collection.updateMany(filter, update);
      //   affectedDocuments = result.modifiedCount;
      // } else {
      //   affectedDocuments = await collection.countDocuments(filter);
      // }

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
      // TODO: implement rollback logic

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
`;

  fs.writeFileSync(filePath, template, 'utf-8');
  log.info(`Created migration: ${filename}`);
  log.info(`  Path: ${filePath}`);
}

async function main(): Promise<void> {
  const { command, dryRun, target, count, name } = parseArgs(process.argv);

  try {
    switch (command) {
      case 'up':
      case 'run': {
        await connectDB();
        const results = await runPending({ dryRun, target });
        printResults(results);
        await disconnectDB();
        const failed = results.some((r) => !r.success);
        process.exit(failed ? 1 : 0);
        break;
      }

      case 'down':
      case 'rollback': {
        await connectDB();
        const results = await rollback({ dryRun, count });
        printResults(results);
        await disconnectDB();
        const failed = results.some((r) => !r.success);
        process.exit(failed ? 1 : 0);
        break;
      }

      case 'status': {
        await connectDB();
        const statuses = await getStatus();
        printStatus(statuses);
        await disconnectDB();
        process.exit(0);
        break;
      }

      case 'create': {
        if (!name) {
          log.error('Usage: ts-node src/migrations/cli.ts create <migration-name>');
          process.exit(1);
        }
        createMigrationFile(name);
        process.exit(0);
        break;
      }

      case 'help':
      case '--help':
      case '-h': {
        console.log(HELP_TEXT);
        process.exit(0);
        break;
      }

      default: {
        log.error(`Unknown command: "${command}"`);
        console.log(HELP_TEXT);
        process.exit(1);
      }
    }
  } catch (err: any) {
    log.error(`Command failed: ${err.message}`);
    try {
      await disconnectDB();
    } catch {
      // already disconnected
    }
    process.exit(1);
  }
}

main();
