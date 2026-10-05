/**
 * Fixtures for agency-feed integration tests: an agency with an agent, a feed,
 * a fake web server for the feed URL, fake image download/storage and a
 * controllable clock. Everything else (parsing, planning, writes, the job
 * queue) runs for real against the in-memory MongoDB.
 */
import { Readable } from 'stream';
import sharp from 'sharp';
import mongoose from 'mongoose';
import Agency from '../../models/Agency';
import User from '../../models/User';
import AgencyFeed, { type IAgencyFeed } from '../../models/AgencyFeed';
import AgencyFeedRun, { type IAgencyFeedRun } from '../../models/AgencyFeedRun';
import { fetchFeed, type HttpTransport } from '../../services/agencyFeeds/feedFetcher';
import { ImageImportError, type ImageStore } from '../../services/agencyFeeds/imageImporter';
import type { SyncDeps } from '../../services/agencyFeeds/syncService';
import { claimNextJob, enqueueFeedJob, processJob } from '../../services/agencyFeeds/feedJobQueue';

export interface TestListing {
  id: string;
  title?: string;
  price?: number;
  status?: string;
  city?: string;
  images?: string[];
  privateAddress?: boolean;
  omit?: string[];
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

export const listingXml = (l: TestListing): string => {
  const omit = new Set(l.omit ?? []);
  const images = l.images ?? [`https://agency.example/img/${l.id}-1.jpg`, `https://agency.example/img/${l.id}-2.jpg`];
  const parts = [
    `<id>${esc(l.id)}</id>`,
    l.status ? `<status>${l.status}</status>` : '',
    omit.has('title') ? '' : `<title>${esc(l.title ?? `Apartment ${l.id}`)}</title>`,
    '<description><![CDATA[<p>Nice <b>flat</b></p>]]></description>',
    '<transaction>sale</transaction>',
    '<type>apartment</type>',
    `<price currency="EUR">${l.price ?? 100000}</price>`,
    `<location visibility="${l.privateAddress ? 'private' : 'exact'}"><country>Albania</country><city>${l.city ?? 'Tirana'}</city>` +
      `<district>Blloku</district><address>Rruga ${esc(l.id)}</address>` +
      (omit.has('coords') ? '' : '<latitude>41.3200</latitude><longitude>19.8200</longitude>') +
      '</location>',
    '<area>70</area><bedrooms>2</bedrooms><bathrooms>1</bathrooms>',
    `<images>${images.map((u) => `<image url="${esc(u)}"/>`).join('')}</images>`,
  ];
  return `<listing>${parts.join('')}</listing>`;
};

export const feedXml = (listings: TestListing[], attrs = ''): string =>
  `<?xml version="1.0" encoding="UTF-8"?><balkanestate-feed version="1.0" ${attrs}>${listings.map(listingXml).join('')}</balkanestate-feed>`;

export const FEED_URL = 'https://agency.example/feed.xml';

export interface FakeWorld {
  deps: SyncDeps;
  setFeed: (xml: string) => void;
  failWith: (status: number | null) => void;
  downloads: string[];
  stored: string[];
  removed: string[];
  advance: (ms?: number) => void;
}

let pngCache: Buffer | null = null;
const png = async (): Promise<Buffer> => {
  pngCache ??= await sharp({ create: { width: 400, height: 300, channels: 3, background: { r: 120, g: 160, b: 200 } } }).png().toBuffer();
  return pngCache;
};

export const createWorld = (): FakeWorld => {
  let xml = feedXml([]);
  let failure: number | null = null;
  let clock = Date.UTC(2026, 9, 1, 3, 0, 0);
  const downloads: string[] = [];
  const stored: string[] = [];
  const removed: string[] = [];

  const transport: HttpTransport = async () =>
    failure !== null
      ? { status: failure, headers: {}, body: Readable.from([]) }
      : { status: 200, headers: { 'content-type': 'application/xml' }, body: Readable.from([Buffer.from(xml)]) };

  const store: ImageStore = {
    mode: 'rehost',
    async save(_buf, sourceUrl) {
      stored.push(sourceUrl);
      return { url: `https://res.cloudinary.com/test/image/upload/feed/${stored.length}.jpg`, publicId: `feed/${stored.length}` };
    },
    async remove(publicId) {
      removed.push(publicId);
    },
  };

  const deps: SyncDeps = {
    fetchDocument: (url, options) => fetchFeed(url, { ...options, transport, resolver: async () => [{ address: '93.184.216.34', family: 4 }] }),
    geocode: async ({ city }) => (city === 'Nowhere' ? null : { lat: 41.33, lng: 19.82 }),
    imageStore: store,
    download: async (url) => {
      downloads.push(url);
      if (url.includes('broken')) throw new ImageImportError('HTTP 404');
      if (url.includes('tiny')) return sharp({ create: { width: 20, height: 20, channels: 3, background: '#fff' } }).png().toBuffer();
      return png();
    },
    now: () => new Date(clock),
  };

  return {
    deps,
    setFeed: (next) => {
      xml = next;
    },
    failWith: (status) => {
      failure = status;
    },
    downloads,
    stored,
    removed,
    advance: (ms = 24 * 60 * 60 * 1000) => {
      clock += ms;
    },
  };
};

export interface AgencySetup {
  owner: mongoose.Document & { _id: mongoose.Types.ObjectId };
  agent: mongoose.Document & { _id: mongoose.Types.ObjectId };
  outsider: mongoose.Document & { _id: mongoose.Types.ObjectId };
  agency: mongoose.Document & { _id: mongoose.Types.ObjectId };
  feed: IAgencyFeed;
}

let seq = 0;

export const createAgencySetup = async (
  options: { monthlyAllowance?: number; freeTier?: boolean; mode?: 'snapshot' | 'delta'; subscriptionStatus?: string } = {}
): Promise<AgencySetup> => {
  seq++;
  const base = { password: 'S3cur€Pass!x9Kw', isEmailVerified: true, phone: '+38267000000' };
  const owner = await User.create({ ...base, name: `Owner ${seq}`, email: `owner${seq}@agency.test`, role: 'agent' });
  const agent = await User.create({
    ...base,
    name: `Agent ${seq}`,
    email: `agent${seq}@agency.test`,
    role: 'agent',
    ...(options.freeTier
      ? { subscription: { tier: 'free', status: 'active', listingsLimit: 3, activeListingsCount: 0 } }
      : {
          subscriptionPlan: 'agency_agent_monthly',
          subscription: {
            tier: 'agency_agent',
            status: 'active',
            listingsLimit: options.monthlyAllowance ?? 30,
            listingsCreatedThisMonth: 0,
            monthResetDate: new Date(),
          },
        }),
  });
  const outsider = await User.create({ ...base, name: `Outsider ${seq}`, email: `outsider${seq}@other.test`, role: 'agent' });
  const agency = await Agency.create({
    name: `Adriatic Homes ${seq}`,
    slug: `adriatic-homes-${seq}`,
    email: `office${seq}@agency.test`,
    phone: '+38267000001',
    city: 'Tirana',
    country: 'Albania',
    ownerId: owner._id,
    agents: [owner._id, agent._id],
    admins: [],
    subscription: {
      status: options.subscriptionStatus ?? 'active',
      startDate: new Date(),
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      amount: 1000,
      currency: 'EUR',
      autoRenew: true,
    },
  });
  const feed = await AgencyFeed.create({
    agencyId: agency._id,
    name: 'Website feed',
    url: FEED_URL,
    format: 'canonical',
    mode: options.mode ?? 'snapshot',
    state: 'active',
    assignedAgentId: agent._id,
    credentials: { type: 'none' },
    safeguards: { maxRemovalRatio: 0.3, minRemovalsForReview: 2 },
    createdBy: owner._id,
    updatedBy: owner._id,
  });
  return {
    owner: owner as AgencySetup['owner'],
    agent: agent as AgencySetup['agent'],
    outsider: outsider as AgencySetup['outsider'],
    agency: agency as unknown as AgencySetup['agency'],
    feed,
  };
};

/** Queue and run one job end-to-end through the real queue. */
export const runJob = async (
  feed: IAgencyFeed,
  world: FakeWorld,
  kind: 'sync' | 'preview' = 'sync'
): Promise<IAgencyFeedRun> => {
  world.advance(60 * 60 * 1000);
  const fresh = (await AgencyFeed.findById(feed._id)) as IAgencyFeed;
  const { runId } = await enqueueFeedJob({ feed: fresh, kind, trigger: kind === 'preview' ? 'preview' : 'manual' });
  const job = await claimNextJob('test-worker', new Date(Date.now() + 1000));
  if (!job) throw new Error('no job claimed');
  await processJob(job, 'test-worker', world.deps);
  return (await AgencyFeedRun.findById(runId)) as IAgencyFeedRun;
};
