import mongoose from 'mongoose';
import Property from '../../models/Property';
import SiteSettings from '../../models/SiteSettings';
import SocialPost, { ISocialPost, SocialChannel } from '../../models/SocialPost';
import { createLogger } from '../../utils/logger';
import { buildSocialCaption, listingUrlFor, CaptionListing } from './socialCaption';
import {
  getSocialConfig,
  publishToFacebookPage,
  publishToInstagram,
  describeGraphError,
} from './socialPublisher';

const socialLogger = createLogger('Social');

const frontendUrl = async (): Promise<string> => {
  const settings = await SiteSettings.getSettings().catch(() => null);
  return settings?.frontendUrl || process.env.FRONTEND_URL || 'https://balkanestateai.com';
};

/**
 * Put a listing that just went live into the admin's share queue.
 *
 * Idempotent: a listing that is re-published (sold → available, draft →
 * active again) keeps its one queue entry and is never offered twice.
 * Imported listings from other portals are skipped — the queue is for
 * listings people create on the site.
 */
export const enqueueListingForSocial = async (propertyId: string): Promise<ISocialPost | null> => {
  const property = await Property.findById(propertyId)
    .select('title listingType price isNegotiable rentPeriod city country beds baths sqft propertyType description imageUrl images status createdAsRole')
    .lean();
  if (!property || property.status !== 'active' || property.createdAsRole === 'external') return null;

  const url = listingUrlFor(await frontendUrl(), property._id);
  const imageUrls = [
    ...(property.images || []).map((img) => img.url),
    property.imageUrl,
  ].filter((u, i, all): u is string => Boolean(u) && all.indexOf(u) === i);

  const result = await SocialPost.findOneAndUpdate(
    { propertyId: property._id },
    {
      $setOnInsert: {
        propertyId: property._id,
        status: 'pending',
        caption: buildSocialCaption(property as unknown as CaptionListing, url),
        listingUrl: url,
        imageUrls,
        title: property.title || '',
        city: property.city,
        price: property.isNegotiable ? undefined : property.price,
        listingType: property.listingType,
      },
    },
    { upsert: true, new: true, includeResultMetadata: true }
  );
  if (!result.lastErrorObject?.updatedExisting) {
    socialLogger.info(`Listing ${propertyId} queued for social sharing`);
  }
  return result.value;
};

/** Fire-and-forget wrapper for the listing lifecycle hooks: never fails the request. */
export const queueListingForSocial = (propertyId: string): void => {
  enqueueListingForSocial(propertyId).catch((err) => {
    socialLogger.error(`Could not queue listing ${propertyId} for social sharing:`, err);
  });
};

export class SocialPostError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message);
  }
}

const findPost = async (id: string): Promise<ISocialPost> => {
  if (!mongoose.isValidObjectId(id)) throw new SocialPostError(400, 'Invalid post id');
  const post = await SocialPost.findById(id);
  if (!post) throw new SocialPostError(404, 'Social post not found');
  return post;
};

const PUBLISHERS: Record<SocialChannel, (post: ISocialPost) => Promise<{ postId: string; postUrl?: string }>> = {
  facebookPage: (post) => publishToFacebookPage(post.caption, post.listingUrl),
  instagram: (post) => publishToInstagram(post.caption, post.imageUrls),
};

/**
 * Approve a queued post and publish it to the chosen channels.
 *
 * Channels that aren't configured, or were already posted, are skipped, so
 * calling this again on an approved post retries only what failed. A failure
 * on one channel is recorded on the post and doesn't stop the others.
 */
export const approveSocialPost = async (
  id: string,
  opts: { caption?: string; channels?: SocialChannel[]; adminId?: string }
): Promise<ISocialPost> => {
  const post = await findPost(id);
  if (post.status === 'rejected') throw new SocialPostError(409, 'This post was rejected; restore it first');

  if (typeof opts.caption === 'string') {
    const caption = opts.caption.trim();
    if (!caption) throw new SocialPostError(400, 'Caption cannot be empty');
    post.caption = caption;
  }

  const config = getSocialConfig();
  const wanted = (opts.channels || []).filter(
    (ch): ch is SocialChannel => ch in PUBLISHERS && config[ch] && post.channels[ch].state !== 'posted'
  );

  for (const channel of wanted) {
    try {
      const { postId, postUrl } = await PUBLISHERS[channel](post);
      post.channels[channel] = { state: 'posted', postId, postUrl, postedAt: new Date() };
      socialLogger.info(`Social post ${id} published to ${channel}`);
    } catch (err) {
      const error = describeGraphError(err);
      post.channels[channel] = { state: 'failed', error };
      socialLogger.error(`Social post ${id} failed on ${channel}: ${error}`);
    }
  }

  post.status = 'approved';
  post.reviewedAt = new Date();
  if (opts.adminId && mongoose.isValidObjectId(opts.adminId)) {
    post.reviewedBy = new mongoose.Types.ObjectId(opts.adminId);
  }
  post.markModified('channels');
  await post.save();
  return post;
};

export const setSocialPostStatus = async (
  id: string,
  status: 'pending' | 'rejected',
  adminId?: string
): Promise<ISocialPost> => {
  const post = await findPost(id);
  const alreadyPosted = Object.values(post.channels).some((c) => c?.state === 'posted');
  if (status === 'rejected' && alreadyPosted) {
    throw new SocialPostError(409, 'Already published — remove it from the social account instead');
  }
  post.status = status;
  post.reviewedAt = new Date();
  if (adminId && mongoose.isValidObjectId(adminId)) post.reviewedBy = new mongoose.Types.ObjectId(adminId);
  await post.save();
  return post;
};

export const markGroupShared = async (id: string, shared: boolean): Promise<ISocialPost> => {
  const post = await findPost(id);
  post.groupSharedAt = shared ? new Date() : undefined;
  await post.save();
  return post;
};

export const listSocialPosts = async (status: string, page: number, limit: number) => {
  const filter = ['pending', 'approved', 'rejected'].includes(status) ? { status } : {};
  const [posts, total] = await Promise.all([
    SocialPost.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    SocialPost.countDocuments(filter),
  ]);
  return { posts, total, page, hasMore: page * limit < total };
};

export const countPendingSocialPosts = () => SocialPost.countDocuments({ status: 'pending' });
