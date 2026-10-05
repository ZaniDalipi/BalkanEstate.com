import type { NormalizedListing } from './feedTypes';
import type { StagedAction } from '../../models/AgencyFeedStagedRecord';

/**
 * Pure decision logic for a sync: what happens to every record, and whether
 * missing listings may be deactivated. No I/O, so every safety rule here is
 * unit-tested directly.
 *
 * Deactivation rules (the part that can destroy inventory, so the strictest):
 *  - Only a `snapshot` feed can imply removal by absence. In `delta` mode only
 *    an explicit `removed` status deactivates anything.
 *  - The snapshot must be complete: every page read, the declared total
 *    matched, and at least one record received. A failed request or invalid
 *    XML never reaches the planner at all (the run fails before staging).
 *  - A listing is "present" if its ID appears anywhere in the document, even
 *    in a record that failed validation or was duplicated: a broken record is
 *    not a removal.
 *  - If the removals are suspicious — more than `maxRemovalRatio` of the
 *    feed's live listings (and more than `minRemovalsForReview`), or the feed
 *    shrank by more than that ratio since the last complete snapshot — they
 *    are held for the agency to review instead of applied.
 */

export interface StagedInput {
  ordinal: number;
  externalId?: string;
  valid: boolean;
  listing?: NormalizedListing;
  hash?: string;
}

export interface ExistingFeedListing {
  externalId: string;
  sourceHash: string;
  deactivated: boolean;
  statusLocked: boolean;
  hasFailedImages: boolean;
}

export interface PlanInput {
  records: StagedInput[];
  existing: ExistingFeedListing[];
  mode: 'snapshot' | 'delta';
  complete: boolean;
  incompleteReason?: string;
  previousSnapshotCount?: number;
  safeguards: { maxRemovalRatio: number; minRemovalsForReview: number };
  remainingCreates: number;
}

export interface PlannedDeactivation {
  candidates: string[];
  allowed: boolean;
  blockedReason?: string;
  held: boolean;
  heldReason?: string;
}

export interface SyncPlan {
  actions: Map<number, StagedAction>;
  newListings: number;
  excess: Array<{ externalId: string; title: string }>;
  deactivation: PlannedDeactivation;
}

export const planSync = (input: PlanInput): SyncPlan => {
  const existingById = new Map(input.existing.map((e) => [e.externalId, e]));
  const actions = new Map<number, StagedAction>();
  const excess: SyncPlan['excess'] = [];
  const presentIds = new Set<string>();
  let newListings = 0;
  let remaining = input.remainingCreates;

  for (const record of [...input.records].sort((a, b) => a.ordinal - b.ordinal)) {
    if (record.externalId) presentIds.add(record.externalId);
    if (!record.valid || !record.listing) {
      actions.set(record.ordinal, 'reject');
      continue;
    }
    const existing = existingById.get(record.listing.externalId);

    if (record.listing.feedStatus === 'removed') {
      actions.set(record.ordinal, existing && !existing.deactivated && !existing.statusLocked ? 'remove' : 'unchanged');
      continue;
    }
    if (!existing) {
      newListings++;
      if (remaining > 0) {
        remaining--;
        actions.set(record.ordinal, 'create');
      } else {
        actions.set(record.ordinal, 'skip_limit');
        excess.push({ externalId: record.listing.externalId, title: record.listing.title });
      }
      continue;
    }
    const unchanged = existing.sourceHash === record.hash && !existing.deactivated && !existing.hasFailedImages;
    actions.set(record.ordinal, unchanged ? 'unchanged' : 'update');
  }

  const deactivation: PlannedDeactivation = { candidates: [], allowed: false, held: false };
  if (input.mode !== 'snapshot') {
    deactivation.blockedReason = 'Delta feeds only deactivate listings explicitly marked as removed';
    return { actions, newListings, excess, deactivation };
  }

  const live = input.existing.filter((e) => !e.deactivated);
  deactivation.candidates = live
    .filter((e) => !presentIds.has(e.externalId) && !e.statusLocked)
    .map((e) => e.externalId);

  if (input.records.length === 0) {
    deactivation.blockedReason = 'The feed contained no listings, so nothing was deactivated';
  } else if (!input.complete) {
    deactivation.blockedReason = `The feed was incomplete (${input.incompleteReason ?? 'unknown reason'}), so nothing was deactivated`;
  } else {
    deactivation.allowed = true;
  }

  if (deactivation.allowed && deactivation.candidates.length > 0) {
    const { maxRemovalRatio, minRemovalsForReview } = input.safeguards;
    const removalRatio = live.length > 0 ? deactivation.candidates.length / live.length : 0;
    const previous = input.previousSnapshotCount ?? 0;
    const shrinkRatio = previous > 0 ? (previous - input.records.length) / previous : 0;
    if (deactivation.candidates.length > minRemovalsForReview && removalRatio > maxRemovalRatio) {
      deactivation.held = true;
      deactivation.heldReason = `${deactivation.candidates.length} of ${live.length} imported listings are missing from the feed`;
    } else if (deactivation.candidates.length > minRemovalsForReview && shrinkRatio > maxRemovalRatio) {
      deactivation.held = true;
      deactivation.heldReason = `The feed shrank from ${previous} to ${input.records.length} listings since the last import`;
    }
  }

  return { actions, newListings, excess, deactivation };
};

/** Find IDs that occur more than once in a document. */
export const findDuplicateIds = (ids: Array<string | undefined>): Set<string> => {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const id of ids) {
    if (!id) continue;
    if (seen.has(id)) duplicates.add(id);
    seen.add(id);
  }
  return duplicates;
};
