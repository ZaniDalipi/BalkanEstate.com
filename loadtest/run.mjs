#!/usr/bin/env node
/**
 * BalkanEstate load / stress test runner.
 *
 * Zero dependencies — runs on the repo's Node version with no install step:
 *
 *   node loadtest/run.mjs --target http://localhost:5001 --vus 50 --duration 60
 *
 * See loadtest/README.md for the full flag list, scenario descriptions and
 * how to read the report.
 */

import { writeFileSync } from 'node:fs';
import { createClient, safeJson } from './lib/client.mjs';
import { Registry, table, fmtMs, fmtBytes } from './lib/stats.mjs';
import { scenarios, defaultMix } from './scenarios.mjs';

// ── CLI ───────────────────────────────────────────────────────────

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith('--')) continue;
    const key = arg.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith('--')) {
      out[key] = true;
    } else {
      out[key] = next;
      i += 1;
    }
  }
  return out;
}

const args = parseArgs(process.argv.slice(2));

if (args.help) {
  console.log(`
BalkanEstate load test

  --target <url>          API base URL           (default http://localhost:5001)
  --vus <n>               Concurrent virtual users (default 50)
  --duration <seconds>    Test length            (default 60)
  --ramp <seconds>        Ramp-up time           (default 10)
  --think <ms>            Think time between steps (default 300)
  --scenario <name|mix>   ${Object.keys(scenarios).join(' | ')} | mix   (default mix)
  --email/--password      Log in once and run authenticated steps
  --token <jwt>           Use an existing access token instead of logging in
  --vary-ip               Send a unique X-Forwarded-For per VU (bypasses the
                          per-IP rate limiter so you measure the app, not the limiter)
  --timeout <ms>          Per-request timeout    (default 30000)
  --abort-error-rate <f>  Stop early above this failure rate (default 0.5, 0 disables)
  --out <file.json>       Write the full result set as JSON
  --allow-prod            Required to target a non-local host
`.trim());
  process.exit(0);
}

const config = {
  target: args.target || 'http://localhost:5001',
  vus: Number(args.vus || 50),
  duration: Number(args.duration || 60),
  ramp: Number(args.ramp ?? 10),
  think: Number(args.think ?? 300),
  scenario: args.scenario || 'mix',
  timeout: Number(args.timeout || 30000),
  abortErrorRate: args['abort-error-rate'] === undefined ? 0.5 : Number(args['abort-error-rate']),
  varyIp: Boolean(args['vary-ip']),
  out: args.out,
};

// ── Safety: don't accidentally stress production ──────────────────

const targetHost = new URL(config.target).hostname;
const LOCAL_HOSTS = /^(localhost|127\.0\.0\.1|::1|0\.0\.0\.0|.*\.local|.*\.test|.*\.internal)$/i;
const NONPROD_HINT = /(staging|dev|qa|preview|sandbox)/i;
if (!LOCAL_HOSTS.test(targetHost) && !NONPROD_HINT.test(targetHost) && !args['allow-prod']) {
  console.error(
    `\nRefusing to load-test "${targetHost}" — it doesn't look like a local or staging host.\n` +
    `A stress test is a deliberate denial-of-service against your own server: run it against\n` +
    `staging, or pass --allow-prod if you really mean to point it at production.\n`
  );
  process.exit(1);
}

// ── Scenario selection ────────────────────────────────────────────

let selected;
if (config.scenario === 'mix') {
  selected = defaultMix.map(name => ({ name, ...scenarios[name] }));
} else if (config.scenario === 'all') {
  selected = Object.entries(scenarios).map(([name, s]) => ({ name, ...s, weight: s.weight || 10 }));
} else {
  const s = scenarios[config.scenario];
  if (!s) {
    console.error(`Unknown scenario "${config.scenario}". Available: ${Object.keys(scenarios).join(', ')}, mix, all`);
    process.exit(1);
  }
  selected = [{ name: config.scenario, ...s, weight: 1 }];
}

