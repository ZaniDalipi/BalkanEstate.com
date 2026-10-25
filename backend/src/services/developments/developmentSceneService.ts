/**
 * Scenes ("views") of the interactive residence explorer.
 *
 * A scene is one camera perspective of a target (the development, a building,
 * or a floor) — an image with clickable hotspots. A target may have several
 * views, keyed by `viewKey` (unique per target among live scenes; legacy
 * single-view scenes are 'main').
 *
 * Editors mutate `draft`; visitors only ever see `published`, a snapshot taken
 * at publish time. Every write is scoped by the development in the route, so a
 * sceneId from another development is a 404, never a cross-tenant write.
 */
import mongoose from 'mongoose';
import Development from '../../models/Development';
import DevelopmentScene, { type IDevelopmentScene, type IHotspot } from '../../models/DevelopmentScene';
import DevelopmentBuilding from '../../models/DevelopmentBuilding';
import DevelopmentFloor from '../../models/DevelopmentFloor';
import DevelopmentUnit from '../../models/DevelopmentUnit';
import DevelopmentEntrance from '../../models/DevelopmentEntrance';
import Property from '../../models/Property';
import Agency from '../../models/Agency';
import type { IUser } from '../../models/User';
import { encodeId } from '../../utils/idObfuscation';
import { createLogger } from '../../utils/logger';
import { uploadImage, deleteImage, isMediaStorageConfigured } from '../mediaService';
import {
  SCENE_TARGET_TYPES,
  HOTSPOT_SHAPES,
  HOTSPOT_LINK_TYPES,
  SCENE_VIEW_DIRECTIONS,
  SCENE_VIEW_KEY_PATTERN,
  DEFAULT_SCENE_VIEW_KEY,
  MAX_HOTSPOTS_PER_SCENE,
  MAX_POINTS_PER_SCENE,
  isSceneViewDirection,
  roleHasPermission,
  type DevelopmentRole,
  type HotspotLinkType,
  type HotspotShape,
  type SceneTargetType,
  type SceneViewDirection,
} from '../../config/developments';
import { validateHotspotGeometry, type HotspotGeometryError } from './hotspotGeometry';
import { recordDevelopmentAudit, diffFields } from './developmentAudit';
import { toObjectId, requireObjectId, requireRefInDevelopment } from './developmentRefs';
import { ValidationError } from './developmentService';
import { AuthorizationError, NotFoundError } from './developmentListingService';
import { publicResidenceFilter } from './billing/publicResidenceFilter';

const log = createLogger('DevelopmentSceneService');

type Id = mongoose.Types.ObjectId;

export const MAX_HOTSPOT_ID_LENGTH = 64;
export const MAX_HOTSPOT_LABEL_LENGTH = 80;
export const MAX_VIEW_NAME_LENGTH = 80;
export const MAX_SORT_ORDER = 999; // the model's bound
/** Relative aspect-ratio change above which a replacement image may misalign regions. */
export const ASPECT_CHANGE_THRESHOLD = 0.01;

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

/**
 * One rejected hotspot. Mirrors the frontend `HotspotIssue`; `field` names the
 * offending property for the editor. `invalid_id` / `invalid_label` cover the
 * id and label rules, which the frontend union does not list yet.
 */
export type HotspotIssueCode =
  | HotspotGeometryError
  | 'invalid_link_type'
  | 'missing_link'
  | 'link_not_found'
  | 'invalid_shape'
  | 'too_many_hotspots'
  | 'invalid_id'
  | 'invalid_label';

export interface HotspotIssue {
  index: number;
  hotspotId?: string;
  field: string;
  code: HotspotIssueCode;
  message: string;
}

/** 400 { message, errors: HotspotIssue[] } via sendServiceError. */
export class HotspotValidationError extends Error {
  readonly statusCode = 400;
  constructor(public readonly errors: HotspotIssue[]) {
    super(`${errors.length} hotspot issue${errors.length === 1 ? '' : 's'} must be fixed`);
    this.name = 'HotspotValidationError';
  }
}

/** 409 { message, code: 'version_conflict', currentVersion }. */
export class SceneVersionConflictError extends Error {
  readonly statusCode = 409;
  readonly code = 'version_conflict';
  constructor(public readonly currentVersion: number) {
    super('This view was changed by someone else. Reload it and try again.');
    this.name = 'SceneVersionConflictError';
  }
}

/** 409 when another live view of the same target already uses a viewKey. */
export class ViewKeyTakenError extends Error {
  readonly statusCode = 409;
  readonly code = 'view_key_taken';
  constructor(viewKey: string) {
    super(`A view with key "${viewKey}" already exists for this target`);
    this.name = 'ViewKeyTakenError';
  }
}

/** 500 when no media storage is configured (kept from the original controller). */
class MediaNotConfiguredError extends Error {
  readonly statusCode = 500;
  constructor() {
    super('Image upload service not configured');
  }
}

const isDuplicateKey = (error: unknown): boolean =>
  !!error && typeof error === 'object' && (error as { code?: unknown }).code === 11000;

// ---------------------------------------------------------------------------
// Small parsers
// ---------------------------------------------------------------------------

const isSceneTarget = (v: unknown): v is SceneTargetType =>
  typeof v === 'string' && (SCENE_TARGET_TYPES as readonly string[]).includes(v);
const isShape = (v: unknown): v is HotspotShape =>
  typeof v === 'string' && (HOTSPOT_SHAPES as readonly string[]).includes(v);
