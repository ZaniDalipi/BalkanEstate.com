/**
 * Read side of the development audit trail, for the dashboard Activity tab.
 * Entries are returned newest first with the actor's display name and every
 * id encoded; metadata is passed through as recorded (it never holds secrets:
 * writers store field diffs and counts only).
 */
import mongoose from 'mongoose';
import DevelopmentAuditLog from '../../models/DevelopmentAuditLog';
import User from '../../models/User';
import { encodeId } from '../../utils/idObfuscation';
import { ValidationError } from './developmentService';

export interface AuditEntryJSON {
  id: string;
  action: string;
  actorId: string | null;
  actorName: string | null;
  targetType: string | null;
  targetId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

const ACTION_PATTERN = /^[a-z_]+(\.[a-z_]+)*$/;

export const listAuditEntries = async (
  developmentId: mongoose.Types.ObjectId,
  q: { limit?: unknown; skip?: unknown; action?: unknown }
): Promise<{ entries: AuditEntryJSON[]; total: number }> => {
  const rawLimit = Number(q.limit);
  const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(Math.floor(rawLimit), 100) : 25;
  const rawSkip = Number(q.skip);
  const skip = Number.isFinite(rawSkip) && rawSkip > 0 ? Math.floor(rawSkip) : 0;

  const match: Record<string, unknown> = { developmentId };
  if (q.action !== undefined && q.action !== '') {
    if (typeof q.action !== 'string' || q.action.length > 60 || !ACTION_PATTERN.test(q.action)) {
      throw new ValidationError('Invalid action filter', { code: 'FIELD_INVALID', field: 'action' });
    }
    // A prefix ("unit") matches its whole family ("unit.update", "unit.delete"…).
    match.action = q.action.includes('.') ? q.action : { $regex: `^${q.action}\\.` };
  }

  const [rows, total] = await Promise.all([
    DevelopmentAuditLog.find(match).sort({ createdAt: -1, _id: -1 }).skip(skip).limit(limit).lean(),
    DevelopmentAuditLog.countDocuments(match),
  ]);

  const actorIds = [...new Set(rows.map((r) => (r.actorId ? String(r.actorId) : '')).filter(Boolean))];
  const actors = actorIds.length
    ? await User.find({ _id: { $in: actorIds } }).select('name').lean<Array<{ _id: unknown; name?: string }>>()
    : [];
  const nameOf = new Map(actors.map((a) => [String(a._id), a.name ?? null]));

  return {
    total,
    entries: rows.map((r) => ({
      id: encodeId(String(r._id)),
      action: r.action,
      actorId: r.actorId ? encodeId(String(r.actorId)) : null,
      actorName: r.actorId ? nameOf.get(String(r.actorId)) ?? null : null,
      targetType: r.targetType ?? null,
      targetId: r.targetId ? encodeId(String(r.targetId)) : null,
      metadata: (r.metadata as Record<string, unknown>) ?? {},
      createdAt: new Date(r.createdAt).toISOString(),
    })),
  };
};
