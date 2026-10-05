import express from 'express';
import rateLimit from 'express-rate-limit';
import { protect } from '../middleware/auth';
import { agencyDashboardAuth } from '../middleware/agencyDashboardAuth';
import { loadAgencyFeed, requireAgencyFeedManager } from '../middleware/agencyFeedManagerAuth';
import {
  activateAgencyFeed,
  createAgencyFeed,
  deleteAgencyFeed,
  getAgencyFeed,
  getFeedAudit,
  getFeedMeta,
  getFeedRun,
  listFeedRuns,
  listFeeds,
  pauseAgencyFeed,
  previewAgencyFeed,
  resumeAgencyFeed,
  reviewFeedDeactivations,
  setFeedListingLocks,
  syncAgencyFeed,
  updateAgencyFeed,
} from '../controllers/agencyFeedController';

/**
 * Property Imports (agency XML feeds).
 * Mounted at /api/agency-dashboard; every route is agency-scoped and
 * manager-only. Fetch-triggering endpoints are rate limited per user, on top
 * of the one-job-per-feed rule the queue enforces.
 */
const router = express.Router();

const fetchTriggerLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: (req) => `feed-trigger:${String((req.user as { _id?: unknown } | undefined)?._id ?? 'anon')}`,
  message: { message: 'Too many import requests. Please wait a few minutes.' },
});

const base = [protect, agencyDashboardAuth, requireAgencyFeedManager] as const;
const withFeed = [...base, loadAgencyFeed] as const;

router.get('/:agencyId/feeds/meta', ...base, getFeedMeta);
router.get('/:agencyId/feeds', ...base, listFeeds);
router.post('/:agencyId/feeds', ...base, createAgencyFeed);
router.get('/:agencyId/feeds/:feedId', ...withFeed, getAgencyFeed);
router.patch('/:agencyId/feeds/:feedId', ...withFeed, updateAgencyFeed);
router.delete('/:agencyId/feeds/:feedId', ...withFeed, deleteAgencyFeed);

router.post('/:agencyId/feeds/:feedId/preview', ...withFeed, fetchTriggerLimiter, previewAgencyFeed);
router.post('/:agencyId/feeds/:feedId/sync', ...withFeed, fetchTriggerLimiter, syncAgencyFeed);
router.post('/:agencyId/feeds/:feedId/activate', ...withFeed, activateAgencyFeed);
router.post('/:agencyId/feeds/:feedId/pause', ...withFeed, pauseAgencyFeed);
router.post('/:agencyId/feeds/:feedId/resume', ...withFeed, resumeAgencyFeed);

router.get('/:agencyId/feeds/:feedId/runs', ...withFeed, listFeedRuns);
router.get('/:agencyId/feeds/:feedId/runs/:runId', ...withFeed, getFeedRun);
router.post('/:agencyId/feeds/:feedId/runs/:runId/deactivations', ...withFeed, reviewFeedDeactivations);
router.get('/:agencyId/feeds/:feedId/audit', ...withFeed, getFeedAudit);
router.put('/:agencyId/feeds/:feedId/listings/:propertyId/locks', ...withFeed, setFeedListingLocks);

export default router;