const isLinkType = (v: unknown): v is HotspotLinkType =>
  typeof v === 'string' && (HOTSPOT_LINK_TYPES as readonly string[]).includes(v);

const isBlank = (v: unknown): boolean => v === undefined || v === null || v === '';

const parseViewKey = (raw: unknown): string => {
  if (isBlank(raw)) return DEFAULT_SCENE_VIEW_KEY;
  const key = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
  if (!SCENE_VIEW_KEY_PATTERN.test(key)) {
    throw new ValidationError(
      'viewKey must be 1–40 lowercase letters, digits or hyphens, starting with a letter or digit'
    );
  }
  return key;
};

/** undefined = not supplied; null = clear. */
const parseViewName = (raw: unknown): string | null | undefined => {
  if (raw === undefined) return undefined;
  if (raw === null) return null;
  if (typeof raw !== 'string') throw new ValidationError('viewName must be a string');
  const name = raw.trim();
  if (name.length > MAX_VIEW_NAME_LENGTH) {
    throw new ValidationError(`viewName must be at most ${MAX_VIEW_NAME_LENGTH} characters`);
  }
  return name || null;
};

const parseViewDirection = (raw: unknown): SceneViewDirection | undefined => {
  if (isBlank(raw)) return undefined;
  if (!isSceneViewDirection(raw)) {
    throw new ValidationError(`viewDirection must be one of: ${SCENE_VIEW_DIRECTIONS.join(', ')}`);
  }
  return raw;
};

/** Accepts a number or a numeric string (multipart bodies are all strings). */
const parseSortOrder = (raw: unknown): number | undefined => {
  if (isBlank(raw)) return undefined;
  const n = typeof raw === 'string' && /^\s*\d+\s*$/.test(raw) ? Number(raw) : raw;
  if (typeof n !== 'number' || !Number.isInteger(n) || n < 0 || n > MAX_SORT_ORDER) {
    throw new ValidationError(`sortOrder must be an integer between 0 and ${MAX_SORT_ORDER}`);
  }
  return n;
};

const parseBool = (raw: unknown): boolean => raw === true || raw === 'true' || raw === '1';

const aspectChangedBetween = (oldW: number, oldH: number, newW: number, newH: number): boolean => {
  if (!oldW || !oldH || !newW || !newH) return false;
  const oldAspect = oldW / oldH;
  return Math.abs(oldAspect - newW / newH) / oldAspect > ASPECT_CHANGE_THRESHOLD;
};

/** Live-scene lookup, always scoped to the development in the route. */
const liveSceneFilter = (developmentId: Id, sceneId: unknown) => ({
  _id: requireObjectId(sceneId, 'sceneId'),
  developmentId,
  deletedAt: null,
});

const loadScene = async (developmentId: Id, sceneId: unknown) => {
  const scene = await DevelopmentScene.findOne(liveSceneFilter(developmentId, sceneId));
  if (!scene) throw new NotFoundError('Scene not found');
  return scene;
};

// ---------------------------------------------------------------------------
// Target resolution
// ---------------------------------------------------------------------------

/**
 * Resolve the (targetType, targetId) a scene belongs to, proving the target is
 * a live part of this development. A development-level view's target is the
 * development itself; any other id there is a 404.
 */
const resolveTargetInDevelopment = async (
  developmentId: Id,
  targetType: unknown,
  rawTargetId: unknown
): Promise<{ targetType: SceneTargetType; targetId: Id }> => {
  if (!isSceneTarget(targetType)) {
    throw new ValidationError(`targetType must be one of: ${SCENE_TARGET_TYPES.join(', ')}`);
  }
  if (targetType === 'development') {
    if (!isBlank(rawTargetId)) {
      const id = requireObjectId(rawTargetId, 'targetId');
      if (!id.equals(developmentId)) throw new NotFoundError('targetId not found in this development');
    }
    return { targetType, targetId: developmentId };
  }
  const model = (targetType === 'building' ? DevelopmentBuilding : DevelopmentFloor) as mongoose.Model<unknown>;
  const doc = await requireRefInDevelopment(model, rawTargetId, developmentId, 'targetId');
  return { targetType, targetId: doc._id as Id };
};

// ---------------------------------------------------------------------------
// Hotspot validation
// ---------------------------------------------------------------------------

const GEOMETRY_MESSAGES: Record<HotspotGeometryError, string> = {
  non_finite: 'Points must be [x, y] pairs of finite numbers',
  out_of_bounds: 'Every point must lie inside the image (0–1)',
  invalid_rect: 'A rectangle needs exactly two opposite corners',
  too_few_points: 'A polygon needs at least 3 points',
  too_many_points: 'A polygon has too many points',
  duplicate_points: 'A polygon has duplicate points',
  zero_area: 'The region is too small',
  self_intersecting: 'The polygon crosses itself',
};

type LinkCheck = 'draft' | 'publish';

interface ValidateContext {
  developmentId: Id;
  /** The caller — new listing links must be listings they control (or attached here). */
  user?: IUser;
  /** Listing ids (hex) already accepted on this scene; they only need to still exist. */
  grandfatheredListingIds?: Set<string>;
  mode: LinkCheck;
}

interface PendingLink {
  index: number;
  hotspotId: string;
  linkType: HotspotLinkType;
  hex: string;
}

/** Linkable entity models, by linkType (listing is handled separately). */
const ENTITY_MODELS: Record<Exclude<HotspotLinkType, 'listing'>, mongoose.Model<any>> = {
  unit: DevelopmentUnit,
  building: DevelopmentBuilding,
  floor: DevelopmentFloor,
  entrance: DevelopmentEntrance,
};

