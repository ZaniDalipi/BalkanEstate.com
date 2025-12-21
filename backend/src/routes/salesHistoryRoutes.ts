import express from 'express';
import {
  getMySalesHistory,
  getAgentSalesHistory,
  getSaleById,
  updateSaleRecord,
} from '../controllers/salesHistoryController';
import { protect } from '../middleware/auth';

const router = express.Router();

// Protected routes (require authentication)
router.get('/my-sales', protect, getMySalesHistory);
router.get('/:id', protect, getSaleById);
router.patch('/:id', protect, updateSaleRecord);

// Public routes
router.get('/agent/:agentId', getAgentSalesHistory);

export default router;
