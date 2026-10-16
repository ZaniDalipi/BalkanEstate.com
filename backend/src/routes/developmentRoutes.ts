import express from 'express';
import { listPublic, getPublicBySlug } from '../controllers/developmentController';

const router = express.Router();

/**
 * Public, read-only development routes. These expose only published
 * developments and never any private ownership, lead, or team information.
 */
router.get('/', listPublic);
router.get('/:slug', getPublicBySlug);

export default router;