const groupHexIds = <T extends { linkType: HotspotLinkType; hex: string }>(items: T[]) => {
  const byType = new Map<HotspotLinkType, Set<string>>();
  for (const item of items) {
    if (!byType.has(item.linkType)) byType.set(item.linkType, new Set());
    byType.get(item.linkType)!.add(item.hex);
  }
  return byType;
};

const toOids = (hexes: Iterable<string>): Id[] => [...hexes].map((h) => new mongoose.Types.ObjectId(h));

/** The listing ids (hex) among `hexes` that are attached to a live unit of this development. */
const listingsAttachedHere = async (developmentId: Id, hexes: string[]): Promise<Set<string>> => {
  if (hexes.length === 0) return new Set();
  const units = await DevelopmentUnit.find({
    developmentId,
    deletedAt: null,
    listingIds: { $in: toOids(hexes) },
  })
    .select('listingIds')
    .lean();
  const wanted = new Set(hexes);
  const attached = new Set<string>();
  for (const u of units) {
    for (const id of u.listingIds ?? []) if (wanted.has(String(id))) attached.add(String(id));
  }
  return attached;
};

/**
 * Batched form of developmentListingService.callerControlsListing: the caller
 * is the seller, or owns/admins the agency that created the listing.
 */
const listingsControlledBy = async (
  user: IUser,
  properties: Array<{ _id: unknown; sellerId?: unknown; createdByAgencyId?: unknown }>
): Promise<Set<string>> => {
  const userId = String(user._id);
  const controlled = new Set<string>();
  const agencyIds = new Set<string>();
  for (const p of properties) {
    if (String(p.sellerId) === userId) controlled.add(String(p._id));
    else if (p.createdByAgencyId) agencyIds.add(String(p.createdByAgencyId));
  }
  if (agencyIds.size === 0) return controlled;
  const agencies = await Agency.find({ _id: { $in: toOids(agencyIds) } })
    .select('ownerId admins')
    .lean();
  const managed = new Set(
    agencies
      .filter(
        (a) => String(a.ownerId) === userId || (a.admins ?? []).some((admin) => String(admin) === userId)
      )
      .map((a) => String(a._id))
  );
  for (const p of properties) {
    if (p.createdByAgencyId && managed.has(String(p.createdByAgencyId))) controlled.add(String(p._id));
  }
  return controlled;
};

/** Hex ids (per link type) that the editor is allowed to link to. One query per type. */
const resolveAllowedLinks = async (
  pending: PendingLink[],
  ctx: ValidateContext
): Promise<Map<HotspotLinkType, Set<string>>> => {
  const allowed = new Map<HotspotLinkType, Set<string>>();
  const byType = groupHexIds(pending);

  await Promise.all(
    [...byType.entries()].map(async ([linkType, hexes]) => {
      if (linkType !== 'listing') {
        const docs = await ENTITY_MODELS[linkType]
          .find({ _id: { $in: toOids(hexes) }, developmentId: ctx.developmentId, deletedAt: null })
          .select('_id')
          .lean();
        allowed.set(linkType, new Set(docs.map((d: { _id: unknown }) => String(d._id))));
        return;
      }

      const properties = await Property.find({ _id: { $in: toOids(hexes) } })
        .select('_id sellerId createdByAgencyId')
        .lean();
      const existing = properties.map((p) => String(p._id));
      if (ctx.mode === 'publish') {
        // Every draft link was authorized when it was saved; publishing only
        // proves the listing still exists.
        allowed.set('listing', new Set(existing));
        return;
      }
      const ok = new Set<string>();
      const needsCheck = properties.filter((p) => {
        if (ctx.grandfatheredListingIds?.has(String(p._id))) {
          ok.add(String(p._id));
          return false;
        }
        return true;
      });
      if (needsCheck.length > 0) {
        const [attached, controlled] = await Promise.all([
          listingsAttachedHere(ctx.developmentId, needsCheck.map((p) => String(p._id))),
          ctx.user ? listingsControlledBy(ctx.user, needsCheck) : Promise.resolve(new Set<string>()),
        ]);
        for (const p of needsCheck) {
          const id = String(p._id);
          if (attached.has(id) || controlled.has(id)) ok.add(id);
        }
      }
      allowed.set('listing', ok);
    })
  );
  return allowed;
};

/**
 * Validate an editor's hotspot array. Geometry is REJECTED, never clamped.
 * Returns the normalised hotspots (linkId encoded) or throws a
 * HotspotValidationError listing every issue.
 */
