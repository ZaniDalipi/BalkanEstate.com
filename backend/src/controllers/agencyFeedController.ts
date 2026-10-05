import { Request, Response } from 'express';
import { Types } from 'mongoose';
import type { IAgency } from '../models/Agency';
import type { IAgencyFeed } from '../models/AgencyFeed';
import type { IUser } from '../models/User';
import AgencyFeedRun from '../models/AgencyFeedRun';
import AgencyFeedAuditLog from '../models/AgencyFeedAuditLog';
import { PROPERTY_TYPES } from '../config/propertyTypes';
import { getObjectIdParam } from '../utils/validateParams';
import { agencyLogger } from '../utils/logger';
import { CANONICAL_FORMAT_VERSION, CANONICAL_MAPPING } from '../services/agencyFeeds/canonicalFormat';
import { FEED_FIELDS } from '../services/agencyFeeds/feedTypes';
import { FeedBusyError } from '../services/agencyFeeds/feedJobQueue';
import { LOCKABLE_FIELDS, SOURCE_MANAGED_FIELDS } from '../services/agencyFeeds/managedFields';
import {
  AUTHORIZATION_STATEMENT,
  FeedInputError,
  FeedStateError,
  activateFeed,
  createFeed,
  deleteFeed,
  describeFeeds,
  pauseFeed,
  requestPreview,
  requestSync,
  resolveDeactivationReview,
  resumeFeed,
  setListingLocks,
  toFeedDto,
  toRunDto,
  updateFeed,
} from '../services/agencyFeeds/feedManagementService';

/**
 * HTTP layer for /api/agency-dashboard/:agencyId/feeds. Authorization is done
 * by middleware (protect → agencyDashboardAuth → requireAgencyFeedManager →
 * loadAgencyFeed); business rules live in feedManagementService.
 */

const actorOf = (req: Request): Types.ObjectId => (req.user as IUser)._id as Types.ObjectId;
const agencyOf = (req: Request): IAgency => req.agency as IAgency;
const feedOf = (req: Request): IAgencyFeed => req.agencyFeed as IAgencyFeed;

const handleError = (res: Response, err: unknown, context: string): void => {
  if (err instanceof FeedInputError) {
    res.status(400).json({ message: 'Please fix the highlighted problems', errors: err.problems });
    return;
  }
  if (err instanceof FeedBusyError) {
    res.status(409).json({ message: err.message, code: 'busy' });
    return;
  }
  if (err instanceof FeedStateError) {
    res.status(err.code === 'not_found' ? 404 : 409).json({ message: err.message, code: err.code });
    return;
  }
  agencyLogger.error(`Agency feed ${context} failed`, err);
  res.status(500).json({ message: 'Internal server error' });
};

const LOCAL_ONLY_SUMMARY = [
  'promotions and badges',
  'videos and virtual tours',
  'viewing availability',
  'special features and materials',
  'furnishing, heating, condition and view',
  'rental terms and tenant details',
  'your internal property ID',
];

export const getFeedMeta = (_req: Request, res: Response): void => {
  res.json({
    canonical: { version: CANONICAL_FORMAT_VERSION, mapping: CANONICAL_MAPPING },
    fields: FEED_FIELDS,
    propertyTypes: PROPERTY_TYPES,
    sourceManagedFields: SOURCE_MANAGED_FIELDS,
    lockableFields: LOCKABLE_FIELDS,
    localOnly: LOCAL_ONLY_SUMMARY,
    authorizationStatement: AUTHORIZATION_STATEMENT,
    supportedCurrencies: ['EUR'],
  });
};

export const listFeeds = async (req: Request, res: Response): Promise<void> => {
  try {
    res.json({ feeds: await describeFeeds(agencyOf(req)._id as Types.ObjectId) });
  } catch (err) {
    handleError(res, err, 'list');
  }
};

export const createAgencyFeed = async (req: Request, res: Response): Promise<void> => {
  try {
    const feed = await createFeed(agencyOf(req), actorOf(req), req.body ?? {});
    res.status(201).json({ feed: toFeedDto(feed) });
  } catch (err) {
    handleError(res, err, 'create');
  }
};

export const getAgencyFeed = (req: Request, res: Response): void => {
  res.json({ feed: toFeedDto(feedOf(req)) });
};