// ── Runner state ──────────────────────────────────────────────────

const client = createClient({ baseUrl: config.target, timeoutMs: config.timeout, maxSockets: Math.max(64, config.vus * 2) });
const registry = new Registry();
const shared = {};          // cross-VU state (the "viral" property id)
let token = typeof args.token === 'string' ? args.token : null;
let aborted = false;
let abortReason = '';
let activeVUs = 0;

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const jitter = (ms) => Math.round(ms * (0.5 + Math.random()));

function pickScenario() {
  const usable = selected.filter(s => !s.requiresAuth || token);
  const total = usable.reduce((sum, s) => sum + (s.weight || 1), 0);
  let r = Math.random() * total;
  for (const s of usable) {
    r -= (s.weight || 1);
    if (r <= 0) return s;
  }
  return usable[usable.length - 1];
}

async function login() {
  if (token) return;
  if (!args.email || !args.password) return;
  const res = await client.request({
    method: 'POST',
    path: '/api/auth/login',
    body: { email: args.email, password: args.password },
    parse: true,
  });
  const json = safeJson(res.body);
  token = json?.accessToken || json?.token || json?.data?.accessToken || null;
  if (token) {
    console.log('Logged in — authenticated scenarios enabled.');
  } else {
    console.warn(`Login failed (HTTP ${res.status}) — authenticated scenarios will be skipped.`);
  }
}

async function runVU(id, endAt) {
  const ctx = {
    vu: id,
    shared,
    get token() { return token; },
    ip: `10.${(id >> 16) & 255}.${(id >> 8) & 255}.${id & 255}`,
  };
  activeVUs += 1;

  while (Date.now() < endAt && !aborted) {
    const scenario = pickScenario();
    if (!scenario) break;

    for (const step of scenario.steps) {
      if (Date.now() >= endAt || aborted) break;

      const desc = step.req(ctx);
      if (!desc) {
        registry.skip(`${scenario.name} · ${step.label}`);
        continue;
      }

      const headers = { ...(desc.headers || {}) };
      if (desc.auth && token) headers.authorization = `Bearer ${token}`;
      if (config.varyIp) headers['x-forwarded-for'] = ctx.ip;

      const res = await client.request({ ...desc, headers });
      registry.record(`${scenario.name} · ${step.label}`, { ms: res.ms, status: res.status, bytes: res.bytes });
      windowSamples.push({ ms: res.ms, status: res.status });

      if (step.after && res.status === 200) {
        try {
          step.after(ctx, safeJson(res.body));
        } catch {
          // A shape change in the response must not kill the virtual user.
        }
      }

      if (config.think > 0) await sleep(jitter(config.think));
    }
  }

  activeVUs -= 1;
}

// ── Live progress ─────────────────────────────────────────────────

let windowSamples = [];

function progressTick(endAt) {
  const samples = windowSamples;
  windowSamples = [];
  const elapsed = (Date.now() - registry.startedAt) / 1000;
  const remaining = Math.max(0, Math.round((endAt - Date.now()) / 1000));
  const n = samples.length;
  const failures = samples.filter(s => typeof s.status !== 'number' || s.status >= 400).length;
  const sorted = samples.map(s => s.ms).sort((a, b) => a - b);
  const p95 = n ? sorted[Math.min(n - 1, Math.ceil(0.95 * n) - 1)] : 0;
  const errorRate = n ? failures / n : 0;

  console.log(
    `[${String(Math.round(elapsed)).padStart(4)}s] vus=${String(activeVUs).padStart(4)} ` +
    `rps=${(n / PROGRESS_INTERVAL_SEC).toFixed(0).padStart(5)} ` +
    `p95=${fmtMs(p95).padStart(7)} ` +
    `errors=${(errorRate * 100).toFixed(1).padStart(5)}% ` +
    `(${remaining}s left)`
  );

  if (config.abortErrorRate > 0 && elapsed > 15 && n > 20 && errorRate > config.abortErrorRate) {
    aborted = true;
    abortReason = `error rate ${(errorRate * 100).toFixed(0)}% exceeded --abort-error-rate ${config.abortErrorRate}`;
  }
}

