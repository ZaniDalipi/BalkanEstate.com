/**
 * Agency property feeds — end-to-end sync against the in-memory database.
 *
 * The feed server, image downloads, image storage and geocoding are fakes
 * (see helpers/agencyFeedFixtures); the XML pipeline, planner, listing
 * writes, listing limits and the job queue are the real implementations.
 */
jest.mock('../jobs/propertyAlertsJob', () => ({
  ...jest.requireActual('../jobs/propertyAlertsJob'),
  processInstantPriceDropForProperty: jest.fn().mockResolvedValue(undefined),
}));

import Property from '../models/Property';
import PriceHistory from '../models/PriceHistory';
import User from '../models/User';
import AgencyFeedJob from '../models/AgencyFeedJob';
import AgencyFeedRun from '../models/AgencyFeedRun';
import AgencyFeedStagedRecord from '../models/AgencyFeedStagedRecord';
import AgencyFeedAuditLog from '../models/AgencyFeedAuditLog';
import { claimNextJob, enqueueFeedJob, FeedBusyError, processJob, scheduleDueFeeds } from '../services/agencyFeeds/feedJobQueue';
import { applyHeldDeactivations, executeRun } from '../services/agencyFeeds/syncService';
import AgencyFeed from '../models/AgencyFeed';
import { createAgencySetup, createWorld, feedXml, runJob, type TestListing } from './helpers/agencyFeedFixtures';

const ids = (n: number, from = 1): TestListing[] => Array.from({ length: n }, (_, i) => ({ id: `AG-${from + i}` }));
const feedListings = (feedId: unknown) => Property.find({ 'feedSync.feedId': feedId }).sort({ 'feedSync.externalId': 1 });

