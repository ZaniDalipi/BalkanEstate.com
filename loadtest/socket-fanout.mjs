#!/usr/bin/env node
/**
 * WebSocket connection + fan-out test.
 *
 * Two things this measures that the HTTP test cannot:
 *
 *  1. Connection capacity — how many concurrent Socket.IO clients the API
 *     accepts, and how long the handshake takes as the count climbs.
 *  2. Fan-out cost — `property:created` / `property:updated` are emitted to
 *     *every* connected socket, so one listing edit costs one frame per
 *     connected user. This counts the frames and bytes each client receives
 *     and extrapolates to a larger audience.
 *
 *   node loadtest/socket-fanout.mjs --target http://localhost:5001 --token <jwt> --clients 200 --duration 60
 *
 * The chat socket requires a valid JWT on the handshake, so --token is
 * mandatory; every simulated client reuses that one user's token.
 *
 * While it runs, create/edit a listing (in the UI or via the API) — the
 * report then shows what a single edit costs at this connection count.
 */

import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const rootRequire = createRequire(path.join(here, '..', 'package.json'));

let io;
try {
  ({ io } = rootRequire('socket.io-client'));
} catch {
  console.error('Could not load socket.io-client from the project root — run `npm install` first.');
  process.exit(1);
}

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : fallback;
};

const config = {
  target: flag('target', 'http://localhost:5001'),
  token: flag('token', process.env.LOADTEST_TOKEN || ''),
  clients: Number(flag('clients', 200)),
  duration: Number(flag('duration', 60)),
  ramp: Number(flag('ramp', 10)),
};

if (!config.token) {
  console.error('A JWT is required: --token <accessToken> (the socket handshake rejects unauthenticated clients).');
  process.exit(1);
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const state = {
  connected: 0,
  failed: 0,
  disconnects: 0,
  connectMs: [],
  errors: new Map(),
  events: new Map(),   // event name -> count across all clients
  bytes: 0,
  frames: 0,
};

const bump = (map, key) => map.set(key, (map.get(key) || 0) + 1);

function percentile(values, p) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)];
}

async function main() {
  console.log(`Target:   ${config.target}`);
  console.log(`Clients:  ${config.clients} (ramped over ${config.ramp}s)`);
  console.log(`Duration: ${config.duration}s\n`);
  console.log('Trigger a listing create/update while this runs to measure fan-out.\n');

  const sockets = [];
  const startedAt = Date.now();

  for (let i = 0; i < config.clients; i++) {
    const delay = config.ramp > 0 ? Math.round((i / config.clients) * config.ramp * 1000) : 0;
    setTimeout(() => {
      const openedAt = Date.now();
      const socket = io(config.target, {
        auth: { token: config.token },
        transports: ['websocket'],
        reconnection: false,        // a reconnect would hide a capacity limit
        timeout: 20000,
      });
      sockets.push(socket);

      socket.on('connect', () => {
        state.connected += 1;
        state.connectMs.push(Date.now() - openedAt);
      });
      socket.on('connect_error', (err) => {
        state.failed += 1;
        bump(state.errors, err?.message || 'connect_error');
      });
      socket.on('disconnect', () => { state.disconnects += 1; });
      socket.onAny((name) => { bump(state.events, name); });

      // engine-level accounting: every frame this client is sent, in bytes.
      socket.io.engine?.on('packet', (packet) => {
        state.frames += 1;
        if (typeof packet.data === 'string') state.bytes += Buffer.byteLength(packet.data);
      });
    }, delay);
  }

  const progress = setInterval(() => {
    const elapsed = Math.round((Date.now() - startedAt) / 1000);
    const events = [...state.events.values()].reduce((a, b) => a + b, 0);
    console.log(`[${String(elapsed).padStart(4)}s] connected=${state.connected} failed=${state.failed} events=${events} frames=${state.frames}`);
  }, 5000);

  await sleep(config.duration * 1000);
  clearInterval(progress);

  const totalEvents = [...state.events.values()].reduce((a, b) => a + b, 0);
  console.log(`\n${'═'.repeat(72)}`);
  console.log('SOCKET RESULTS');
  console.log('═'.repeat(72));
  console.log(`connected:        ${state.connected} / ${config.clients}`);
  console.log(`failed:           ${state.failed}`);
  console.log(`dropped mid-run:  ${state.disconnects}`);
  console.log(`handshake:        p50 ${percentile(state.connectMs, 50)}ms  p95 ${percentile(state.connectMs, 95)}ms  max ${Math.max(0, ...state.connectMs)}ms`);
  console.log(`frames received:  ${state.frames} (${(state.bytes / 1024).toFixed(1)} KB across all clients)`);

  if (state.errors.size) {
    console.log('\nCONNECT ERRORS');
    for (const [msg, count] of [...state.errors].sort((a, b) => b[1] - a[1])) {
      console.log(`  ${count}×  ${msg}`);
    }
  }

  if (totalEvents) {
    console.log('\nEVENTS RECEIVED (all clients)');
    for (const [name, count] of [...state.events].sort((a, b) => b[1] - a[1])) {
      const perClient = state.connected ? (count / state.connected).toFixed(1) : '0';
      console.log(`  ${name.padEnd(28)} ${count}  (${perClient} per connected client)`);
    }

    const propertyEvents = [...state.events]
      .filter(([name]) => name.startsWith('property:'))
      .reduce((sum, [, count]) => sum + count, 0);
    if (propertyEvents && state.connected) {
      const perEdit = propertyEvents / state.connected;   // ≈ number of listing edits observed
      const bytesPerClientEvent = state.bytes / Math.max(1, propertyEvents);
      console.log(
        `\n  ${Math.round(perEdit)} listing event(s) were broadcast during the run. Each one is delivered to every ` +
        `connected client:\n  at ${state.connected} clients that is ${state.connected} frames ` +
        `(~${((bytesPerClientEvent * state.connected) / 1024).toFixed(0)} KB) per edit; ` +
        `at 10,000 concurrent users it would be 10,000 frames (~${((bytesPerClientEvent * 10000) / 1024 / 1024).toFixed(1)} MB) per edit.`
      );
      console.log('  Each client also invalidates its React Query cache on these events, so every edit');
      console.log('  triggers a refetch of /api/properties from every open tab.');
    }
  } else {
    console.log('\nNo events received — no listing was created/updated during the run, or the sockets never connected.');
  }
  console.log('');

  for (const socket of sockets) socket.close();
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