export const validateHotspots = async (raw: unknown, ctx: ValidateContext): Promise<IHotspot[]> => {
  if (!Array.isArray(raw)) throw new ValidationError('hotspots must be an array');
  if (raw.length > MAX_HOTSPOTS_PER_SCENE) {
    throw new HotspotValidationError([
      {
        index: MAX_HOTSPOTS_PER_SCENE,
        field: 'hotspots',
        code: 'too_many_hotspots',
        message: `A view can hold at most ${MAX_HOTSPOTS_PER_SCENE} regions`,
      },
    ]);
  }

  const totalPoints = raw.reduce<number>((n, item) => {
    const pts = item && typeof item === 'object' ? (item as { points?: unknown }).points : undefined;
    return n + (Array.isArray(pts) ? pts.length : 0);
  }, 0);
  if (totalPoints > MAX_POINTS_PER_SCENE) {
    throw new HotspotValidationError([
      {
        index: 0,
        field: 'points',
        code: 'too_many_hotspots',
        message: `A view can hold at most ${MAX_POINTS_PER_SCENE} points in total`,
      },
    ]);
  }

  const issues: HotspotIssue[] = [];
  const clean: Array<IHotspot | null> = [];
  const pending: PendingLink[] = [];
  const seenIds = new Set<string>();

  raw.forEach((item, index) => {
    const o = (item && typeof item === 'object' && !Array.isArray(item) ? item : {}) as Record<string, unknown>;
    const hotspotId = typeof o.id === 'string' ? o.id.trim() : '';
    const ref = hotspotId ? { hotspotId: hotspotId.slice(0, MAX_HOTSPOT_ID_LENGTH) } : {};
    const issue = (field: string, code: HotspotIssueCode, message: string) =>
      issues.push({ index, ...ref, field, code, message });
    const before = issues.length;

    if (!hotspotId || hotspotId.length > MAX_HOTSPOT_ID_LENGTH) {
      issue('id', 'invalid_id', `Region id must be 1–${MAX_HOTSPOT_ID_LENGTH} characters`);
    } else if (seenIds.has(hotspotId)) {
      issue('id', 'invalid_id', 'Region id is used twice in this view');
    } else {
      seenIds.add(hotspotId);
    }

    let label: string | undefined;
    if (o.label !== undefined && o.label !== null) {
      if (typeof o.label !== 'string' || o.label.trim().length > MAX_HOTSPOT_LABEL_LENGTH) {
        issue('label', 'invalid_label', `Label must be text of at most ${MAX_HOTSPOT_LABEL_LENGTH} characters`);
      } else {
        label = o.label.trim() || undefined;
      }
    }

    const shape = o.shape;
    if (!isShape(shape)) {
      issue('shape', 'invalid_shape', `Shape must be one of: ${HOTSPOT_SHAPES.join(', ')}`);
    } else {
      const geometry = validateHotspotGeometry(shape, o.points);
      if (!geometry.isValid && geometry.error) issue('points', geometry.error, GEOMETRY_MESSAGES[geometry.error]);
    }

    const linkType = o.linkType;
    let hex: string | null = null;
    if (!isLinkType(linkType)) {
      issue('linkType', 'invalid_link_type', `Link type must be one of: ${HOTSPOT_LINK_TYPES.join(', ')}`);
    } else if (typeof o.linkId !== 'string' || !o.linkId.trim()) {
      issue('linkId', 'missing_link', 'Choose what this region links to');
    } else {
      const oid = toObjectId(o.linkId);
      if (!oid) issue('linkId', 'link_not_found', 'The linked item does not exist in this development');
      else hex = oid.toHexString();
    }

    if (issues.length > before) {
      clean.push(null);
      return;
    }
    if (hex && isLinkType(linkType)) pending.push({ index, hotspotId, linkType, hex });
    clean.push({
      id: hotspotId,
      shape: shape as HotspotShape,
      points: (o.points as number[][]).map((p) => [p[0], p[1]]),
      ...(label ? { label } : {}),
      linkType: linkType as HotspotLinkType,
      linkId: hex ? encodeId(hex) : '',
      z: typeof o.z === 'number' && Number.isFinite(o.z) ? o.z : 0,
    });
  });

  if (pending.length > 0) {
    const allowed = await resolveAllowedLinks(pending, ctx);
    for (const p of pending) {
      if (!allowed.get(p.linkType)?.has(p.hex)) {
        issues.push({
          index: p.index,
          hotspotId: p.hotspotId,
          field: 'linkId',
          code: 'link_not_found',
          message:
            p.linkType === 'listing'
              ? 'The linked listing does not exist, or you cannot link it'
              : `The linked ${p.linkType} does not exist in this development`,
        });
      }
    }
  }

  if (issues.length > 0) {
    issues.sort((a, b) => a.index - b.index);
    throw new HotspotValidationError(issues);
  }
  return clean as IHotspot[];
};

const listingHexIds = (hotspots: IHotspot[] | undefined): string[] =>
  (hotspots ?? [])
    .filter((h) => h.linkType === 'listing')
    .map((h) => toObjectId(h.linkId)?.toHexString())
    .filter((h): h is string => !!h);

/** Match a draft version, treating a legacy document without one as version 0. */
const draftVersionFilter = (version: number) =>
  version === 0 ? { 'draft.version': { $in: [0, null] } } : { 'draft.version': version };

// ---------------------------------------------------------------------------
// Dashboard operations
// ---------------------------------------------------------------------------

export interface SceneActor {
  developmentId: Id;
  developmentName?: string;
  user: IUser;
  role?: DevelopmentRole;
}

export interface UpsertSceneImageInput {
  file?: { buffer: Buffer } | null;
  body: Record<string, unknown>;
}

/**
 * POST /scenes — upload or replace the image of the view (target, viewKey).
 * A new viewKey creates a view; an existing one replaces its image in place.
 */