describe('agency feed sync', () => {
  it('imports a feed: creates listings with provenance, photos and plan charges', async () => {
    const { feed, agent, agency } = await createAgencySetup();
    const world = createWorld();
    world.setFeed(feedXml(ids(3)));

    const run = await runJob(feed, world);

    expect(run.status).toBe('succeeded');
    expect(run.counts).toMatchObject({ received: 3, created: 3, updated: 0, unchanged: 0, rejected: 0, deactivated: 0 });
    const listings = await feedListings(feed._id);
    expect(listings).toHaveLength(3);
    const first = listings[0];
    expect(first).toMatchObject({
      status: 'active',
      createdAsRole: 'agent',
      title: 'Apartment AG-1',
      description: 'Nice flat',
      price: 100000,
      source: `agency-feed:${feed._id}`,
      sourceListingId: 'AG-1',
    });
    expect(String(first.sellerId)).toBe(String(agent._id));
    expect(String(first.createdByAgencyId)).toBe(String(agency._id));
    expect(first.feedSync).toMatchObject({ externalId: 'AG-1', missingDetails: expect.arrayContaining(['yearBuilt', 'livingRooms']) });
    expect(first.images.map((i) => i.url)).toEqual([
      expect.stringContaining('res.cloudinary.com'),
      expect.stringContaining('res.cloudinary.com'),
    ]);
    expect(first.imageUrl).toBe(first.images[0].url);

    const user = await User.findById(agent._id).lean();
    expect(user?.subscription?.listingsCreatedThisMonth).toBe(3);
    expect(await AgencyFeedAuditLog.countDocuments({ feedId: feed._id, action: 'sync_completed' })).toBe(1);
  });

  it('repeating an import creates no duplicates, charges nothing and re-downloads nothing', async () => {
    const { feed, agent } = await createAgencySetup();
    const world = createWorld();
    world.setFeed(feedXml(ids(3)));
    await runJob(feed, world);
    const downloadsAfterFirst = world.downloads.length;

    const second = await runJob(feed, world);

    expect(second.status).toBe('succeeded');
    expect(second.counts).toMatchObject({ created: 0, updated: 0, unchanged: 3 });
    expect(await Property.countDocuments({ 'feedSync.feedId': feed._id })).toBe(3);
    expect(world.downloads.length).toBe(downloadsAfterFirst);
    const user = await User.findById(agent._id).lean();
    expect(user?.subscription?.listingsCreatedThisMonth).toBe(3);
  });

  it('applies a price change, records history and marks the reduction', async () => {
    const { feed } = await createAgencySetup();
    const world = createWorld();
    world.setFeed(feedXml([{ id: 'AG-1', price: 200000 }, { id: 'AG-2' }]));
    await runJob(feed, world);

    world.setFeed(feedXml([{ id: 'AG-1', price: 185000 }, { id: 'AG-2' }]));
    const run = await runJob(feed, world);

    expect(run.counts).toMatchObject({ updated: 1, unchanged: 1 });
    const listing = await Property.findOne({ 'feedSync.externalId': 'AG-1' });
    expect(listing).toMatchObject({ price: 185000, originalPrice: 200000 });
    expect(listing?.priceReducedAt).toBeInstanceOf(Date);
    const history = await PriceHistory.find({ propertyId: listing?._id }).sort({ changedAt: 1 }).lean();
    expect(history.map((h) => h.price)).toEqual([200000, 185000]);
  });

  it('keeps fields edited locally and never touches local-only content', async () => {
    const { feed } = await createAgencySetup();
    const world = createWorld();
    world.setFeed(feedXml([{ id: 'AG-1', title: 'Original title', price: 100000 }]));
    await runJob(feed, world);
    await Property.updateOne(
      { 'feedSync.externalId': 'AG-1' },
      { $set: { title: 'Our better title', videoUrl: 'https://youtube.com/watch?v=x', furnishing: 'furnished' } }
    );

    world.setFeed(feedXml([{ id: 'AG-1', title: 'Feed renamed it', price: 90000 }]));
    const run = await runJob(feed, world);

    const listing = await Property.findOne({ 'feedSync.externalId': 'AG-1' });
    expect(listing).toMatchObject({ title: 'Our better title', price: 90000, videoUrl: 'https://youtube.com/watch?v=x', furnishing: 'furnished' });
    expect(run.counts.localEditsKept).toBe(1);
    expect(run.issues.map((i) => i.code)).toContain('local_edit_kept');
  });

  it('soft-deactivates listings removed from a complete snapshot and restores them when they return', async () => {
    const { feed } = await createAgencySetup();
    const world = createWorld();
    world.setFeed(feedXml(ids(10)));
    await runJob(feed, world);

    world.setFeed(feedXml(ids(9)));
    const removal = await runJob(feed, world);
    expect(removal.status).toBe('succeeded');
    expect(removal.counts.deactivated).toBe(1);
    const gone = await Property.findOne({ 'feedSync.externalId': 'AG-10' });
    expect(gone).toMatchObject({ status: 'draft' });
    expect(gone?.feedSync).toMatchObject({ deactivationReason: 'removed_from_feed', statusBeforeDeactivation: 'active' });
    expect(await Property.countDocuments({ 'feedSync.feedId': feed._id })).toBe(10);

    world.setFeed(feedXml(ids(10)));
    const back = await runJob(feed, world);
    expect(back.counts.reactivated).toBe(1);
    const restored = await Property.findOne({ 'feedSync.externalId': 'AG-10' });
    expect(restored?.status).toBe('active');
    expect(restored?.feedSync?.deactivatedAt).toBeUndefined();
  });

  it('deactivates a listing the feed explicitly marks removed', async () => {
    const { feed } = await createAgencySetup();
    const world = createWorld();
    world.setFeed(feedXml(ids(3)));
    await runJob(feed, world);
    world.setFeed(feedXml([...ids(2), { id: 'AG-3', status: 'removed' }]));
    const run = await runJob(feed, world);
    expect(run.counts.deactivated).toBe(1);
    expect((await Property.findOne({ 'feedSync.externalId': 'AG-3' }))?.feedSync?.deactivationReason).toBe('marked_removed');
  });

  describe('never deactivates on a bad feed', () => {
    const setup = async () => {
      const ctx = await createAgencySetup();
      const world = createWorld();
      world.setFeed(feedXml(ids(10)));
      await runJob(ctx.feed, world);
      return { ...ctx, world };
    };
    const activeCount = (feedId: unknown) => Property.countDocuments({ 'feedSync.feedId': feedId, status: 'active' });

    it('failed request: the run fails (after retries) and nothing changes', async () => {
      const { feed, world } = await setup();
      world.failWith(503);
      const first = await runJob(feed, world);
      expect(first.status).toBe('queued');
      expect(first.error?.code).toBe('server_error');
      // Drain the retries with backoff.
      for (let i = 0; i < 5; i++) {
        const job = await claimNextJob('w', new Date(Date.now() + 24 * 60 * 60 * 1000));
        if (!job) break;
        await processJob(job, 'w', world.deps);
      }
      const final = await AgencyFeedRun.findById(first._id);
      expect(final?.status).toBe('failed');
      expect(await activeCount(feed._id)).toBe(10);
      const updatedFeed = await AgencyFeed.findById(feed._id);
      expect(updatedFeed?.consecutiveFailures).toBe(1);
      expect(updatedFeed?.lastError?.code).toBe('server_error');
      expect(await AgencyFeedJob.countDocuments({ feedId: feed._id, activeKey: { $exists: true } })).toBe(0);
    });

    it('invalid XML', async () => {
      const { feed, world } = await setup();
      world.setFeed('<balkanestate-feed><listing><id>AG-1</id></balkanestate-feed>');
      const run = await runJob(feed, world);
      expect(run.status).toBe('failed');
      expect(run.error?.code).toBe('invalid_xml');
      expect(await activeCount(feed._id)).toBe(10);
    });

    it('empty feed', async () => {
      const { feed, world } = await setup();
      world.setFeed(feedXml([]));
      const run = await runJob(feed, world);
      expect(run.deactivation.allowed).toBe(false);
      expect(await activeCount(feed._id)).toBe(10);
    });

    it('truncated feed (declared total not met)', async () => {
      const { feed, world } = await setup();
      world.setFeed(feedXml(ids(9), 'total="10"'));
      const run = await runJob(feed, world);
      expect(run.snapshot.complete).toBe(false);
      expect(run.deactivation.allowed).toBe(false);
      expect(await activeCount(feed._id)).toBe(10);
    });

    it('suspicious drop: held for review, applied only after approval', async () => {
      const { feed, owner, world } = await setup();
      world.setFeed(feedXml(ids(4)));
      const run = await runJob(feed, world);
      expect(run.status).toBe('awaiting_review');
      expect(run.deactivation).toMatchObject({ held: true, candidates: 6 });
      expect(await activeCount(feed._id)).toBe(10);

      const applied = await applyHeldDeactivations(run._id as never, owner._id as never);
      expect(applied).toBe(6);
      expect(await activeCount(feed._id)).toBe(4);
      expect((await AgencyFeedRun.findById(run._id))?.deactivation.resolution).toBe('approved');
    });

    it('a held review expires once a newer sync has run', async () => {
      const { feed, owner, world } = await setup();
      world.setFeed(feedXml(ids(4)));
      const held = await runJob(feed, world);
      world.setFeed(feedXml(ids(10)));
      await runJob(feed, world);
      expect(await applyHeldDeactivations(held._id as never, owner._id as never)).toBe(0);
      expect(await activeCount(feed._id)).toBe(10);
    });
  });

  it('delta feeds never deactivate by absence', async () => {
    const { feed } = await createAgencySetup({ mode: 'delta' });
    const world = createWorld();
    world.setFeed(feedXml(ids(5)));
    await runJob(feed, world);
    world.setFeed(feedXml([{ id: 'AG-1', price: 1 }]));
    const run = await runJob(feed, world);
    expect(run.counts).toMatchObject({ updated: 1, deactivated: 0 });
    expect(await Property.countDocuments({ 'feedSync.feedId': feed._id, status: 'active' })).toBe(5);
  });

  it('rejects duplicate external IDs and does not deactivate the existing listing', async () => {
    const { feed } = await createAgencySetup();
    const world = createWorld();
    world.setFeed(feedXml(ids(3)));
    await runJob(feed, world);
    world.setFeed(feedXml([{ id: 'AG-1' }, { id: 'AG-2', price: 1 }, { id: 'AG-2', price: 2 }, { id: 'AG-3' }]));

    const run = await runJob(feed, world);

    expect(run.status).toBe('partial');
    expect(run.counts.rejected).toBe(2);
    expect(run.issues.filter((i) => i.code === 'duplicate_external_id')).toHaveLength(2);
    expect(await Property.findOne({ 'feedSync.externalId': 'AG-2' })).toMatchObject({ status: 'active', price: 100000 });
    expect(await Property.countDocuments({ 'feedSync.feedId': feed._id })).toBe(3);
  });

  it('enforces the listing limit: publishes up to the allowance and reports the rest', async () => {
    const { feed, agent } = await createAgencySetup({ monthlyAllowance: 3 });
    const world = createWorld();
    world.setFeed(feedXml(ids(5)));

    const preview = await runJob(feed, world, 'preview');
    expect(preview.status).toBe('previewed');
    expect(preview.limit).toMatchObject({ wouldExceed: true, remaining: 3, newListings: 5 });
    expect(preview.limit.excess.map((e) => e.externalId)).toEqual(['AG-4', 'AG-5']);
    expect(await Property.countDocuments({ 'feedSync.feedId': feed._id })).toBe(0);

    const run = await runJob(feed, world);
    expect(run.status).toBe('partial');
    expect(run.counts).toMatchObject({ created: 3, skippedLimit: 2 });
    expect(await Property.countDocuments({ 'feedSync.feedId': feed._id })).toBe(3);
    expect((await User.findById(agent._id).lean())?.subscription?.listingsCreatedThisMonth).toBe(3);
  });

  it('free-tier agents get the free allowance only', async () => {
    const { feed } = await createAgencySetup({ freeTier: true });
    const world = createWorld();
    world.setFeed(feedXml(ids(5)));
    const run = await runJob(feed, world);
    expect(run.counts).toMatchObject({ created: 3, skippedLimit: 2 });
  });

  it('a partial image failure keeps the listing and its good photos, and is retried later', async () => {
    const { feed } = await createAgencySetup();
    const world = createWorld();
    world.setFeed(
      feedXml([
        { id: 'AG-1', images: ['https://agency.example/a.jpg', 'https://agency.example/broken.jpg', 'https://agency.example/tiny.jpg'] },
        { id: 'AG-2', images: ['https://agency.example/broken-only.jpg'] },
      ])
    );

    const run = await runJob(feed, world);

    expect(run.status).toBe('partial');
    expect(run.counts).toMatchObject({ created: 1, rejected: 1, imagesFailed: 3 });
    const listing = await Property.findOne({ 'feedSync.externalId': 'AG-1' });
    expect(listing?.images).toHaveLength(1);
    expect(listing?.feedSync?.failedImageUrls).toEqual(['https://agency.example/broken.jpg', 'https://agency.example/tiny.jpg']);
    expect(run.issues.map((i) => i.code)).toEqual(expect.arrayContaining(['image_failed', 'no_usable_images']));

    // Within the cool-down the failed URLs are not hammered again.
    const downloads = world.downloads.length;
    await runJob(feed, world);
    expect(world.downloads.filter((u) => u.includes('broken.jpg')).length).toBe(1);
    expect(world.downloads.length).toBeGreaterThanOrEqual(downloads);
  });

  it('resumes an interrupted run without duplicating listings or charges', async () => {
    const { feed, agent } = await createAgencySetup();
    const world = createWorld();
    world.setFeed(feedXml(ids(4)));
    const run = await runJob(feed, world);

    // Simulate a crash after the writes but before records were marked applied.
    await AgencyFeedRun.updateOne({ _id: run._id }, { $set: { status: 'applying' } });
    await AgencyFeedStagedRecord.updateMany({ runId: run._id }, { $unset: { appliedAt: '' } });
    const resumed = await executeRun(run._id as never, world.deps);

    expect(resumed.status).toBe('succeeded');
    expect(await Property.countDocuments({ 'feedSync.feedId': feed._id })).toBe(4);
    expect((await User.findById(agent._id).lean())?.subscription?.listingsCreatedThisMonth).toBe(4);
  });

  it('never runs two jobs for the same feed at once', async () => {
    const { feed } = await createAgencySetup();
    await enqueueFeedJob({ feed, kind: 'sync', trigger: 'manual' });
    await expect(enqueueFeedJob({ feed, kind: 'sync', trigger: 'manual' })).rejects.toBeInstanceOf(FeedBusyError);
    await expect(enqueueFeedJob({ feed, kind: 'preview', trigger: 'preview' })).rejects.toBeInstanceOf(FeedBusyError);
    expect(await AgencyFeedRun.countDocuments({ feedId: feed._id })).toBe(1);
  });

  it('the scheduler queues each due feed once and moves its next sync forward', async () => {
    const { feed } = await createAgencySetup();
    await AgencyFeed.updateOne({ _id: feed._id }, { $set: { nextSyncAt: new Date(Date.now() - 1000) } });
    expect(await scheduleDueFeeds()).toBe(1);
    expect(await scheduleDueFeeds()).toBe(0);
    const updated = await AgencyFeed.findById(feed._id);
    expect(updated!.nextSyncAt!.getTime()).toBeGreaterThan(Date.now() + 23 * 60 * 60 * 1000);
  });

  it('does not sync for an agency whose subscription lapsed', async () => {
    const { feed } = await createAgencySetup({ subscriptionStatus: 'expired' });
    const world = createWorld();
    world.setFeed(feedXml(ids(2)));
    const run = await runJob(feed, world);
    expect(run.status).toBe('failed');
    expect(run.error?.code).toBe('subscription_inactive');
    expect(await Property.countDocuments({ 'feedSync.feedId': feed._id })).toBe(0);
  });

  it('hides a private address and coarsens its coordinates', async () => {
    const { feed } = await createAgencySetup();
    const world = createWorld();
    world.setFeed(feedXml([{ id: 'AG-1', privateAddress: true }]));
    await runJob(feed, world);
    const listing = await Property.findOne({ 'feedSync.externalId': 'AG-1' }).lean();
    expect(listing?.address).toBe('Blloku, Tirana');
    expect(JSON.stringify(listing)).not.toContain('Rruga AG-1');
    expect(listing?.lat).toBe(41.32);
  });
});
