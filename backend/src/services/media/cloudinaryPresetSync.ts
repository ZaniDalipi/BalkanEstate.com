import cloudinary from '../../config/cloudinary';
import { mediaLogger } from '../../utils/logger';
import { buildPresetDefinitions } from '../../config/cloudinaryPresets';

/**
 * Register the delivery presets (config/cloudinaryPresets.ts) as Cloudinary
 * named transformations, each "allowed for strict transformations".
 *
 * Runs at server startup and from `npm run cloudinary:sync-presets`. It is
 * idempotent and cheap once in place: one paginated list call, then only the
 * missing or not-yet-allowed presets are touched. Admin API calls are
 * rate-limited but never billed as credits.
 *
 * Changing a preset's definition: give it a NEW name (e.g. bump the prefix)
 * rather than editing in place, so cached derivatives can't be served under a
 * name that now means something else.
 */

export interface PresetSyncResult {
  created: string[];
  allowed: string[];
  failed: Array<{ name: string; error: string }>;
  total: number;
}

interface NamedTransformation {
  name: string;
  allowed_for_strict?: boolean;
}

const listNamedTransformations = async (): Promise<Map<string, NamedTransformation>> => {
  const existing = new Map<string, NamedTransformation>();
  let cursor: string | undefined;
  do {
    const page: { transformations?: NamedTransformation[]; next_cursor?: string } = await cloudinary.api.transformations({
      named: true,
      max_results: 500,
      ...(cursor ? { next_cursor: cursor } : {}),
    });
    for (const t of page.transformations || []) {
      // Listed as "t_<name>".
      existing.set(t.name.replace(/^t_/, ''), t);
    }
    cursor = page.next_cursor;
  } while (cursor);
  return existing;
};

const errorMessage = (error: unknown): string =>
  (error as { error?: { message?: string } })?.error?.message || (error as Error)?.message || String(error);

export const syncCloudinaryPresets = async (): Promise<PresetSyncResult> => {
  const definitions = buildPresetDefinitions();
  const result: PresetSyncResult = { created: [], allowed: [], failed: [], total: Object.keys(definitions).length };

  const existing = await listNamedTransformations();

  for (const [name, definition] of Object.entries(definitions)) {
    try {
      const current = existing.get(name);
      if (!current) {
        await cloudinary.api.create_transformation(name, definition);
        result.created.push(name);
      }
      if (!current?.allowed_for_strict) {
        await cloudinary.api.update_transformation(name, { allowed_for_strict: true });
        result.allowed.push(name);
      }
    } catch (error) {
      result.failed.push({ name, error: errorMessage(error) });
    }
  }

  return result;
};

/** Startup wrapper: never throws, logs a one-line summary. */
export const syncCloudinaryPresetsOnStartup = async (): Promise<void> => {
  if (!process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    mediaLogger.warn('⚠️  Cloudinary credentials missing — skipping delivery preset sync');
    return;
  }
  try {
    const r = await syncCloudinaryPresets();
    if (r.created.length || r.allowed.length || r.failed.length) {
      mediaLogger.info(
        `🎛️  Cloudinary presets: ${r.created.length} created, ${r.allowed.length} allowed for strict, ${r.failed.length} failed (of ${r.total})`
      );
    }
    for (const f of r.failed) mediaLogger.error(`❌ Cloudinary preset ${f.name}: ${f.error}`);
  } catch (error) {
    mediaLogger.error('❌ Cloudinary preset sync failed — images may not load with strict transformations on:', error);
  }
};