export const upsertSceneImage = async (
  actor: SceneActor,
  input: UpsertSceneImageInput
): Promise<{ scene: IDevelopmentScene; aspectChanged: boolean; created: boolean }> => {
  // The route enforces scene.edit; uploading media is its own permission.
  if (actor.role && !roleHasPermission(actor.role, 'media.upload')) {
    throw new AuthorizationError('You do not have permission to upload media for this development');
  }
  if (!input.file) throw new ValidationError('No file uploaded');
  const body = input.body ?? {};
  const viewKey = parseViewKey(body.viewKey);
  const viewName = parseViewName(body.viewName);
  const viewDirection = parseViewDirection(body.viewDirection);
  const sortOrder = parseSortOrder(body.sortOrder);
  const clearHotspots = parseBool(body.clearHotspots);
  const { targetType, targetId } = await resolveTargetInDevelopment(
    actor.developmentId,
    body.targetType,
    body.targetId
  );
  if (!isMediaStorageConfigured()) throw new MediaNotConfiguredError();

  const uploaded = await uploadImage(input.file.buffer, {
    userId: String(actor.user._id),
    developmentId: String(actor.developmentId),
    developmentName: actor.developmentName,
    type: 'development-scene',
    maxWidth: 2560,
    maxHeight: 2560,
    preserveQuality: true,
  });
  const discardUpload = async () => {
    try {
      await deleteImage(uploaded.publicId);
    } catch (err) {
      log.warn('Could not delete orphaned scene image:', err);
    }
  };

  const key = { developmentId: actor.developmentId, targetType, targetId, viewKey, deletedAt: null };
  try {
    const existing = await DevelopmentScene.findOne(key);
    if (existing) {
      const aspectChanged = aspectChangedBetween(
        existing.imageWidth,
        existing.imageHeight,
        uploaded.width,
        uploaded.height
      );
      const oldPublicId = existing.imagePublicId;
      const set: Record<string, unknown> = {
        imageUrl: uploaded.url,
        imagePublicId: uploaded.publicId,
        imageWidth: uploaded.width,
        imageHeight: uploaded.height,
      };
      const unset: Record<string, 1> = {};
      if (viewName === null) unset.viewName = 1;
      else if (viewName !== undefined) set.viewName = viewName;
      if (viewDirection) set.viewDirection = viewDirection;
      if (sortOrder !== undefined) set.sortOrder = sortOrder;
      const update: mongoose.UpdateQuery<IDevelopmentScene> = { $set: set, $inc: { version: 1 } };
      if (clearHotspots) {
        set['draft.hotspots'] = [];
        (update.$inc as Record<string, number>)['draft.version'] = 1;
      }
      if (Object.keys(unset).length) update.$unset = unset;
      const scene = await DevelopmentScene.findOneAndUpdate({ _id: existing._id, ...key }, update, {
        new: true,
        runValidators: true,
      });
      if (!scene) throw new NotFoundError('Scene not found');
      if (oldPublicId && oldPublicId !== uploaded.publicId) {
        try {
          await deleteImage(oldPublicId);
        } catch (err) {
          log.warn('Could not delete old scene image:', err);
        }
      }
      await recordDevelopmentAudit({
        developmentId: actor.developmentId,
        action: 'scene.upload',
        actorId: actor.user._id as Id,
        targetType: 'scene',
        targetId: scene._id as Id,
        metadata: { viewKey, targetType, replaced: true, aspectChanged, clearHotspots },
      });
      return { scene, aspectChanged, created: false };
    }

    let scene: IDevelopmentScene;
    try {
      scene = await DevelopmentScene.create({
        developmentId: actor.developmentId,
        targetType,
        targetId,
        viewKey,
        ...(viewName ? { viewName } : {}),
        ...(viewDirection ? { viewDirection } : {}),
        ...(sortOrder !== undefined ? { sortOrder } : {}),
        imageUrl: uploaded.url,
        imagePublicId: uploaded.publicId,
        imageWidth: uploaded.width,
        imageHeight: uploaded.height,
        draft: { hotspots: [], version: 0 },
      });
    } catch (error) {
      // Lost a race with a concurrent upload of the same new view
      // (scene_per_target_view_unique).
      if (isDuplicateKey(error)) throw new ViewKeyTakenError(viewKey);
      throw error;
    }
    await recordDevelopmentAudit({
      developmentId: actor.developmentId,
      action: 'scene.upload',
      actorId: actor.user._id as Id,
      targetType: 'scene',
      targetId: scene._id as Id,
      metadata: { viewKey, targetType, replaced: false },
    });
    return { scene, aspectChanged: false, created: true };
  } catch (error) {
    await discardUpload();
    throw error;
  }
};

export const listScenes = (developmentId: Id) =>
  DevelopmentScene.find({ developmentId, deletedAt: null }).sort({ updatedAt: -1 });

export const getScene = (developmentId: Id, sceneId: unknown) => loadScene(developmentId, sceneId);

