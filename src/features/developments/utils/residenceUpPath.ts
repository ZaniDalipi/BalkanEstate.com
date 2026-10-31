/**
 * One level up from a public residence page, for a Back button with nothing
 * behind it (opened from a shared link): apartment → its floor or building →
 * the residence → the residences list. Null when `pathname` is not a public
 * residence page. Filters in the query stay; only the levels are dropped.
 */
const RESIDENCE_PATH = /^(\/[a-z]{2})?\/developments\/[^/]+\/?$/;

export function residenceUpPath(pathname: string, search: string): string | null {
  const match = pathname.match(RESIDENCE_PATH);
  if (!match) return null;
  const p = new URLSearchParams(search);
  const at = (path: string) => {
    const qs = p.toString();
    return `${path}${qs ? `?${qs}` : ''}`;
  };
  if (p.has('unit')) {
    p.delete('unit');
    return at(pathname);
  }
  if (p.has('f')) {
    p.delete('f');
    p.delete('v');
    return at(pathname);
  }
  if (p.has('b')) {
    p.delete('b');
    p.delete('v');
    return at(pathname);
  }
  return `${match[1] ?? ''}/developments`;
}
