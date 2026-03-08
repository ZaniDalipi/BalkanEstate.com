import * as cron from 'node-cron';
import mongoose from 'mongoose';
import { cronLogger } from '../utils/logger';
import { sendGroupDigest } from '../services/telegramBotService';

let digestTask: cron.ScheduledTask | null = null;

/**
 * Start the Telegram daily digest cron job
 * Sends a summary of new listings and requests to the Telegram group every day at 9 AM UTC
 */
export function startTelegramDigestJob(): void {
  // Run daily at 9 AM UTC
  digestTask = cron.schedule('0 9 * * *', async () => {
    if (mongoose.connection.readyState !== 1) {
      cronLogger.info('⏭️ Skipping Telegram digest - MongoDB not connected');
      return;
    }

    try {
      cronLogger.info('📬 Sending Telegram daily digest...');
      await sendGroupDigest();
      cronLogger.info('✅ Telegram daily digest sent');
    } catch (error) {
      cronLogger.error('Telegram digest cron error:', error);
    }
  });
}

export function stopTelegramDigestJob(): void {
  if (digestTask) {
    digestTask.stop();
    cronLogger.info('🛑 Telegram digest job stopped');
  }
}