/** PATCH /scenes/:sceneId — view name, direction, order. */
export const updateSceneMeta = async (
  actor: SceneActor,
  sceneId: unknown,
  body: Record<string, unknown>
): Promise<IDevelopmentScene> => {
  const filter = liveSceneFilter(actor.developmentId, sceneId);
  const viewName = parseViewName(body?.viewName);
  const viewDirection = parseViewDirection(body?.viewDirection);
  const sortOrder = parseSortOrder(body?.sortOrder);

  const before = await DevelopmentScene.findOne(filter);
  if (!before) throw new NotFoundError('Scene not found');

  const set: Record<string, unknown> = {};
  const unset: Record<string, 1> = {};
  if (viewName === null) unset.viewName = 1;
  else if (viewName !== undefined) set.viewName = viewName;
  if (viewDirection) set.viewDirection = viewDirection;
  if (sortOrder !== undefined) set.sortOrder = sortOrder;
  if (!Object.keys(set).length && !Object.keys(unset).length) return before;

  const scene = await DevelopmentScene.findOneAndUpdate(
    filter,
    { ...(Object.keys(set).length ? { $set: set } : {}), ...(Object.keys(unset).length ? { $unset: unset } : {}) },
    { new: true, runValidators: true }
  );
  if (!scene) throw new NotFoundError('Scene not found');

  const fields = ['viewName', 'viewDirection', 'sortOrder'] as const;
  const pick = (s: IDevelopmentScene) => ({ viewName: s.viewName, viewDirection: s.viewDirection, sortOrder: s.sortOrder });
  const changes = diffFields(pick(before), pick(scene), fields);
  if (Object.keys(changes).length) {
    await recordDevelopmentAudit({
      developmentId: actor.developmentId,
      action: 'scene.update',
      actorId: actor.user._id as Id,
      targetType: 'scene',
      targetId: scene._id as Id,
      metadata: { viewKey: scene.viewKey, changes },
    });
  }
  return scene;
};

/** PATCH /scenes/:sceneId/draft — replace the draft hotspots (optimistic concurrency). */
export const saveDraft = async (
  actor: SceneActor,
  sceneId: unknown,
  body: Record<string, unknown>
): Promise<IDevelopmentScene> => {
  const filter = liveSceneFilter(actor.developmentId, sceneId);
  const rawBase = body?.baseVersion;
  if (!isBlank(rawBase) && (typeof rawBase !== 'number' || !Number.isInteger(rawBase) || rawBase < 0)) {
    throw new ValidationError('baseVersion must be a non-negative integer');
  }
  if (!Array.isArray(body?.hotspots)) throw new ValidationError('hotspots must be an array');

  const scene = await DevelopmentScene.findOne(filter);
  if (!scene) throw new NotFoundError('Scene not found');
  const currentVersion = scene.draft?.version ?? 0;
  const expected = isBlank(rawBase) ? currentVersion : (rawBase as number);
  if (expected !== currentVersion) throw new SceneVersionConflictError(currentVersion);

  const hotspots = await validateHotspots(body.hotspots, {
    developmentId: actor.developmentId,
    user: actor.user,
    grandfatheredListingIds: new Set([
      ...listingHexIds(scene.draft?.hotspots),
      ...listingHexIds(scene.published?.hotspots),
    ]),
    mode: 'draft',
  });

  // The version guard makes concurrent saves from the same base serialise:
  // exactly one matches, every other one sees a conflict.
  const updated = await DevelopmentScene.findOneAndUpdate(
    { ...filter, ...draftVersionFilter(expected) },
    { $set: { 'draft.hotspots': hotspots, 'draft.version': expected + 1 } },
    { new: true, runValidators: true }
  );
  if (!updated) {
    const latest = await DevelopmentScene.findOne(filter).select('draft.version').lean();
    if (!latest) throw new NotFoundError('Scene not found');
    throw new SceneVersionConflictError(latest.draft?.version ?? 0);
  }

  await recordDevelopmentAudit({
    developmentId: actor.developmentId,
    action: 'scene.draft',
    actorId: actor.user._id as Id,
    targetType: 'scene',
    targetId: updated._id as Id,
    metadata: { viewKey: updated.viewKey, hotspotCount: hotspots.length, version: expected + 1 },
  });
  return updated;
};

/** POST /scenes/:sceneId/publish — re-validate links, then snapshot draft → published. */
export const publishScene = async (actor: SceneActor, sceneId: unknown): Promise<IDevelopmentScene> => {
  const filter = liveSceneFilter(actor.developmentId, sceneId);
  const scene = await DevelopmentScene.findOne(filter);
  if (!scene) throw new NotFoundError('Scene not found');

  const draftVersion = scene.draft?.version ?? 0;
  const plain = (scene.toObject().draft?.hotspots ?? []) as unknown[];
  // Linked entities may have been deleted since the draft was saved.
  const hotspots = await validateHotspots(plain, {
    developmentId: actor.developmentId,
    user: actor.user,
    mode: 'publish',
  });

  const publishedAt = new Date();
  const updated = await DevelopmentScene.findOneAndUpdate(
    { ...filter, ...draftVersionFilter(draftVersion) },
    {
      $set: {
        published: { hotspots, publishedAt, version: (scene.published?.version ?? 0) + 1 },
      },
      $inc: { version: 1 },
    },
    { new: true, runValidators: true }
  );
  if (!updated) {
    const latest = await DevelopmentScene.findOne(filter).select('draft.version').lean();
    if (!latest) throw new NotFoundError('Scene not found');
    throw new SceneVersionConflictError(latest.draft?.version ?? 0);
  }

  await recordDevelopmentAudit({
    developmentId: actor.developmentId,
    action: 'scene.publish',
    actorId: actor.user._id as Id,
    targetType: 'scene',
    targetId: updated._id as Id,
    metadata: {
      viewKey: updated.viewKey,
      hotspotCount: hotspots.length,
      draftVersion,
      publishedVersion: updated.published?.version,
    },
  });
  return updated;
};

/** POST /scenes/:sceneId/unpublish — visitors stop seeing the view. */
export const unpublishScene = async (actor: SceneActor, sceneId: unknown): Promise<IDevelopmentScene> => {
  const updated = await DevelopmentScene.findOneAndUpdate(
    liveSceneFilter(actor.developmentId, sceneId),
    { $unset: { published: 1 }, $inc: { version: 1 } },
    { new: true }
  );
  if (!updated) throw new NotFoundError('Scene not found');
  await recordDevelopmentAudit({
    developmentId: actor.developmentId,
    action: 'scene.unpublish',
    actorId: actor.user._id as Id,
    targetType: 'scene',
    targetId: updated._id as Id,
    metadata: { viewKey: updated.viewKey },
  });
  return updated;
};

