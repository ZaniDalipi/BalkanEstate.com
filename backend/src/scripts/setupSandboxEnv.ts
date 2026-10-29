/**
 * Create backend/.env.development from .env.sandbox.example: dummy values for
 * third-party keys and fresh random values for the app's own secrets.
 *
 *   npm run setup:sandbox            # refuses if .env.development exists
 *   npm run setup:sandbox -- --force # backs the old file up first
 */
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import webpush from 'web-push';
import { fillSandboxTemplate, keysLeakingFromBaseEnv } from '../utils/sandboxEnv';
import { scriptLogger } from '../utils/logger';

const log = scriptLogger.child('SetupSandboxEnv');

const backendRoot = path.resolve(__dirname, '../..');
const templatePath = path.join(backendRoot, '.env.sandbox.example');
const targetPath = path.join(backendRoot, '.env.development');
const baseEnvPath = path.join(backendRoot, '.env');

/** Random values, plus one VAPID key pair so its two halves match. */
const makeGenerator = (): ((key: string) => string | undefined) => {
  const vapid = webpush.generateVAPIDKeys();
  return (key) => {
    if (key === 'VAPID_PUBLIC_KEY') return vapid.publicKey;
    if (key === 'VAPID_PRIVATE_KEY') return vapid.privateKey;
    return crypto.randomBytes(48).toString('hex');
  };
};

function fail(message: string): never {
  log.error(`❌ ${message}`);
  process.exit(1);
}

const main = (): void => {
  if (process.env.NODE_ENV === 'production') {
    fail('Refusing to run with NODE_ENV=production: sandbox values are for development only.');
  }

  if (fs.existsSync(targetPath)) {
    if (!process.argv.includes('--force')) {
      fail(
        '.env.development already exists, so nothing was changed.\n' +
        '   New random keys would stop existing users in your local database from\n' +
        '   signing in. To replace it anyway (the old file is kept as a backup):\n' +
        '   npm run setup:sandbox -- --force',
      );
    }
    // The .local suffix keeps the backup gitignored (.env.*.local).
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(backendRoot, `.env.development.backup-${stamp}.local`);
    fs.renameSync(targetPath, backupPath);
    log.info(`📦 Old file kept as ${path.basename(backupPath)}`);
  }

  const result = fillSandboxTemplate(fs.readFileSync(templatePath, 'utf8'), makeGenerator());
  if (result.ok === false) {
    fail(result.error);
  }

  fs.writeFileSync(targetPath, result.content, { mode: 0o600 });
  log.info('✅ Created backend/.env.development with sandbox values');
  log.info(`   Generated on this machine: ${result.generatedKeys.join(', ')}`);
  log.info('   Third-party keys are empty, so payments, email sending, uploads and AI are off.');

  if (fs.existsSync(baseEnvPath)) {
    const leaking = keysLeakingFromBaseEnv(fs.readFileSync(baseEnvPath, 'utf8'), result.content);
    log.warn('⚠️  backend/.env also exists. Scripts that read it directly (e.g. seed:dev-admin)');
    log.warn('   still use its values. If it holds real secrets, delete it.');
    if (leaking.length > 0) {
      log.warn(`   Keys the server would still take from it: ${leaking.join(', ')}`);
    }
  }
};

main();
