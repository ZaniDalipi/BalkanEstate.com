/**
 * Recent searches.
 *
 * Google shows what you searched for last time the moment the box is focused
 * and before a single key is pressed, because repeating a search is the most
 * common thing anyone does with a search box. Property hunting is the
 * extreme case of that — the same three neighbourhoods, every evening, for
 * weeks.
 *
 * Kept in `localStorage` rather than on the account on purpose: it is a
 * convenience, it is per-device, and it must survive a logged-out visit. It
 * is also never allowed to break the search box — a browser with storage
 * disabled reads as "no history" rather than as an error.
 */

const STORAGE_KEY = 'balkanestate:recent-searches';
const MAX_ENTRIES = 8;

export interface RecentSearch {
  /** What was typed, or the label of the place that was picked. */
  text: string;
  /** Epoch ms, for ordering. */
  at: number;
}

const read = (): RecentSearch[] => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((entry): entry is RecentSearch =>
        typeof entry === 'object' &&
        entry !== null &&
        typeof (entry as RecentSearch).text === 'string' &&
        (entry as RecentSearch).text.trim().length > 0
      )
      .map((entry) => ({ text: entry.text, at: Number(entry.at) || 0 }))
      .slice(0, MAX_ENTRIES);
  } catch {
    return [];
  }
};

const write = (entries: RecentSearch[]): void => {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, MAX_ENTRIES)));
  } catch {
    // Private mode, or storage full. History is a nicety; losing it is fine.
  }
};

export const getRecentSearches = (): RecentSearch[] => read();

/**
 * Record a search, newest first, with any earlier spelling of the same search
 * removed so the list never shows one place twice.
 */
export const rememberSearch = (text: string): RecentSearch[] => {
  const trimmed = text.trim();
  if (!trimmed) return read();

  const key = trimmed.toLowerCase();
  const entries = [
    { text: trimmed, at: Date.now() },
    ...read().filter((entry) => entry.text.trim().toLowerCase() !== key),
  ].slice(0, MAX_ENTRIES);

  write(entries);
  return entries;
};

export const forgetSearch = (text: string): RecentSearch[] => {
  const key = text.trim().toLowerCase();
  const entries = read().filter((entry) => entry.text.trim().toLowerCase() !== key);
  write(entries);
  return entries;
};

export const clearRecentSearches = (): void => write([]);