/**
 * DELETE /scenes/:sceneId — soft delete (frees the viewKey: the unique index
 * only covers live scenes), then remove the image best-effort.
 */
export const deleteScene = async (actor: SceneActor, sceneId: unknown): Promise<void> => {
  const scene = await DevelopmentScene.findOneAndUpdate(
    liveSceneFilter(actor.developmentId, sceneId),
    { $set: { deletedAt: new Date() } },
    { new: true }
  );
  if (!scene) throw new NotFoundError('Scene not found');
  if (scene.imagePublicId) {
    try {
      await deleteImage(scene.imagePublicId);
    } catch (err) {
      log.warn('Could not delete scene image on delete:', err);
    }
  }
  await recordDevelopmentAudit({
    developmentId: actor.developmentId,
    action: 'scene.delete',
    actorId: actor.user._id as Id,
    targetType: 'scene',
    targetId: scene._id as Id,
    metadata: { viewKey: scene.viewKey, targetType: scene.targetType, wasPublished: !!scene.published },
  });
};

// ---------------------------------------------------------------------------
// Public views
// ---------------------------------------------------------------------------

/** Public facts about a listing a region links to (for the explorer's hover card). */
export interface PublicListingSummary {
  title?: string;
  price?: number;
  listingType?: 'sale' | 'rent';
  rentPeriod?: string;
  /** m² (net area when given, else the listing's main area). */
  area?: number;
  beds?: number;
  baths?: number;
  floorNumber?: number;
  totalFloors?: number;
  propertyType?: string;
  status?: string;
  imageUrl?: string;
}

export interface PublicHotspot {
  id: string;
  shape: HotspotShape;
  points: number[][];
  label?: string;
  linkType: HotspotLinkType;
  linkId: string;
  z: number;
  listing?: PublicListingSummary;
}

type ListingLean = {
  _id: unknown;
  title?: string;
  price?: number;
  listingType?: 'sale' | 'rent';
  rentPeriod?: string;
  netArea?: number;
  sqft?: number;
  beds?: number;
  baths?: number;
  floorNumber?: number;
  totalFloors?: number;
  propertyType?: string;
  status?: string;
  imageUrl?: string;
  images?: Array<{ url?: string }>;
};

const LISTING_SUMMARY_FIELDS =
  '_id title price listingType rentPeriod netArea sqft beds baths floorNumber totalFloors propertyType status imageUrl images';

const positive = (n: unknown): number | undefined => (typeof n === 'number' && Number.isFinite(n) && n > 0 ? n : undefined);

/** Only buyer-facing fields; no seller contact, ids or storage keys. */
const toListingSummary = (l: ListingLean): PublicListingSummary => {
  const s: PublicListingSummary = {
    title: l.title || undefined,
    price: positive(l.price),
    listingType: l.listingType,
    rentPeriod: l.listingType === 'rent' ? l.rentPeriod : undefined,
    area: positive(l.netArea) ?? positive(l.sqft),
    beds: typeof l.beds === 'number' ? l.beds : undefined,
    baths: typeof l.baths === 'number' ? l.baths : undefined,
    floorNumber: typeof l.floorNumber === 'number' ? l.floorNumber : undefined,
    totalFloors: positive(l.totalFloors),
    propertyType: l.propertyType,
    status: l.status,
    imageUrl: l.images?.find((i) => i?.url)?.url || l.imageUrl || undefined,
  };
  return Object.fromEntries(Object.entries(s).filter(([, v]) => v !== undefined)) as PublicListingSummary;
};

export interface PublicSceneView {
  viewKey: string;
  viewName?: string;
  viewDirection: SceneViewDirection;
  sortOrder: number;
  imageUrl: string;
  imageWidth: number;
  imageHeight: number;
  hotspots: PublicHotspot[];
}

export interface PublicSceneLegacy {
  targetType: SceneTargetType;
  imageUrl: string;
  imageWidth: number;
  imageHeight: number;
  hotspots: PublicHotspot[];
}

type LeanScene = {
  targetType: SceneTargetType;
  viewKey?: string;
  viewName?: string;
  viewDirection?: SceneViewDirection;
  sortOrder?: number;
  imageUrl: string;
  imageWidth: number;
  imageHeight: number;
  published?: { hotspots?: IHotspot[] } | null;
};

const findPublishedDevelopment = async (slug: unknown): Promise<Id> => {
  const dev = await Development.findOne({
    slug: String(slug || '').toLowerCase(),
    ...publicResidenceFilter(),
  })
    .select('_id')
    .lean();
  if (!dev) throw new NotFoundError('Development not found');
  return dev._id as Id;
};

/**
 * Parse a public (targetType, targetId). `strict` (the views endpoint) 404s a
 * target that is not a live part of the development; the legacy endpoint just
 * finds no scene for it.
 */
