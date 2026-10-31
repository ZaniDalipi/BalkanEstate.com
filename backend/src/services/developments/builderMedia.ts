/**
 * The builder's logo and banner: uploaded through the media service (R2, sizes
 * made once at upload), replacing the previous image, which is then removed so
 * storage keeps no orphans.
 */
import type { IDevelopment } from '../../models/Development';
import { deleteImage, isMediaStorageConfigured, uploadImage } from '../mediaService';
import { createLogger } from '../../utils/logger';
import { ValidationError } from './developmentService';

const log = createLogger('BuilderMedia');

export const BUILDER_IMAGE_KINDS = ['logo', 'banner'] as const;
export type BuilderImageKind = (typeof BUILDER_IMAGE_KINDS)[number];

/** Largest stored size: a square logo, a wide banner. */
const SIZE: Record<BuilderImageKind, { maxWidth: number; maxHeight: number }> = {
  logo: { maxWidth: 600, maxHeight: 600 },
  banner: { maxWidth: 1920, maxHeight: 720 },
};

export class StorageUnavailableError extends Error {
  readonly statusCode = 503;
  readonly code = 'STORAGE_NOT_CONFIGURED';
  constructor() {
    super('Image upload service not configured');
  }
}

export const parseBuilderImageKind = (raw: unknown): BuilderImageKind => {
  if (typeof raw === 'string' && (BUILDER_IMAGE_KINDS as readonly string[]).includes(raw)) return raw as BuilderImageKind;
  throw new ValidationError('kind must be "logo" or "banner"', { code: 'FIELD_INVALID', field: 'kind' });
};

const removeStored = async (publicId: string | undefined): Promise<void> => {
  if (!publicId) return;
  try {
    await deleteImage(publicId);
  } catch (err) {
    log.warn('Could not delete an old builder image:', err);
  }
};

export async function setBuilderImage(development: IDevelopment, kind: BuilderImageKind, file: Buffer, userId: string): Promise<string> {
  if (!isMediaStorageConfigured()) throw new StorageUnavailableError();
  const result = await uploadImage(file, {
    userId,
    developmentId: String(development._id),
    developmentName: development.name,
    type: kind === 'logo' ? 'development-builder-logo' : 'development-builder-banner',
    ...SIZE[kind],
  });
  const previous = development.builder?.[kind]?.publicId;
  development.set(`builder.${kind}`, { url: result.url, publicId: result.publicId });
  await development.save();
  await removeStored(previous);
  return result.url;
}

export async function removeBuilderImage(development: IDevelopment, kind: BuilderImageKind): Promise<void> {
  const previous = development.builder?.[kind]?.publicId;
  if (!development.builder?.[kind]?.url) return;
  development.set(`builder.${kind}`, undefined);
  await development.save();
  await removeStored(previous);
}
