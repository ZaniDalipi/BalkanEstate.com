import { useInfiniteQuery } from '@tanstack/react-query';
import { developmentKeys } from '../api/developmentKeys';
import { listDevelopmentAudit } from '../api/developmentsApi';
import type { AuditEntry } from '../types';

export const AUDIT_PAGE_SIZE = 25;

/**
 * Activity-tab filter chips → the action-family prefixes they cover. The
 * server filters on one prefix at a time, so a chip spanning several families
 * (Units = unit.* + availability.*) is merged client-side, see {@link fetchAuditPage}.
 */
export const AUDIT_FAMILIES = {
  all: [''],
  units: ['unit', 'availability'],
  prices: ['price'],
  explorer: ['scene'],
  listings: ['listing'],
  structure: ['building', 'floor'],
} as const satisfies Record<string, readonly string[]>;
export type AuditFamily = keyof typeof AUDIT_FAMILIES;

export interface AuditPage {
  entries: AuditEntry[];
  total: number;
  /** Per-source skip for the next page, or undefined at the end. */
  next?: number[];
}

const newestFirst = (a: AuditEntry, b: AuditEntry) =>
  a.createdAt === b.createdAt ? (a.id < b.id ? 1 : -1) : a.createdAt < b.createdAt ? 1 : -1;

/**
 * One page of up to `limit` entries across several action prefixes, newest
 * first. Each prefix keeps its own skip (`cursor[i]`): every source returns up
 * to `limit` rows from its cursor, the rows are merged, the newest `limit`
 * kept, and each cursor advances by how many of its rows were kept — so no
 * entry is skipped or repeated across pages.
 */
export async function fetchAuditPage(
  developmentId: string,
  prefixes: readonly string[],
  cursor: number[],
  limit = AUDIT_PAGE_SIZE
): Promise<AuditPage> {
  const pages = await Promise.all(
    prefixes.map((action, i) => listDevelopmentAudit(developmentId, { limit, skip: cursor[i] ?? 0, action: action || undefined }))
  );
  const tagged = pages.flatMap((p, src) => p.entries.map((entry) => ({ entry, src })));
  tagged.sort((a, b) => newestFirst(a.entry, b.entry));
  const kept = tagged.slice(0, limit);
  const next = prefixes.map((_, i) => (cursor[i] ?? 0) + kept.filter((k) => k.src === i).length);
  const hasMore = pages.some((p, i) => next[i] < p.total);
  return {
    entries: kept.map((k) => k.entry),
    total: pages.reduce((sum, p) => sum + p.total, 0),
    next: hasMore ? next : undefined,
  };
}

/** The development's audit trail for the Activity tab, paged with "Load more". */
export function useAuditLog(developmentId: string | undefined, family: AuditFamily = 'all', enabled = true) {
  const prefixes = AUDIT_FAMILIES[family];
  const query = useInfiniteQuery({
    queryKey: developmentKeys.audit(developmentId ?? '', family),
    queryFn: ({ pageParam }) => fetchAuditPage(developmentId as string, prefixes, pageParam),
    initialPageParam: prefixes.map(() => 0),
    getNextPageParam: (last: AuditPage) => last.next,
    enabled: !!developmentId && enabled,
  });
  const pages = query.data?.pages ?? [];
  return {
    entries: pages.flatMap((p) => p.entries),
    total: pages[0]?.total ?? 0,
    hasMore: !!query.hasNextPage,
    loadMore: query.fetchNextPage,
    isLoading: query.isLoading,
    isFetchingMore: query.isFetchingNextPage,
    error: query.error,
    refetch: query.refetch,
  };
}
