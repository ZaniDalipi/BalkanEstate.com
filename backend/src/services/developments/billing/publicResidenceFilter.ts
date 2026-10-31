/**
 * The one rule for "a buyer may see this residence": published, not deleted,
 * and still inside its trial, pass or plan. Every public query spreads this in.
 */
export const publicResidenceFilter = (now: Date = new Date()) => ({
  status: 'published' as const,
  deletedAt: { $exists: false },
  visibleUntil: { $gt: now },
});

/** The same rule for a residence already loaded. */
export const isPubliclyVisible = (
  dev: { status?: string; deletedAt?: Date | null; visibleUntil?: Date | null } | null | undefined,
  now: Date = new Date()
): boolean => !!dev && dev.status === 'published' && !dev.deletedAt && !!dev.visibleUntil && dev.visibleUntil > now;
