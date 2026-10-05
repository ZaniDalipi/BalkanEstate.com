// Property Imports (agency XML feeds) — API contracts.
// Mirrors backend/src/services/agencyFeeds/feedManagementService.ts (toFeedDto / toRunDto).

export type FeedState = 'draft' | 'active' | 'paused';
export type FeedFormat = 'canonical' | 'custom';
export type FeedMode = 'snapshot' | 'delta';
/** `url`: fetched and synced daily. `upload`: imports each XML file the agency uploads. */
export type FeedSourceType = 'url' | 'upload';
export type CredentialType = 'none' | 'basic' | 'header';

export type FeedRunStatus =
  | 'queued'
  | 'fetching'
  | 'staged'
  | 'applying'
  | 'previewed'
  | 'succeeded'
  | 'partial'
  | 'awaiting_review'
  | 'failed';

export interface FeedMappingConfig {
  recordElement: string;
  fields: Record<string, string>;
  valueMaps?: Partial<Record<'listingType' | 'propertyType' | 'status' | 'rentPeriod' | 'addressVisibility', Record<string, string>>>;
  defaults?: { country?: string; currency?: string };
  areaUnit?: 'm2' | 'sqft';
  feed?: { totalCount?: string; nextPage?: string };
}

export interface FeedCredentialsView {
  type: CredentialType;
  username?: string;
  headerName?: string;
  hasSecret: boolean;
}

export interface FeedSafeguards {
  maxRemovalRatio: number;
  minRemovalsForReview: number;
}

export interface AgencyFeed {
  id: string;
  name: string;
  sourceType: FeedSourceType;
  /** Redacted; null for upload feeds. */
  url: string | null;
  format: FeedFormat;
  mapping: FeedMappingConfig | null;
  mode: FeedMode;
  state: FeedState;
  assignedAgentId: string;
  credentials: FeedCredentialsView;
  safeguards: FeedSafeguards;
  authorization: { confirmedAt: string; confirmedBy: string } | null;
  configVersion: number;
  lastPreviewRunId: string | null;
  lastRunId: string | null;
  lastRunAt: string | null;
  lastSuccessfulSyncAt: string | null;
  nextSyncAt: string | null;
  consecutiveFailures: number;
  lastError: { code: string; message: string; at: string } | null;
  activatedAt: string | null;
  activeJob: boolean;
  pendingReviewRunId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FeedRunCounts {
  received: number;
  valid: number;
  created: number;
  updated: number;
  unchanged: number;
  rejected: number;
  deactivated: number;
  reactivated: number;
  skippedLimit: number;
  localEditsKept: number;
  imagesDownloaded: number;
  imagesReused: number;
  imagesFailed: number;
}

export interface FeedIssue {
  severity: 'error' | 'warning';
  code: string;
  message: string;
  externalId?: string;
  field?: string;
}

export interface FeedSampleListing {
  externalId: string;
  title: string;
  listingType: 'sale' | 'rent';
  propertyType: string;
  price: number;
  city: string;
  country: string;
  address: string;
  addressPrivate: boolean;
  sqft?: number;
  beds?: number;
  baths?: number;
  imageUrls: string[];
}

export interface FeedRun {
  id: string;
  trigger: 'preview' | 'manual' | 'scheduled';
  dryRun: boolean;
  status: FeedRunStatus;
  sourceFile?: { filename: string; bytes: number };
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
  counts: FeedRunCounts;
  snapshot: { mode: FeedMode; complete: boolean; incompleteReason?: string; declaredTotal?: number; pages: number; bytes: number };
  error: { code: string; message: string } | null;
  deactivation: {
    candidates: number;
    allowed: boolean;
    held: boolean;
    blockedReason: string | null;
    resolution: 'approved' | 'dismissed' | 'expired' | null;
    pendingExternalIds?: string[];
  };
  limit: {
    checked: boolean;
    remaining?: number;
    allowance?: number;
    plan?: string;
    newListings: number;
    wouldExceed: boolean;
    excess: Array<{ externalId: string; title: string }>;
  };
  issueCount: number;
  issues?: FeedIssue[];
  issuesTruncated?: boolean;
  samples?: FeedSampleListing[];
  /** Present when no listings matched the mapping: what the file contains instead. */
  detected?: DetectedStructure | null;
}

export interface DetectedStructure {
  recordElement: string;
  sampleCount: number;
  paths: string[];
  suggestedMapping: FeedMappingConfig;
  unmatched: string[];
}

export interface FeedMeta {
  canonical: { version: string; mapping: FeedMappingConfig };
  fields: string[];
  propertyTypes: string[];
  sourceManagedFields: string[];
  lockableFields: string[];
  localOnly: string[];
  authorizationStatement: string;
  supportedCurrencies: string[];
}

export interface FeedFormValues {
  name: string;
  sourceType: FeedSourceType;
  url: string;
  format: FeedFormat;
  mode: FeedMode;
  assignedAgentId: string;
  credentials: { type: CredentialType; username?: string; headerName?: string; secret?: string };
  mapping: FeedMappingConfig | null;
  safeguards: FeedSafeguards;
}

export const ACTIVE_RUN_STATUSES: readonly FeedRunStatus[] = ['queued', 'fetching', 'staged', 'applying'];
