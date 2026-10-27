/**
 * The one way to write a development audit entry.
 *
 * Inside a transaction (a `session` is passed) a failed write throws, so the
 * whole operation rolls back and the trail can never miss a committed change.
 * Outside one, the mutation has already committed — a failed audit write is
 * logged rather than turned into a 500 that would tell the client a saved
 * change failed.
 */
import mongoose, { type ClientSession } from 'mongoose';
import DevelopmentAuditLog, { type DevelopmentAuditAction } from '../../models/DevelopmentAuditLog';
import { createLogger } from '../../utils/logger';

const log = createLogger('DevelopmentAudit');

export interface AuditEntry {
  developmentId: mongoose.Types.ObjectId | string;
  action: DevelopmentAuditAction;
  actorId?: mongoose.Types.ObjectId | string;
  targetType?: string;
  targetId?: mongoose.Types.ObjectId | string;
  metadata?: Record<string, unknown>;
}

export const recordDevelopmentAudit = async (entry: AuditEntry, session?: ClientSession): Promise<void> => {
  if (session) {
    await DevelopmentAuditLog.create([entry], { session });
    return;
  }
  try {
    await DevelopmentAuditLog.create(entry);
  } catch (error) {
    log.error(`Audit write failed for ${entry.action} on development ${String(entry.developmentId)}:`, error);
  }
};

const same = (a: unknown, b: unknown): boolean => {
  if (a === b) return true;
  if (a == null || b == null) return a == b; // null and undefined both mean "unset"
  return JSON.stringify(a) === JSON.stringify(b);
};

/**
 * The fields that actually changed, as { field: { from, to } } — what an update
 * audit records so the trail shows a before/after, not just "updated".
 */
export const diffFields = (
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  fields: readonly string[]
): Record<string, { from: unknown; to: unknown }> => {
  const changes: Record<string, { from: unknown; to: unknown }> = {};
  for (const f of fields) {
    if (!same(before[f], after[f])) changes[f] = { from: before[f] ?? null, to: after[f] ?? null };
  }
  return changes;
};
