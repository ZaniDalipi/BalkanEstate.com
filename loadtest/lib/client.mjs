/**
 * Minimal keep-alive HTTP client with per-request timing.
 *
 * Deliberately dependency-free: the load generator must not add npm packages
 * to the app, and node:http gives accurate timings without a wrapper library.
 */

import http from 'node:http';
import https from 'node:https';
import { URL } from 'node:url';

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
            resolve({
              status: res.statusCode,
              ms,
              bytes,
              headers: res.headers,
              body: parse ? Buffer.concat(chunks).toString('utf8') : '',
            });
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
