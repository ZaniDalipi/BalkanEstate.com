import { createHash } from 'crypto';
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';

/**
 * Two-level cache for resized proxy images.
 *
 *  - Memory: LRU bounded by total bytes (IMAGE_PROXY_MEMORY_MB, default 64).
 *  - Disk:   one file per entry under IMAGE_PROXY_CACHE_DIR (default
 *            <tmp>/balkan-image-proxy), expired after IMAGE_PROXY_CACHE_DAYS
 *            (default 7) and capped at IMAGE_PROXY_DISK_MB (default 512).
 *            Survives restarts; a disk error only means a cache miss.
 *
 * Failures are cached in memory for a short while so a broken source URL is
 * not re-fetched on every page view.
 */

const readNumber = (name: string, fallback: number, min: number, max: number): number => {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value >= min && value <= max ? value : fallback;
};

const MEMORY_BYTES = readNumber('IMAGE_PROXY_MEMORY_MB', 64, 1, 2048) * 1024 * 1024;
const DISK_BYTES = readNumber('IMAGE_PROXY_DISK_MB', 512, 0, 100_000) * 1024 * 1024;
const TTL_MS = readNumber('IMAGE_PROXY_CACHE_DAYS', 7, 0.01, 365) * 24 * 60 * 60 * 1000;
const FAILURE_TTL_MS = 10 * 60 * 1000;
const CACHE_DIR = process.env.IMAGE_PROXY_CACHE_DIR || path.join(os.tmpdir(), 'balkan-image-proxy');

/**
 * Minimal LRU with TTL, bounded by total size. A Map keeps insertion order,
 * so re-inserting on read moves an entry to the "recent" end.
 */
export class SizedLru<V> {
  private entries = new Map<string, { value: V; size: number; expires: number }>();
  private total = 0;

  constructor(
    private readonly maxSize: number,
    private readonly ttlMs: number,
    private readonly sizeOf: (value: V) => number
  ) {}

  get(key: string): V | undefined {
    const entry = this.entries.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expires) {
      this.delete(key);
      return undefined;
    }
    this.entries.delete(key);
    this.entries.set(key, entry);
    return entry.value;
  }

  set(key: string, value: V): void {
    const size = Math.max(1, this.sizeOf(value));
    if (size > this.maxSize) return;
    this.delete(key);
    this.entries.set(key, { value, size, expires: Date.now() + this.ttlMs });
    this.total += size;
    for (const oldest of this.entries.keys()) {
      if (this.total <= this.maxSize) break;
      this.delete(oldest);
    }
  }

  private delete(key: string): void {
    const entry = this.entries.get(key);
    if (!entry) return;
    this.total -= entry.size;
    this.entries.delete(key);
  }
}

export class ImageProxyCache {
  private memory = new SizedLru<Buffer>(MEMORY_BYTES, TTL_MS, (body) => body.length);

  // Size 1 each, so this caps the count at 5000.
  private failures = new SizedLru<{ status: number; message: string }>(5000, FAILURE_TTL_MS, () => 1);

  private dirReady: Promise<boolean> | null = null;

  private hash(key: string): string {
    return createHash('sha256').update(key).digest('hex');
  }

  etag(key: string): string {
    return `"${this.hash(key).slice(0, 32)}"`;
  }

  private filePath(key: string): string {
    return path.join(CACHE_DIR, `${this.hash(key)}.webp`);
  }

  private ensureDir(): Promise<boolean> {
    if (DISK_BYTES === 0) return Promise.resolve(false);
    if (!this.dirReady) {
      this.dirReady = fs
        .mkdir(CACHE_DIR, { recursive: true })
        .then(() => true)
        .catch(() => false);
    }
    return this.dirReady;
  }

  async get(key: string): Promise<Buffer | undefined> {
    const hit = this.memory.get(key);
    if (hit) return hit;

    if (!(await this.ensureDir())) return undefined;
    try {
      const file = this.filePath(key);
      const stat = await fs.stat(file);
      if (Date.now() - stat.mtimeMs > TTL_MS) return undefined;
      const body = await fs.readFile(file);
      this.memory.set(key, body);
      return body;
    } catch {
      return undefined;
    }
  }

  async set(key: string, body: Buffer): Promise<void> {
    this.memory.set(key, body);
    if (!(await this.ensureDir())) return;
    const file = this.filePath(key);
    const temp = `${file}.${process.pid}.tmp`;
    try {
      // Write-then-rename so a concurrent reader never sees half a file.
      await fs.writeFile(temp, body);
      await fs.rename(temp, file);
    } catch {
      await fs.unlink(temp).catch(() => undefined);
    }
  }

  getFailure(key: string): { status: number; message: string } | undefined {
    return this.failures.get(key);
  }

  setFailure(key: string, status: number, message: string): void {
    // Only remember failures that are about the source, not our own hiccups.
    if (status === 404 || status === 413 || status === 415 || status === 422 || status === 400) {
      this.failures.set(key, { status, message });
    }
  }

  /** Drop expired files, then the oldest ones until under the size cap. */
  async sweepDisk(): Promise<void> {
    if (!(await this.ensureDir())) return;
    const names = await fs.readdir(CACHE_DIR);
    const entries: Array<{ file: string; size: number; mtime: number }> = [];

    for (const name of names) {
      const file = path.join(CACHE_DIR, name);
      try {
        const stat = await fs.stat(file);
        if (Date.now() - stat.mtimeMs > TTL_MS || name.endsWith('.tmp')) {
          await fs.unlink(file).catch(() => undefined);
        } else {
          entries.push({ file, size: stat.size, mtime: stat.mtimeMs });
        }
      } catch {
        // File vanished between readdir and stat — nothing to do.
      }
    }

    let total = entries.reduce((sum, e) => sum + e.size, 0);
    if (total <= DISK_BYTES) return;
    entries.sort((a, b) => a.mtime - b.mtime);
    for (const entry of entries) {
      if (total <= DISK_BYTES) break;
      await fs.unlink(entry.file).catch(() => undefined);
      total -= entry.size;
    }
  }
}
