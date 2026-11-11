import type { IncomingHttpHeaders } from 'http';

/**
 * Whether the client reached us over TLS.
 *
 * The API is a plain HTTP server behind a TLS-terminating proxy (`trust proxy`
 * is on), so socket.io's own `handshake.secure` is false for every production
 * client. The proxy reports the client's scheme in X-Forwarded-Proto; read it
 * the way Express reads `req.protocol`: the first value of the list.
 */
export const isSecureHandshake = (handshake: {
  secure: boolean;
  headers: IncomingHttpHeaders;
}): boolean => {
  if (handshake.secure) return true;
  const header = handshake.headers['x-forwarded-proto'];
  const value = Array.isArray(header) ? header[0] : header;
  return value?.split(',')[0].trim().toLowerCase() === 'https';
};
