/**
 * Where to return after signing in, and what the user was about to do.
 *
 * Signing in normally ends on the search page. A page that asks the user to
 * sign in for something (Follow on a residence) remembers itself here, and
 * sign-in comes back to it instead — also after Google/Apple, which leave the
 * site and return on /auth/callback. An "intent" (e.g. "follow this residence") lets the page
 * finish the action the user asked for once they are back and signed in.
 * Both expire after 30 minutes and only same-site paths are accepted.
 */

const RETURN_KEY = 'be:authReturn';
const INTENT_KEY = 'be:authIntent';
export const AUTH_RETURN_TTL_MS = 30 * 60 * 1000;

/** Auth pages are never a place to return to. */
const AUTH_PATH = /^\/(?:[a-z]{2}\/)?(?:login|register|auth\/callback|reset-password|verify-email)(?:[/?#]|$)/;

/** A same-site path worth returning to, or null. */
export function safeReturnPath(raw: unknown): string | null {
  if (typeof raw !== 'string' || raw.length > 2048) return null;
  if (!/^\/(?![/\\])/.test(raw) || /[\u0000-\u001f]/.test(raw)) return null;
  if (AUTH_PATH.test(raw)) return null;
  return raw;
}

export interface AuthIntent {
  kind: 'follow-residence';
  /** What the intent is about (the residence slug). */
  key: string;
}

interface Stored<T> {
  value: T;
  at: number;
}

/** A stored value if it is fresh, else null. */
export function readFresh<T>(raw: string | null, now: number, ttl = AUTH_RETURN_TTL_MS): T | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Stored<T>;
    if (typeof parsed?.at !== 'number' || now - parsed.at > ttl || now < parsed.at) return null;
    return parsed.value ?? null;
  } catch {
    return null;
  }
}

const store = (key: string, value: unknown) => {
  try {
    sessionStorage.setItem(key, JSON.stringify({ value, at: Date.now() }));
  } catch {
    // Private mode or storage off: sign-in still works, it just lands on the default page.
  }
};
const take = <T>(key: string): T | null => {
  try {
    const value = readFresh<T>(sessionStorage.getItem(key), Date.now());
    sessionStorage.removeItem(key);
    return value;
  } catch {
    return null;
  }
};

/** Remember the current page (or `path`) to come back to once signed in. */
export function rememberReturnPath(path = `${window.location.pathname}${window.location.search}`): void {
  const safe = safeReturnPath(path);
  if (safe) store(RETURN_KEY, safe);
}

/** The page to go back to after signing in (read once). */
export function takeReturnPath(): string | null {
  return safeReturnPath(take<string>(RETURN_KEY));
}

export function forgetReturnPath(): void {
  try {
    sessionStorage.removeItem(RETURN_KEY);
  } catch {
    // nothing to clear
  }
}

export function rememberIntent(intent: AuthIntent): void {
  store(INTENT_KEY, intent);
}

/** Whether the pending intent is this one; if so it is used up. A different intent is left in place. */
export function takeIntent(kind: AuthIntent['kind'], key: string): boolean {
  try {
    const intent = readFresh<AuthIntent>(sessionStorage.getItem(INTENT_KEY), Date.now());
    if (!intent || intent.kind !== kind || intent.key !== key) return false;
    sessionStorage.removeItem(INTENT_KEY);
    return true;
  } catch {
    return false;
  }
}

export function forgetIntent(): void {
  try {
    sessionStorage.removeItem(INTENT_KEY);
  } catch {
    // nothing to clear
  }
}
