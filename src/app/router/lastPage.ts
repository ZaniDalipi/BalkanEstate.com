/**
 * The last page the user had open in this tab, so a page with nowhere obvious
 * to go (a signed-in user who typed `/login`) can send them back to it.
 *
 * Kept in sessionStorage: per tab, survives a typed URL or reload, gone when
 * the tab closes. Only same-site, non-sign-in pages are kept (`safeReturnPath`),
 * on write and again on read.
 */

import { safeReturnPath } from '@/src/shared/auth/authReturn';

const LAST_PAGE_KEY = 'be:lastPage';

/** Remember `path` as the last page; sign-in pages and odd values are ignored. */
export function rememberLastPage(path: string): void {
  const safe = safeReturnPath(path);
  if (!safe) return;
  try {
    sessionStorage.setItem(LAST_PAGE_KEY, safe);
  } catch {
    // Private mode or storage off: the user just lands on the default page.
  }
}

/** The last page the user had open, or null when there is none worth returning to. */
export function readLastPage(): string | null {
  try {
    return safeReturnPath(sessionStorage.getItem(LAST_PAGE_KEY));
  } catch {
    return null;
  }
}