const resolvePublicTarget = async (
  developmentId: Id,
  rawType: unknown,
  rawTargetId: unknown,
  strict: boolean
): Promise<{ targetType: SceneTargetType; targetId: Id } | null> => {
  const targetType = isBlank(rawType) ? 'development' : rawType;
  if (!isSceneTarget(targetType)) throw new ValidationError('invalid targetType');
  if (targetType === 'development') return { targetType, targetId: developmentId };
  const targetId = requireObjectId(rawTargetId, 'targetId');
  if (!strict) return { targetType, targetId };
  const model = (targetType === 'building' ? DevelopmentBuilding : DevelopmentFloor) as mongoose.Model<any>;
  const exists = await model.exists({ _id: targetId, developmentId, deletedAt: null });
  if (!exists) throw new NotFoundError('View target not found');
  return { targetType, targetId };
};

/**
 * The published hotspots a visitor may see, across several scenes at once
 * (one query per link type): hidden/deleted units, entities outside this
 * development and draft or missing listings are stripped.
 */
const filterPublicHotspots = async (developmentId: Id, scenes: LeanScene[]): Promise<PublicHotspot[][]> => {
  const parsed = scenes.map((s) =>
    (s.published?.hotspots ?? []).map((h) => ({ h, hex: toObjectId(h.linkId)?.toHexString() ?? null }))
  );
  const items = parsed.flat().filter((x): x is { h: IHotspot; hex: string } => !!x.hex && isLinkType(x.h.linkType));
  const byType = groupHexIds(items.map((x) => ({ linkType: x.h.linkType, hex: x.hex })));

  const visible = new Map<HotspotLinkType, Set<string>>();
  const listingSummaries = new Map<string, PublicListingSummary>();
  await Promise.all(
    [...byType.entries()].map(async ([linkType, hexes]) => {
      let docs: Array<{ _id: unknown }>;
      if (linkType === 'listing') {
        const listings = await Property.find({ _id: { $in: toOids(hexes) }, status: { $ne: 'draft' } })
          .select(LISTING_SUMMARY_FIELDS)
          .lean<ListingLean[]>();
        for (const l of listings) listingSummaries.set(String(l._id), toListingSummary(l));
        docs = listings;
      } else {
        const query: Record<string, unknown> = { _id: { $in: toOids(hexes) }, developmentId, deletedAt: null };
        if (linkType === 'unit') query.visibility = { $ne: 'hidden' };
        docs = await ENTITY_MODELS[linkType].find(query).select('_id').lean();
      }
      visible.set(linkType, new Set(docs.map((d) => String(d._id))));
    })
  );

  return parsed.map((list) =>
    list
      .filter(({ h, hex }) => !!hex && visible.get(h.linkType)?.has(hex))
      .map(({ h, hex }) => ({
        id: h.id,
        shape: h.shape,
        points: h.points,
        ...(h.label ? { label: h.label } : {}),
        linkType: h.linkType,
        linkId: encodeId(hex as string),
        z: h.z ?? 0,
        ...(h.linkType === 'listing' && listingSummaries.has(hex as string)
          ? { listing: listingSummaries.get(hex as string) }
          : {}),
      }))
  );
};

const PUBLIC_SCENE_FIELDS =
  'targetType viewKey viewName viewDirection sortOrder imageUrl imageWidth imageHeight published.hotspots';

const publishedScenesOf = (developmentId: Id, targetType: SceneTargetType, targetId: Id) =>
  DevelopmentScene.find({
    developmentId,
    targetType,
    targetId,
    deletedAt: null,
    published: { $ne: null },
  })
    .select(PUBLIC_SCENE_FIELDS)
    .sort({ sortOrder: 1, viewKey: 1 })
    .lean<LeanScene[]>();

/** GET /api/developments/:slug/views — every published view of a target. */
export const listPublicViews = async (
  slug: unknown,
  query: { targetType?: unknown; targetId?: unknown }
): Promise<PublicSceneView[]> => {
  const developmentId = await findPublishedDevelopment(slug);
  const target = await resolvePublicTarget(developmentId, query.targetType, query.targetId, true);
  const scenes = await publishedScenesOf(developmentId, target!.targetType, target!.targetId);
  const hotspots = await filterPublicHotspots(developmentId, scenes);
  return scenes.map((s, i) => ({
    viewKey: s.viewKey ?? DEFAULT_SCENE_VIEW_KEY,
    ...(s.viewName ? { viewName: s.viewName } : {}),
    viewDirection: s.viewDirection ?? 'front',
    sortOrder: s.sortOrder ?? 0,
    imageUrl: s.imageUrl,
    imageWidth: s.imageWidth,
    imageHeight: s.imageHeight,
    hotspots: hotspots[i],
  }));
};

/**
 * GET /api/developments/:slug/scene (legacy, single view): the 'main' view of
 * the target, else its first published view by sortOrder. Same filtering.
 */
export const getPublishedScene = async (
  slug: unknown,
  query: { targetType?: unknown; targetId?: unknown }
): Promise<PublicSceneLegacy | null> => {
  const developmentId = await findPublishedDevelopment(slug);
  const target = await resolvePublicTarget(developmentId, query.targetType, query.targetId, false);
  const scenes = await publishedScenesOf(developmentId, target!.targetType, target!.targetId);
  const scene = scenes.find((s) => (s.viewKey ?? DEFAULT_SCENE_VIEW_KEY) === DEFAULT_SCENE_VIEW_KEY) ?? scenes[0];
  if (!scene) return null;
  const [hotspots] = await filterPublicHotspots(developmentId, [scene]);
  return {
    targetType: scene.targetType,
    imageUrl: scene.imageUrl,
    imageWidth: scene.imageWidth,
    imageHeight: scene.imageHeight,
    hotspots,
  };
};