const PROGRESS_INTERVAL_SEC = 5;

// ── Report ────────────────────────────────────────────────────────

function sparkline(values) {
  const blocks = '▁▂▃▄▅▆▇█';
  const max = Math.max(...values, 1);
  return values.map(v => blocks[Math.min(blocks.length - 1, Math.floor((v / max) * (blocks.length - 1)))]).join('');
}

function report(durationSec) {
  const rows = [...registry.metrics.values()]
    .map(m => m.summary(durationSec))
    .sort((a, b) => b.requests - a.requests);

  console.log(`\n${'═'.repeat(112)}`);
  console.log(`RESULTS — ${config.target}  |  ${config.vus} VUs  |  ${durationSec.toFixed(0)}s  |  scenario: ${config.scenario}`);
  console.log('═'.repeat(112));

  console.log(table(rows, [
    { header: 'STEP', value: r => r.label.length > 44 ? `${r.label.slice(0, 43)}…` : r.label },
    { header: 'REQS', value: r => r.requests, align: 'right' },
    { header: 'RPS', value: r => r.rps.toFixed(1), align: 'right' },
    { header: 'FAIL', value: r => r.failures, align: 'right' },
    { header: '429', value: r => r.rateLimited, align: 'right' },
    { header: 'p50', value: r => fmtMs(r.p50), align: 'right' },
    { header: 'p95', value: r => fmtMs(r.p95), align: 'right' },
    { header: 'p99', value: r => fmtMs(r.p99), align: 'right' },
    { header: 'MAX', value: r => fmtMs(r.max), align: 'right' },
    { header: 'AVG SIZE', value: r => fmtBytes(r.requests ? r.bytes / r.requests : 0), align: 'right' },
  ]));

  const totals = registry.totals(durationSec);
  console.log('\n' + '─'.repeat(112));
  console.log(
    `TOTAL  ${totals.requests} requests  ·  ${totals.rps.toFixed(1)} req/s  ·  ` +
    `p50 ${fmtMs(totals.p50)}  p95 ${fmtMs(totals.p95)}  p99 ${fmtMs(totals.p99)}  max ${fmtMs(totals.max)}  ·  ` +
    `${fmtBytes(totals.bytes)} transferred`
  );

  const statusLine = Object.entries(totals.statuses)
    .sort((a, b) => b[1] - a[1])
    .map(([status, count]) => `${status}: ${count}`)
    .join('   ');
  console.log(`STATUS ${statusLine}`);

  const seconds = [...registry.timeline.keys()].sort((a, b) => a - b);
  if (seconds.length > 2) {
    const rps = seconds.map(s => registry.timeline.get(s).requests);
    console.log(`RPS    ${sparkline(rps)}  (${Math.min(...rps)}–${Math.max(...rps)} req/s over ${seconds.length}s)`);
  }

  // Findings worth surfacing without reading the whole table.
  const notes = [];
  if (totals.rateLimited > 0) {
    notes.push(config.varyIp
      ? `${totals.rateLimited} responses were rate-limited (429) despite --vary-ip — either a proxy in front of the API ` +
        `rewrites X-Forwarded-For, or the limit that fired is keyed on an account/endpoint rather than the IP.`
      : `${totals.rateLimited} responses were rate-limited (429). The API allows 1000 req/15min per IP, ` +
        `so a single load generator hits the limiter before the app. Re-run with --vary-ip to measure the app itself.`);
  }
  const server5xx = Object.entries(totals.statuses).filter(([s]) => Number(s) >= 500);
  if (server5xx.length) {
    notes.push(`Server errors returned: ${server5xx.map(([s, c]) => `${c}× ${s}`).join(', ')} — these are app bugs under load, not capacity limits.`);
  }
  const transportErrors = Object.entries(totals.statuses).filter(([s]) => Number.isNaN(Number(s)));
  if (transportErrors.length) {
    notes.push(`Transport failures: ${transportErrors.map(([s, c]) => `${c}× ${s}`).join(', ')} — the server stopped accepting or completing connections.`);
  }
  // A step that never ran is a hole in the test, not a clean result.
  const neverRan = [...registry.skips.entries()]
    .filter(([label]) => !registry.metrics.has(label))
    .sort((a, b) => b[1] - a[1]);
  if (neverRan.length) {
    notes.push(
      `${neverRan.length} step(s) never ran — they depend on data from an earlier response that could not be read: ` +
      `${neverRan.map(([label, count]) => `${label} (skipped ${count}×)`).join('; ')}. ` +
      `These endpoints are NOT covered by this run.`
    );
  }
  const slowest = rows.filter(r => r.requests > 5).sort((a, b) => b.p95 - a.p95)[0];
  if (slowest) notes.push(`Slowest step at p95: ${slowest.label} (${fmtMs(slowest.p95)}).`);
  const heaviest = rows.filter(r => r.requests > 5).sort((a, b) => (b.bytes / b.requests) - (a.bytes / a.requests))[0];
  if (heaviest && heaviest.bytes / heaviest.requests > 512 * 1024) {
    notes.push(`Largest response: ${heaviest.label} averages ${fmtBytes(heaviest.bytes / heaviest.requests)} per request.`);
  }
  if (abortReason) notes.push(`Run aborted early: ${abortReason}`);

  if (notes.length) {
    console.log('\nNOTES');
    for (const note of notes) console.log(`  • ${note}`);
  }
  console.log('');

  if (config.out) {
    writeFileSync(config.out, JSON.stringify({
      config,
      startedAt: new Date(registry.startedAt).toISOString(),
      durationSec,
      totals,
      steps: rows,
      timeline: seconds.map(s => ({ second: s, ...registry.timeline.get(s) })),
      notes,
    }, null, 2));
    console.log(`Full results written to ${config.out}\n`);
  }
}

