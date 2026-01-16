import express from 'express';
import {
  getHowItWorksContent,
  getContentBySection,
} from '../controllers/siteContentController';

const router = express.Router();

// Public routes - no authentication required
router.get('/how-it-works', getHowItWorksContent);
router.get('/:section', getContentBySection);
router.get('/:section/:subsection', getContentBySection);

export default router;
