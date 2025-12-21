import cron, { ScheduledTask } from 'node-cron';
import { updateAllCityMarketData } from '../services/cityMarketDataService';

/**
 * Biweekly City Market Data Update Job
 *
 * Runs twice per month (1st and 15th at 3 AM) to fetch fresh market data
 * from Gemini API and update the database.
 *
 * Schedule: '0 3 1,15 * *'
 * - 0 3: At 3:00 AM
 * - 1,15: On the 1st and 15th day of the month
 * - * *: Every month, every day of the week
 */

let updateJob: ScheduledTask | null = null;

export function startCityMarketDataUpdateJob(): void {
  // Prevent multiple instances
  if (updateJob) {
    console.log('⚠️ City market data update job is already running');
    return;
  }

  // Schedule: Twice per month on 1st and 15th at 3 AM
  updateJob = cron.schedule('0 3 1,15 * *', async () => {
    console.log('⏰ Biweekly city market data update triggered');

    try {
      await updateAllCityMarketData();
      console.log('✅ Biweekly market data update completed successfully');
    } catch (error) {
      console.error('❌ Biweekly market data update failed:', error);
    }
  }, {
    timezone: 'Europe/Belgrade', // Use Balkan timezone
  });

  console.log('✅ City market data update job scheduled (biweekly: 1st & 15th at 3 AM)');
}

export function stopCityMarketDataUpdateJob(): void {
  if (updateJob) {
    updateJob.stop();
    updateJob = null;
    console.log('⏹️ City market data update job stopped');
  }
}

/**
 * Manually trigger market data update (useful for testing or immediate updates)
 */
export async function triggerMarketDataUpdate(): Promise<void> {
  console.log('🔄 Manually triggering city market data update...');
  await updateAllCityMarketData();
}