export const updateAgencyFeed = async (req: Request, res: Response): Promise<void> => {
  try {
    const feed = await updateFeed(feedOf(req), agencyOf(req), actorOf(req), req.body ?? {});
    res.json({ feed: toFeedDto(feed) });
  } catch (err) {
    handleError(res, err, 'update');
  }
};

export const deleteAgencyFeed = async (req: Request, res: Response): Promise<void> => {
  try {
    res.json(await deleteFeed(feedOf(req), actorOf(req)));
  } catch (err) {
    handleError(res, err, 'delete');
  }
};

export const previewAgencyFeed = async (req: Request, res: Response): Promise<void> => {
  try {
    const { runId } = await requestPreview(feedOf(req), actorOf(req));
    res.status(202).json({ runId: String(runId) });
  } catch (err) {
    handleError(res, err, 'preview');
  }
};

export const syncAgencyFeed = async (req: Request, res: Response): Promise<void> => {
  try {
    const { runId } = await requestSync(feedOf(req), actorOf(req));
    res.status(202).json({ runId: String(runId) });
  } catch (err) {
    handleError(res, err, 'sync');
  }
};

export const activateAgencyFeed = async (req: Request, res: Response): Promise<void> => {
  try {
    const { runId } = await activateFeed(feedOf(req), actorOf(req), req.body ?? {});
    res.json({ feed: toFeedDto(feedOf(req), { activeJob: true }), runId: String(runId) });
  } catch (err) {
    handleError(res, err, 'activate');
  }
};

export const pauseAgencyFeed = async (req: Request, res: Response): Promise<void> => {
  try {
    await pauseFeed(feedOf(req), actorOf(req));
    res.json({ feed: toFeedDto(feedOf(req)) });
  } catch (err) {
    handleError(res, err, 'pause');
  }
};

export const resumeAgencyFeed = async (req: Request, res: Response): Promise<void> => {
  try {
    await resumeFeed(feedOf(req), actorOf(req));
    res.json({ feed: toFeedDto(feedOf(req)) });
  } catch (err) {
    handleError(res, err, 'resume');
  }
};

export const listFeedRuns = async (req: Request, res: Response): Promise<void> => {
  try {
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
    const runs = await AgencyFeedRun.find({ feedId: feedOf(req)._id }).sort({ createdAt: -1 }).limit(limit);
    res.json({ runs: runs.map((r) => toRunDto(r)) });
  } catch (err) {
    handleError(res, err, 'runs');
  }
};

export const getFeedRun = async (req: Request, res: Response): Promise<void> => {
  const runId = getObjectIdParam(req, res, 'runId');
  if (!runId) return;
  try {
    const run = await AgencyFeedRun.findOne({ _id: runId, feedId: feedOf(req)._id });
    if (!run) {
      res.status(404).json({ message: 'Import not found' });
      return;
    }
    res.json({ run: toRunDto(run, true) });
  } catch (err) {
    handleError(res, err, 'run');
  }
};

export const reviewFeedDeactivations = async (req: Request, res: Response): Promise<void> => {
  const runId = getObjectIdParam(req, res, 'runId');
  if (!runId) return;
  const decision = req.body?.decision;
  if (decision !== 'approve' && decision !== 'dismiss') {
    res.status(400).json({ message: 'decision must be "approve" or "dismiss"' });
    return;
  }
  try {
    res.json(await resolveDeactivationReview(feedOf(req), runId, decision, actorOf(req)));
  } catch (err) {
    handleError(res, err, 'review');
  }
};

export const getFeedAudit = async (req: Request, res: Response): Promise<void> => {
  try {
    const entries = await AgencyFeedAuditLog.find({ feedId: feedOf(req)._id }).sort({ createdAt: -1 }).limit(100).lean();
    res.json({
      entries: entries.map((e) => ({
        id: String(e._id),
        action: e.action,
        actorId: e.actorId ? String(e.actorId) : null,
        runId: e.runId ? String(e.runId) : null,
        details: e.details,
        createdAt: e.createdAt,
      })),
    });
  } catch (err) {
    handleError(res, err, 'audit');
  }
};

export const setFeedListingLocks = async (req: Request, res: Response): Promise<void> => {
  const propertyId = getObjectIdParam(req, res, 'propertyId');
  if (!propertyId) return;
  try {
    const lockedFields = await setListingLocks(feedOf(req), propertyId, req.body?.lockedFields, actorOf(req));
    res.json({ lockedFields });
  } catch (err) {
    handleError(res, err, 'locks');
  }
};
