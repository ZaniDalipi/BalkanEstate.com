/**
 * Minimal keep-alive HTTP client with per-request timing.
 *
 * Deliberately dependency-free: the load generator must not add npm packages
 * to the app, and node:http gives accurate timings without a wrapper library.
 */

import http from 'node:http';
import https from 'node:https';
import zlib from 'node:zlib';
import { URL } from 'node:url';

/**
 * The API runs `compression()`, so a parsed body has to be inflated first —
 * otherwise every step that reads an id out of a response silently gets
 * nothing. Byte counts stay on the wire size, which is what bandwidth costs.
 */
function decode(buffer, encoding, done) {
  if (!buffer.length) return done('');
  const enc = (encoding || '').toLowerCase();
  const finish = (err, out) => done(err ? '' : out.toString('utf8'));
  if (enc.includes('br')) return zlib.brotliDecompress(buffer, finish);
  if (enc.includes('gzip')) return zlib.gunzip(buffer, finish);
  if (enc.includes('deflate')) return zlib.inflate(buffer, finish);
  return done(buffer.toString('utf8'));
}

export function createClient({ baseUrl, timeoutMs = 30000, maxSockets = 512 }) {
  const base = new URL(baseUrl);
  const isTls = base.protocol === 'https:';
  const transport = isTls ? https : http;
  const agent = new transport.Agent({
    keepAlive: true,
    keepAliveMsecs: 30000,
    maxSockets,
    maxFreeSockets: maxSockets,
  });

  /**
   * @returns {Promise<{status: number|string, ms: number, bytes: number, body: string, headers: object}>}
   *   Never rejects — transport failures come back as a string `status`
   *   ('ECONNRESET', 'TIMEOUT', …) so they land in the report as error classes
   *   rather than killing the virtual user.
   */
  function request({ method = 'GET', path, headers = {}, body, parse = false }) {
    return new Promise((resolve) => {
      const url = new URL(path, base);
      const payload = body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body);
      const start = process.hrtime.bigint();

      const req = transport.request(
        {
          agent,
          method,
          protocol: url.protocol,
          hostname: url.hostname,
          port: url.port || (isTls ? 443 : 80),
          path: url.pathname + url.search,
          headers: {
            accept: 'application/json',
            'accept-encoding': 'gzip, deflate',
            ...(payload !== undefined ? { 'content-type': 'application/json', 'content-length': Buffer.byteLength(payload) } : {}),
            ...headers,
          },
          timeout: timeoutMs,
        },
        (res) => {
          let bytes = 0;
          const chunks = [];
          res.on('data', (chunk) => {
            bytes += chunk.length;
            // Only retain the body when a step needs to read it (ids, tokens).
            if (parse && bytes < 8 * 1024 * 1024) chunks.push(chunk);
          });
          res.on('end', () => {
            const ms = Number(process.hrtime.bigint() - start) / 1e6;
            const done = (body) => resolve({ status: res.statusCode, ms, bytes, headers: res.headers, body });
            if (!parse) return done('');
            decode(Buffer.concat(chunks), res.headers['content-encoding'], done);
          });
          res.on('error', () => {
            const ms = Number(process.hrtime.bigint() - start) / 1e6;
            resolve({ status: 'RESPONSE_ERROR', ms, bytes, headers: res.headers, body: '' });
          });
        }
      );

      req.on('timeout', () => {
        req.destroy();
        const ms = Number(process.hrtime.bigint() - start) / 1e6;
        resolve({ status: 'TIMEOUT', ms, bytes: 0, headers: {}, body: '' });
      });

      req.on('error', (err) => {
        const ms = Number(process.hrtime.bigint() - start) / 1e6;
        resolve({ status: err.code || 'ERROR', ms, bytes: 0, headers: {}, body: '' });
      });

      if (payload !== undefined) req.write(payload);
      req.end();
    });
  }

  return {
    request,
    destroy: () => agent.destroy(),
  };
}

/** Parses a JSON body, returning null instead of throwing on garbage/HTML. */
export function safeJson(text) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
