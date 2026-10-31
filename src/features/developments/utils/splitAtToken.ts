/**
 * Split a translated sentence around a marker that stood in for one value, so
 * that value can be rendered as its own element (a link, a button) wherever
 * the language puts it. Returns null when the marker isn't there.
 */
export function splitAtToken(text: string, token: string): { before: string; after: string } | null {
  const at = text.indexOf(token);
  if (at < 0) return null;
  return { before: text.slice(0, at), after: text.slice(at + token.length) };
}
