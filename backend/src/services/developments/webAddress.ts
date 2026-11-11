/**
 * Web addresses arrive the way owners type them: the dashboard sends them
 * with https:// added, but any client may send "www.x.com". The server adds
 * the scheme the same way before it checks the address, so the rule (a real
 * http(s) site) holds whoever sends it.
 */
const HAS_SCHEME = /^[a-z][a-z\d+.-]*:/i;

export const withHttps = (value: string): string => {
  const v = value.trim().replace(/^\/\/+/, '');
  return v && !HAS_SCHEME.test(v) ? `https://${v}` : v;
};
