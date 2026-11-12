import express from 'express';
import { getPoiTile } from '../controllers/poiController';

const router = express.Router();

// Public: places of interest for the search map, one zoom-14 tile at a time.
router.get('/tile/:x/:y', getPoiTile);

export default router;
