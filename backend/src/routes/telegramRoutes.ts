import express from 'express';
import { handleWebhook, getTelegramInfo } from '../controllers/telegramController';

const router = express.Router();

// Telegram webhook endpoint (called by Telegram servers)
router.post('/webhook', handleWebhook);

// Get Telegram community info (public)
router.get('/info', getTelegramInfo);

export default router;
