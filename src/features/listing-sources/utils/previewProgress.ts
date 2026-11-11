/** Where a feed fetch is, for the progress shown while it runs. */
export type PreviewProgress =
  | { phase: 'starting' }
  | { phase: 'finding'; found: number }
  | { phase: 'reading'; found: number; read: number; percent: number };

/**
 * Counts from the server → what to show: nothing found yet; N listings found
 * on the catalogue pages so far; or X of N listing pages read.
 */
export const previewProgress = (counts: { found?: number; detailsFetched?: number } | undefined): PreviewProgress => {
  const found = Math.max(0, counts?.found ?? 0);
  const read = Math.min(found, Math.max(0, counts?.detailsFetched ?? 0));
  if (found === 0) return { phase: 'starting' };
  if (read === 0) return { phase: 'finding', found };
  return { phase: 'reading', found, read, percent: Math.round((read / found) * 100) };
};
