import type { Types } from 'mongoose';
import AgencyFeedAuditLog, { type AgencyFeedAuditAction } from '../../models/AgencyFeedAuditLog';
import { createLogger } from '../../utils/logger';

export const feedLogger = createLogger('AgencyFeed');

interface AuditInput {
  agencyId: Types.ObjectId | string;
  feedId: Types.ObjectId | string;
  action: AgencyFeedAuditAction;
  actorId?: Types.ObjectId | string;
  runId?: Types.ObjectId | string;
  /** Must already be redacted: never pass credentials or full feed URLs with tokens. */
  details?: Record<string, unknown>;
}

/**
 * Record an audit entry and emit a structured log line. Audit failures are
 * logged, never thrown: an audit write must not abort the action it records.
 */
export const auditFeedAction = async (input: AuditInput): Promise<void> => {
  feedLogger.info('audit', {
    action: input.action,
    agencyId: String(input.agencyId),
    feedId: String(input.feedId),
    actorId: input.actorId ? String(input.actorId) : 'system',
    runId: input.runId ? String(input.runId) : undefined,
    ...(input.details ?? {}),
  });
  try {
    await AgencyFeedAuditLog.create({
      agencyId: input.agencyId,
      feedId: input.feedId,
      action: input.action,
      actorId: input.actorId,
      runId: input.runId,
      details: input.details ?? {},
    });
  } catch (err) {
    feedLogger.error('audit write failed', { action: input.action, error: (err as Error).message });
  }
};
