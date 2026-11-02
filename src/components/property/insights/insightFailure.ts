// Turns whatever a failed insight request threw into a small, typed value, so
// the UI can pick the right message and the right next step without parsing
// status codes itself. Pure: unit-tested without rendering.

export interface InsightUsage {
  used: number;
  limit: number;
  remaining: number;
}

export type InsightFailure =
  | { kind: 'unauthorized' }
  | { kind: 'invalid'; message?: string }
  | { kind: 'rateLimited'; message?: string; usage: InsightUsage }
  | { kind: 'unavailable' }
  | { kind: 'other'; message?: string };

interface ErrorLike {
  statusCode?: number;
  message?: string;
  details?: { used?: unknown; limit?: unknown; message?: unknown };
}

const asNumber = (value: unknown): number => (typeof value === 'number' && Number.isFinite(value) ? value : 0);

export function toInsightFailure(error: unknown): InsightFailure {
  const e: ErrorLike = typeof error === 'object' && error !== null ? (error as ErrorLike) : {};
  const message = typeof e.message === 'string' && e.message ? e.message : undefined;

  switch (e.statusCode) {
    case 401:
      return { kind: 'unauthorized' };
    case 400:
      return { kind: 'invalid', message };
    case 429:
      return {
        kind: 'rateLimited',
        message,
        usage: { used: asNumber(e.details?.used), limit: asNumber(e.details?.limit), remaining: 0 },
      };
    case 503:
      return { kind: 'unavailable' };
    default:
      return { kind: 'other', message };
  }
}
