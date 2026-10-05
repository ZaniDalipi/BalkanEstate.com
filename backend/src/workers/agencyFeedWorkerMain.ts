import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { initSentry } from '../lib/sentry';
import { serverLogger } from '../utils/logger';
import { startAgencyFeedWorker } from './agencyFeedWorker';

/**
 * Standalone process for agency property-feed imports:
 *   npm run worker:feeds          (production build: node dist/workers/agencyFeedWorkerMain.js)
 *
 * Runs the daily scheduler and the import job runners outside the API process,
 * so long downloads and image processing never compete with web requests and
 * a web deploy never interrupts an import.
 */
dotenv.config();
initSentry();

const main = async (): Promise<void> => {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    serverLogger.error('MONGODB_URI is required for the agency feed worker');
    process.exit(1);
  }
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10_000 });
  serverLogger.info('Agency feed worker connected to MongoDB');
  const worker = startAgencyFeedWorker();

  const shutdown = async (signal: string) => {
    serverLogger.info(`Agency feed worker received ${signal}, shutting down`);
    await worker.stop();
    await mongoose.disconnect();
    process.exit(0);
  };
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
};

main().catch((err) => {
  serverLogger.error('Agency feed worker failed to start', err);
  process.exit(1);
});
