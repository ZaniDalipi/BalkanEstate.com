import { Request, Response } from 'express';
import { apiLogger } from '../utils/logger';
import { handleTelegramUpdate } from '../services/telegramBotService';

/**
 * Handle incoming Telegram webhook updates
 */
export const handleWebhook = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const update = req.body;

    // Always respond 200 to Telegram immediately to avoid retries
    res.sendStatus(200);

    // Process the update asynchronously
    if (update && (update.message || update.callback_query)) {
      await handleTelegramUpdate(update);
    }
  } catch (error: any) {
    apiLogger.error('[telegramController] Webhook error:', error);
    // Still send 200 to prevent Telegram from retrying
    if (!res.headersSent) {
      res.sendStatus(200);
    }
  }
};

/**
 * Get Telegram community info (group link, bot username, stats)
 */
export const getTelegramInfo = async (
  _req: Request,
  res: Response
): Promise<void> => {
  try {
    res.json({
      groupLink: process.env.TELEGRAM_GROUP_LINK || 'https://t.me/BalkanEstate',
      botUsername: process.env.TELEGRAM_BOT_USERNAME || 'BalkanEstateBot',
      features: [
        'Search properties by city',
        'Submit property requests',
        'Get notified about new listings',
        'Connect with agents and sellers',
        'Browse latest properties',
      ],
    });
  } catch (error: any) {
    apiLogger.error('[telegramController] Get info error:', error);
    res.status(500).json({ message: 'Error fetching Telegram info' });
  }
};
