/**
 * Web addresses as owners type them: without the scheme ("www.x.com",
 * "x.com", "facebook.com/x"). The field shows a fixed "https://" in front;
 * whatever scheme is typed or pasted is dropped, and the address is saved
 * with https:// added.
 */
const LEADING_SCHEME = /^(?:https?:)?\/\/+/i;

/** The address without its http(s):// (or //) and without spaces, as the field shows it. */
export function stripScheme(value: string | undefined | null): string {
  let v = (value ?? '').replace(/\s+/g, '');
  while (LEADING_SCHEME.test(v)) v = v.replace(LEADING_SCHEME, '');
  return v;
}

/** The address to save: https:// + what was typed; '' when nothing was. */
export const toWebUrl = (value: string | undefined | null): string => {
  const v = stripScheme(value);
  return v ? `https://${v}` : '';
};

/** A saved address is a real https site: no other scheme, no user:password@, a dotted host name. */
export function isWebUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === 'https:' && !u.username && !u.password && /\.[a-z\d-]{2,}$/i.test(u.hostname);
  } catch {
    return false;
  }
}