// ── Main ──────────────────────────────────────────────────────────

async function main() {
  console.log(`Target:    ${config.target}`);
  console.log(`Load:      ${config.vus} VUs, ${config.duration}s, ${config.ramp}s ramp, ${config.think}ms think time`);
  console.log(`Scenarios: ${selected.map(s => `${s.name}(${s.weight || 1})`).join(', ')}`);
  if (config.varyIp) console.log('X-Forwarded-For: unique per VU (per-IP rate limiter bypassed)');
  console.log('');

  // Fail fast on an unreachable target instead of reporting 100% errors.
  const probe = await client.request({ path: '/api/health', parse: true });
  if (typeof probe.status !== 'number') {
    console.error(`Cannot reach ${config.target} (${probe.status}). Is the API running?`);
    process.exit(1);
  }
  console.log(`Health check: HTTP ${probe.status} in ${fmtMs(probe.ms)}\n`);

  await login();

  registry.startedAt = Date.now();
  const endAt = registry.startedAt + config.duration * 1000;
  const progress = setInterval(() => progressTick(endAt), PROGRESS_INTERVAL_SEC * 1000);

  process.on('SIGINT', () => {
    aborted = true;
    abortReason = 'interrupted by user';
  });

  const vus = [];
  for (let i = 0; i < config.vus; i++) {
    const delay = config.ramp > 0 ? Math.round((i / config.vus) * config.ramp * 1000) : 0;
    vus.push(sleep(delay).then(() => (aborted ? undefined : runVU(i, endAt))));
  }

  await Promise.all(vus);
  clearInterval(progress);

  const durationSec = (Date.now() - registry.startedAt) / 1000;
  report(durationSec);
  client.destroy();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
