/**
 * Latency/throughput statistics helpers.
 *
 * Latencies are kept as raw sample arrays — at the volumes a single load
 * generator produces (a few million samples at most) this costs ~8 bytes per
 * request and gives exact percentiles instead of histogram approximations.
 */

export class Metric {
  constructor(label) {
    this.label = label;
    this.latencies = [];
    this.count = 0;
    this.ok = 0;
    this.bytes = 0;
    this.statuses = new Map(); // status code (or error string) -> count
  }

  record({ ms, status, bytes = 0 }) {
    this.count += 1;
    this.latencies.push(ms);
    this.bytes += bytes;
    this.statuses.set(status, (this.statuses.get(status) || 0) + 1);
    if (typeof status === 'number' && status >= 200 && status < 400) this.ok += 1;
  }

  /** Requests that failed for reasons other than rate limiting. */
  get failures() {
    let n = 0;
    for (const [status, count] of this.statuses) {
      if (status === 429) continue;
      if (typeof status !== 'number' || status >= 400) n += count;
    }
    return n;
  }

  get rateLimited() {
    return this.statuses.get(429) || 0;
  }

  percentiles(ps = [50, 90, 95, 99]) {
    if (this.latencies.length === 0) return Object.fromEntries(ps.map(p => [p, 0]));
    const sorted = Float64Array.from(this.latencies).sort();
    const out = {};
    for (const p of ps) {
      const idx = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
      out[p] = sorted[Math.max(0, idx)];
    }
    return out;
  }

  get mean() {
    if (this.latencies.length === 0) return 0;
    let sum = 0;
    for (const v of this.latencies) sum += v;
    return sum / this.latencies.length;
  }

  get max() {
    let m = 0;
    for (const v of this.latencies) if (v > m) m = v;
    return m;
  }

  summary(durationSec) {
    const p = this.percentiles();
    return {
      label: this.label,
      requests: this.count,
      rps: durationSec > 0 ? this.count / durationSec : 0,
      ok: this.ok,
      failures: this.failures,
      rateLimited: this.rateLimited,
      mean: this.mean,
      p50: p[50],
      p90: p[90],
      p95: p[95],
      p99: p[99],
      max: this.max,
      bytes: this.bytes,
      statuses: Object.fromEntries(this.statuses),
    };
  }
}

export class Registry {
  constructor() {
    this.metrics = new Map();
    /** Per-second request counters, for the throughput timeline. */
    this.timeline = new Map();
    /** Steps that couldn't run because an earlier step yielded no data. */
    this.skips = new Map();
    this.startedAt = 0;
  }

  skip(label) {
    this.skips.set(label, (this.skips.get(label) || 0) + 1);
  }

  metric(label) {
    let m = this.metrics.get(label);
    if (!m) {
      m = new Metric(label);
      this.metrics.set(label, m);
    }
    return m;
  }

  record(label, sample) {
    this.metric(label).record(sample);
    const second = Math.floor((Date.now() - this.startedAt) / 1000);
    const bucket = this.timeline.get(second) || { requests: 0, failures: 0, latencySum: 0 };
    bucket.requests += 1;
    bucket.latencySum += sample.ms;
    if (sample.status === 429 || typeof sample.status !== 'number' || sample.status >= 400) {
      bucket.failures += 1;
    }
    this.timeline.set(second, bucket);
  }

  totals(durationSec) {
    const all = new Metric('TOTAL');
    for (const m of this.metrics.values()) {
      all.count += m.count;
      all.ok += m.ok;
      all.bytes += m.bytes;
      for (const v of m.latencies) all.latencies.push(v);
      for (const [status, count] of m.statuses) {
        all.statuses.set(status, (all.statuses.get(status) || 0) + count);
      }
    }
    return all.summary(durationSec);
  }
}

export function fmtMs(ms) {
  if (ms >= 1000) return `${(ms / 1000).toFixed(2)}s`;
  return `${ms.toFixed(0)}ms`;
}

export function fmtBytes(bytes) {
  const units = ['B', 'KB', 'MB', 'GB'];
  let v = bytes;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i += 1;
  }
  return `${v.toFixed(i === 0 ? 0 : 1)}${units[i]}`;
}

/** Renders an array of row objects as a fixed-width table. */
export function table(rows, columns) {
  const widths = columns.map(c =>
    Math.max(c.header.length, ...rows.map(r => String(c.value(r)).length))
  );
  const line = (cells) =>
    cells.map((cell, i) => (columns[i].align === 'right' ? String(cell).padStart(widths[i]) : String(cell).padEnd(widths[i]))).join('  ');

  const out = [line(columns.map(c => c.header)), line(widths.map(w => '─'.repeat(w)))];
  for (const r of rows) out.push(line(columns.map(c => c.value(r))));
  return out.join('\n');
}
