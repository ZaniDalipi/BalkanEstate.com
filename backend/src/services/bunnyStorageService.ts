import {
  BUNNY_STORAGE_BASE_URL,
  BUNNY_STORAGE_PASSWORD,
  assertBunnyConfigured,
} from '../config/bunny';
import { mediaLogger } from '../utils/logger';

/**
 * Bunny Edge Storage — the raw object operations.
 *
 * Deliberately thin: it knows about bytes and paths, and nothing about
 * listings, avatars, or watermarks. `imageStorageService` builds the
 * application's storage layout on top of it.
 *
 * The API is plain HTTP against `{region}storage.bunnycdn.com/{zone}/{path}`,
 * authenticated with the zone password in an `AccessKey` header. There is no
 * SDK worth the dependency.
 */

/** Storage operations are small; a stuck request should not wedge a request handler. */
const REQUEST_TIMEOUT_MS = 60_000;

const storageUrl = (path: string): string =>
  `${BUNNY_STORAGE_BASE_URL}/${encodeStoragePath(path)}`;

/**
 * Percent-encode each path segment, leaving the separators alone.
 *
 * Folder names carry user-supplied slugs (listing titles, sanitised emails), so
 * a segment can legitimately contain characters that must not reach the URL raw.
 */
export const encodeStoragePath = (path: string): string =>
  path
    .replace(/^\/+/, '')
    .split('/')
    .map(segment => encodeURIComponent(segment))
    .join('/');

const request = async (
  method: 'GET' | 'PUT' | 'DELETE',
  path: string,
  body?: Buffer,
  extraHeaders: Record<string, string> = {}
): Promise<Response> => {
  assertBunnyConfigured();

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    return await fetch(storageUrl(path), {
      method,
      headers: {
        AccessKey: BUNNY_STORAGE_PASSWORD,
        accept: 'application/json',
        ...extraHeaders,
      },
      body: body as any,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
};

/**
 * Upload a buffer to `path` within the storage zone.
 *
 * Bunny creates intermediate folders implicitly and overwrites silently, so
 * there is no create-vs-update distinction to make here.
 */
export const putObject = async (path: string, body: Buffer, contentType = 'image/jpeg'): Promise<void> => {
  const response = await request('PUT', path, body, { 'Content-Type': contentType });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`Bunny upload failed for ${path}: ${response.status} ${detail}`.trim());
  }
};

/** Fetch an object's bytes. Returns null when it does not exist. */
export const getObject = async (path: string): Promise<Buffer | null> => {
  const response = await request('GET', path);

  if (response.status === 404) return null;
  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`Bunny download failed for ${path}: ${response.status} ${detail}`.trim());
  }

  return Buffer.from(await response.arrayBuffer());
};

/**
 * Whether an object exists.
 *
 * Bunny Edge Storage has no HEAD, so this is a GET whose body is discarded.
 * Only worth calling for small objects or when the answer decides whether to
 * do something far more expensive.
 */
export const objectExists = async (path: string): Promise<boolean> => {
  const response = await request('GET', path);
  // Drain so the connection can be reused rather than left hanging.
  await response.arrayBuffer().catch(() => undefined);
  return response.ok;
};

/**
 * Delete a single object.
 *
 * Returns false when it was already gone — a missing file is the state the
 * caller wanted, not an error worth propagating.
 */
export const deleteObject = async (path: string): Promise<boolean> => {
  const response = await request('DELETE', path);

  if (response.status === 404) return false;
  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`Bunny delete failed for ${path}: ${response.status} ${detail}`.trim());
  }

  return true;
};

interface BunnyListEntry {
  ObjectName: string;
  Path: string;
  IsDirectory: boolean;
  Length: number;
}

/** One directory level. Returns [] for a folder that does not exist. */
const listDirectory = async (folder: string): Promise<BunnyListEntry[]> => {
  const normalised = `${folder.replace(/^\/+|\/+$/g, '')}/`;
  const response = await request('GET', normalised);

  if (response.status === 404) return [];
  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`Bunny list failed for ${folder}: ${response.status} ${detail}`.trim());
  }

  const entries = await response.json().catch(() => []);
  return Array.isArray(entries) ? entries : [];
};

/**
 * Every object under `folder`, at any depth, as storage paths.
 *
 * Bunny lists one level at a time, so this walks. `maxEntries` bounds a walk
 * over an unexpectedly large tree rather than letting one cleanup call spend
 * minutes enumerating.
 */
export const listObjects = async (folder: string, maxEntries = 5000): Promise<string[]> => {
  const found: string[] = [];
  const queue: string[] = [folder.replace(/^\/+|\/+$/g, '')];

  while (queue.length > 0 && found.length < maxEntries) {
    const current = queue.shift()!;
    let entries: BunnyListEntry[];

    try {
      entries = await listDirectory(current);
    } catch (error: any) {
      mediaLogger.warn(`⚠️  Could not list ${current}: ${error.message}`);
      continue;
    }

    for (const entry of entries) {
      const childPath = `${current}/${entry.ObjectName}`;
      if (entry.IsDirectory) {
        queue.push(childPath);
      } else {
        found.push(childPath);
      }
    }
  }

  return found;
};

/**
 * Delete a folder and everything under it.
 *
 * Returns the paths removed, because the caller has ownership records keyed by
 * those same paths to clean up afterwards.
 *
 * Bunny's own recursive directory delete would be one call, but it reports only
 * success or failure — it never says *what* it removed. Enumerating first is
 * the difference between deleting the files and also forgetting them.
 */
export const deleteFolderRecursive = async (folder: string): Promise<string[]> => {
  const paths = await listObjects(folder);

  const deleted: string[] = [];
  for (const path of paths) {
    try {
      await deleteObject(path);
      deleted.push(path);
    } catch (error: any) {
      mediaLogger.warn(`⚠️  Could not delete ${path}: ${error.message}`);
    }
  }

  // Sweep the now-empty directory itself so the zone does not accumulate shells.
  await request('DELETE', `${folder.replace(/^\/+|\/+$/g, '')}/`).catch(() => undefined);

  return deleted;
};

/**
 * Move an object.
 *
 * Edge Storage has no server-side rename, so this is a read, a write, and a
 * delete. The delete only runs once the copy is confirmed, so an interruption
 * leaves a duplicate rather than nothing.
 */
export const moveObject = async (fromPath: string, toPath: string, contentType = 'image/jpeg'): Promise<boolean> => {
  if (fromPath === toPath) return true;

  const body = await getObject(fromPath);
  if (!body) {
    mediaLogger.warn(`⚠️  Cannot move ${fromPath}: not found in storage`);
    return false;
  }

  await putObject(toPath, body, contentType);
  await deleteObject(fromPath).catch(() => undefined);
  return true;
};
