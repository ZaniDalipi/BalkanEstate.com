import express from 'express';
import {
  listPublic,
  getPublicBySlug,
  listPublicUnits,
  getPublicUnit,
} from '../controllers/developmentController';
import { getPublishedScene } from '../controllers/developmentSceneController';

const router = express.Router();

/**
 * Public, read-only development routes. These expose only published
 * developments and never any private ownership, lead, or team information.
 */
router.get('/', listPublic);
router.get('/:slug/scene', getPublishedScene);
router.get('/:slug/units/:unitId', getPublicUnit);
router.get('/:slug/units', listPublicUnits);
router.get('/:slug', getPublicBySlug);

export default router;
