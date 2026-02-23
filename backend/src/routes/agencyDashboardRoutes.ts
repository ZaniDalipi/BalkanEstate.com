import express from 'express';
import { protect } from '../middleware/auth';
import { agencyDashboardAuth } from '../middleware/agencyDashboardAuth';
import {
  getOverview,
  getAgents,
  getAgentPerformance,
  getProperties,
  bulkPropertyAction,
  getInquiries,
  assignInquiry,
  getAnalytics,
  exportAnalytics,
  getFinancial,
  getTeamFeed,
  getTeamNotes,
  createTeamNote,
} from '../controllers/agencyDashboardController';

const router = express.Router();

// All routes require authentication + agency dashboard authorization
// protect: validates JWT, attaches req.user
// agencyDashboardAuth: validates agencyId, checks owner/admin, checks subscription, attaches req.agency

// Overview
router.get('/:agencyId/overview', protect, agencyDashboardAuth, getOverview);

// Agent management
router.get('/:agencyId/agents', protect, agencyDashboardAuth, getAgents);
router.get('/:agencyId/agents/:agentId/performance', protect, agencyDashboardAuth, getAgentPerformance);

// Property management
router.get('/:agencyId/properties', protect, agencyDashboardAuth, getProperties);
router.post('/:agencyId/properties/bulk-action', protect, agencyDashboardAuth, bulkPropertyAction);

// Inquiry management
router.get('/:agencyId/inquiries', protect, agencyDashboardAuth, getInquiries);
router.put('/:agencyId/inquiries/:inquiryId/assign', protect, agencyDashboardAuth, assignInquiry);

// Analytics
router.get('/:agencyId/analytics', protect, agencyDashboardAuth, getAnalytics);
router.get('/:agencyId/analytics/export', protect, agencyDashboardAuth, exportAnalytics);

// Financial
router.get('/:agencyId/financial', protect, agencyDashboardAuth, getFinancial);

// Team feed & notes
router.get('/:agencyId/team-feed', protect, agencyDashboardAuth, getTeamFeed);
router.get('/:agencyId/team-notes', protect, agencyDashboardAuth, getTeamNotes);
router.post('/:agencyId/team-notes', protect, agencyDashboardAuth, createTeamNote);

export default router;
