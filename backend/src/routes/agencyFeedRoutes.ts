import express from 'express';
import path from 'path';
import multer from 'multer';
import rateLimit from 'express-rate-limit';
import { withUploadErrors } from '../middleware/uploadErrors';
import { UPLOAD_MAX_BYTES } from '../services/agencyFeeds/syncService';
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
  uploadAgencyFeedFile,
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

const XML_TYPES = new Set(['text/xml', 'application/xml', 'application/octet-stream', 'text/plain', '']);
/** One XML file in memory, size-capped; its content is validated again by the XML reader. */
const xmlUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: UPLOAD_MAX_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    const okExtension = path.extname(file.originalname).toLowerCase() === '.xml';
    const okType = XML_TYPES.has(file.mimetype) || file.mimetype.endsWith('+xml');
    if (okExtension && okType) cb(null, true);
    else cb(new Error('Only .xml files can be uploaded'));
  },
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
router.post(
  '/:agencyId/feeds/:feedId/upload',
  ...withFeed,
  fetchTriggerLimiter,
  withUploadErrors(xmlUpload.single('file'), { field: 'file', maxFiles: 1, maxFileSizeBytes: UPLOAD_MAX_BYTES }),
  uploadAgencyFeedFile
);
router.post('/:agencyId/feeds/:feedId/activate', ...withFeed, activateAgencyFeed);
router.post('/:agencyId/feeds/:feedId/pause', ...withFeed, pauseAgencyFeed);
router.post('/:agencyId/feeds/:feedId/resume', ...withFeed, resumeAgencyFeed);

router.get('/:agencyId/feeds/:feedId/runs', ...withFeed, listFeedRuns);
router.get('/:agencyId/feeds/:feedId/runs/:runId', ...withFeed, getFeedRun);
router.post('/:agencyId/feeds/:feedId/runs/:runId/deactivations', ...withFeed, reviewFeedDeactivations);
router.get('/:agencyId/feeds/:feedId/audit', ...withFeed, getFeedAudit);
router.put('/:agencyId/feeds/:feedId/listings/:propertyId/locks', ...withFeed, setFeedListingLocks);

export default router;
