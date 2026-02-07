import express from 'express';
import { getCadastreFeatureInfo } from '../controllers/cadastreController';

const router = express.Router();

// Public - proxy WMS GetFeatureInfo to avoid CORS issues with government servers
router.get('/feature-info', getCadastreFeatureInfo);

export default router;
