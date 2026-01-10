import express from 'express';
import { protect } from '../middleware/authMiddleware';
import {
  getMeasurements,
  saveMeasurement,
  updateMeasurement,
  deleteMeasurement,
  getMeasurementById,
} from '../controllers/measurementController';

const router = express.Router();

// All routes require authentication
router.use(protect);

// GET /api/measurements - Get all measurements for the user
router.get('/', getMeasurements);

// POST /api/measurements - Save a new measurement
router.post('/', saveMeasurement);

// GET /api/measurements/:id - Get a single measurement
router.get('/:id', getMeasurementById);

// PUT /api/measurements/:id - Update a measurement
router.put('/:id', updateMeasurement);

// DELETE /api/measurements/:id - Delete a measurement
router.delete('/:id', deleteMeasurement);

export default router;
