// Property Imports API — /agency-dashboard/:agencyId/feeds (manager-only).

import { apiRequest } from '@/src/shared/api';
import type { AgencyFeed, FeedFormValues, FeedMeta, FeedRun } from '../types/propertyImports';

const feedsPath = (agencyId: string) => `/agency-dashboard/${agencyId}/feeds`;

export const getFeedMeta = (agencyId: string) =>
  apiRequest<FeedMeta>(`${feedsPath(agencyId)}/meta`, { requiresAuth: true });

export const listFeeds = async (agencyId: string): Promise<AgencyFeed[]> =>
  (await apiRequest<{ feeds: AgencyFeed[] }>(feedsPath(agencyId), { requiresAuth: true })).feeds;

/** Only changed fields are sent: an unchanged (redacted) URL or blank secret must not overwrite the stored one. */
export type FeedPayload = Partial<Omit<FeedFormValues, 'credentials'>> & {
  credentials?: FeedFormValues['credentials'];
};

export const createFeed = async (agencyId: string, payload: FeedPayload): Promise<AgencyFeed> =>
  (await apiRequest<{ feed: AgencyFeed }>(feedsPath(agencyId), { method: 'POST', body: payload, requiresAuth: true })).feed;

export const updateFeed = async (agencyId: string, feedId: string, payload: FeedPayload): Promise<AgencyFeed> =>
  (await apiRequest<{ feed: AgencyFeed }>(`${feedsPath(agencyId)}/${feedId}`, { method: 'PATCH', body: payload, requiresAuth: true })).feed;

export const deleteFeed = (agencyId: string, feedId: string) =>
  apiRequest<{ listingsKept: number }>(`${feedsPath(agencyId)}/${feedId}`, { method: 'DELETE', requiresAuth: true });

export const requestPreview = (agencyId: string, feedId: string) =>
  apiRequest<{ runId: string }>(`${feedsPath(agencyId)}/${feedId}/preview`, { method: 'POST', requiresAuth: true });

export const requestSync = (agencyId: string, feedId: string) =>
  apiRequest<{ runId: string }>(`${feedsPath(agencyId)}/${feedId}/sync`, { method: 'POST', requiresAuth: true });

export const activateFeed = (agencyId: string, feedId: string, body: { confirmAuthorized: boolean; acceptListingLimit: boolean }) =>
  apiRequest<{ feed: AgencyFeed; runId: string }>(`${feedsPath(agencyId)}/${feedId}/activate`, { method: 'POST', body, requiresAuth: true });

export const pauseFeed = (agencyId: string, feedId: string) =>
  apiRequest<{ feed: AgencyFeed }>(`${feedsPath(agencyId)}/${feedId}/pause`, { method: 'POST', requiresAuth: true });

export const resumeFeed = (agencyId: string, feedId: string) =>
  apiRequest<{ feed: AgencyFeed }>(`${feedsPath(agencyId)}/${feedId}/resume`, { method: 'POST', requiresAuth: true });

export const listFeedRuns = async (agencyId: string, feedId: string): Promise<FeedRun[]> =>
  (await apiRequest<{ runs: FeedRun[] }>(`${feedsPath(agencyId)}/${feedId}/runs?limit=20`, { requiresAuth: true })).runs;

export const getFeedRun = async (agencyId: string, feedId: string, runId: string): Promise<FeedRun> =>
  (await apiRequest<{ run: FeedRun }>(`${feedsPath(agencyId)}/${feedId}/runs/${runId}`, { requiresAuth: true })).run;

export const reviewDeactivations = (agencyId: string, feedId: string, runId: string, decision: 'approve' | 'dismiss') =>
  apiRequest<{ queued: boolean }>(`${feedsPath(agencyId)}/${feedId}/runs/${runId}/deactivations`, {
    method: 'POST',
    body: { decision },
    requiresAuth: true,
  });
