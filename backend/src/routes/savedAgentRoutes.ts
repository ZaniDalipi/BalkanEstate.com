import express from 'express';
import {
  getSavedAgents,
  toggleSavedAgent,
  checkSavedAgent,
} from '../controllers/savedAgentController';
import { protect } from '../middleware/auth';

const router = express.Router();

router.use(protect); // All routes are protected

router.get('/', getSavedAgents);
router.post('/toggle', toggleSavedAgent);
router.get('/check/:agentId', checkSavedAgent);

export default router;
