import express from 'express';
import { protect } from '../middleware/auth';
import {
  getLeads,
  getPipelineSummary,
  getLead,
  createLead,
  updateLead,
  moveLeadStage,
  addActivity,
  archiveLead,
  deleteLead,
  createLeadFromInquiry,
} from '../controllers/crmController';
import { decryptPayload } from '../middleware/decryptPayload';

const router = express.Router();

// All CRM routes require authentication
router.use(protect);

// Pipeline summary (counts per stage)
router.get('/leads/pipeline', getPipelineSummary);

// Convert inquiry to lead (must come before /:leadId)
router.post('/leads/from-inquiry/:inquiryId', createLeadFromInquiry);

// Lead CRUD
router.get('/leads', getLeads);
router.post('/leads', decryptPayload, createLead);
router.get('/leads/:leadId', getLead);
router.put('/leads/:leadId', decryptPayload, updateLead);
router.delete('/leads/:leadId', deleteLead);

// Stage transitions
router.patch('/leads/:leadId/stage', decryptPayload, moveLeadStage);

// Activity log
router.post('/leads/:leadId/activities', decryptPayload, addActivity);

// Archive/restore
router.patch('/leads/:leadId/archive', decryptPayload, archiveLead);

export default router;
