import { Request, Response } from 'express';
import { createLogger } from '../utils/logger';
import { getSocialConfig } from '../services/social/socialPublisher';
import {
  approveSocialPost,
  enqueueListingForSocial,
  listSocialPosts,
  markGroupShared,
  setSocialPostStatus,
  SocialPostError,
} from '../services/social/socialQueueService';
import type { SocialChannel } from '../models/SocialPost';

const socialLogger = createLogger('Social');

const adminIdOf = (req: Request): string | undefined => {
  const id = (req.user as { _id?: unknown } | undefined)?._id;
  return id ? String(id) : undefined;
};

const handle =
  (label: string, fn: (req: Request, res: Response) => Promise<void>) =>
  async (req: Request, res: Response): Promise<void> => {
    try {
      await fn(req, res);
    } catch (err) {
      if (err instanceof SocialPostError) {
        res.status(err.statusCode).json({ message: err.message });
        return;
      }
      socialLogger.error(`${label} error:`, err);
      res.status(500).json({ message: `Error: ${label}` });
    }
  };

// GET /api/admin/social-posts/config
export const getConfig = handle('load social config', async (_req, res) => {
  res.json(getSocialConfig());
});

// GET /api/admin/social-posts?status=pending&page=1
export const list = handle('list social posts', async (req, res) => {
  const page = Math.max(1, parseInt(String(req.query.page || '1'), 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit || '20'), 10) || 20));
  res.json(await listSocialPosts(String(req.query.status || 'pending'), page, limit));
});

// POST /api/admin/social-posts/queue  { propertyId } — add an older listing by hand
export const queueProperty = handle('queue listing', async (req, res) => {
  const propertyId = String(req.body?.propertyId || '');
  const post = await enqueueListingForSocial(propertyId).catch(() => null);
  if (!post) {
    res.status(400).json({ message: 'Listing not found, not active, or imported from another site' });
    return;
  }
  res.json({ post });
});

// POST /api/admin/social-posts/:id/approve  { caption?, channels? }
export const approve = handle('approve social post', async (req, res) => {
  const channels = Array.isArray(req.body?.channels) ? (req.body.channels as SocialChannel[]) : [];
  const caption = typeof req.body?.caption === 'string' ? req.body.caption : undefined;
  const post = await approveSocialPost(String(req.params.id), { caption, channels, adminId: adminIdOf(req) });
  res.json({ post });
});

// POST /api/admin/social-posts/:id/reject
export const reject = handle('reject social post', async (req, res) => {
  res.json({ post: await setSocialPostStatus(String(req.params.id), 'rejected', adminIdOf(req)) });
});

// POST /api/admin/social-posts/:id/restore — back to pending
export const restore = handle('restore social post', async (req, res) => {
  res.json({ post: await setSocialPostStatus(String(req.params.id), 'pending', adminIdOf(req)) });
});

// POST /api/admin/social-posts/:id/group-shared  { shared: boolean }
export const groupShared = handle('mark group share', async (req, res) => {
  res.json({ post: await markGroupShared(String(req.params.id), req.body?.shared !== false) });
});
