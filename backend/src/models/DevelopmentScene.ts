import mongoose, { Document, Schema } from 'mongoose';
import {
  SCENE_TARGET_TYPES,
  HOTSPOT_LINK_TYPES,
  HOTSPOT_SHAPES,
  SCENE_VIEW_DIRECTIONS,
  SCENE_VIEW_KEY_PATTERN,
  DEFAULT_SCENE_VIEW_KEY,
  type SceneTargetType,
  type HotspotLinkType,
  type HotspotShape,
  type SceneViewDirection,
} from '../config/developments';
import { encodeRefsOnJSON } from '../utils/encodeRefsOnJSON';

/**
 * A visual-editor scene: an interactive image (aerial render, building facade,
 * or floor plan) with clickable hotspots laid over it.
 *
 * Hotspot coordinates are stored NORMALISED (0–1 of the source image's
 * intrinsic dimensions, origin top-left), so regions stay aligned no matter how
 * the image is scaled, panned, or fitted into a responsive container — the
 * renderer multiplies by the displayed size.
 *
 * `draft` is what the editor mutates; `published` is what visitors see.
 * Publishing snapshots draft → published with a version bump, so a visitor on
 * the previous published version is never interrupted mid-publish.
 */
export interface IHotspot {
  id: string;
  shape: HotspotShape;
  /** Polygon vertices (or the two corners of a rect), each [x, y] in 0–1. */
  points: number[][];
  label?: string;
  linkType: HotspotLinkType;
  linkId: string;
  z: number;
}

export interface ISceneVersion {
  hotspots: IHotspot[];
  publishedAt?: Date;
  version: number;
}

export interface IDevelopmentScene extends Document {
  developmentId: mongoose.Types.ObjectId;
  targetType: SceneTargetType;
  targetId: mongoose.Types.ObjectId;
  /**
   * A target (building, floor, site) can have several camera perspectives —
   * front, back, aerial, courtyard… Each is its own scene, keyed by `viewKey`
   * (unique per target). Legacy single-view scenes are `main`.
   */
  viewKey: string;
  viewName?: string;
  viewDirection: SceneViewDirection;
  /** Display order among the target's views (ascending). */
  sortOrder: number;
  imageMediaId?: mongoose.Types.ObjectId;
  /** Scene image URL + storage key (mirrors the cover-image pattern). */
  imageUrl: string;
  imagePublicId?: string;
  imageWidth: number;
  imageHeight: number;
  draft: ISceneVersion;
  published?: ISceneVersion;
  version: number;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const HotspotSchema = new Schema<IHotspot>(
  {
    id: { type: String, required: true },
    shape: { type: String, enum: HOTSPOT_SHAPES, required: true },
    points: {
      type: [[Number]],
      required: true,
      validate: {
        validator: (v: number[][]) =>
          Array.isArray(v) &&
          v.length >= 2 &&
          v.every(
            (p) =>
              Array.isArray(p) &&
              p.length === 2 &&
              p.every((n) => typeof n === 'number' && n >= 0 && n <= 1)
          ),
        message: 'Hotspot points must be [x,y] pairs normalised to 0–1',
      },
    },
    label: { type: String, trim: true, maxlength: 120 },
    linkType: { type: String, enum: HOTSPOT_LINK_TYPES, required: true },
    linkId: { type: String, required: true },
    z: { type: Number, default: 0 },
  },
  { _id: false }
);

const SceneVersionSchema = new Schema<ISceneVersion>(
  {
    hotspots: { type: [HotspotSchema], default: [] },
    publishedAt: { type: Date },
    version: { type: Number, default: 0 },
  },
  { _id: false }
);

const DevelopmentSceneSchema: Schema = new Schema(
  {
    developmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Development',
      required: true,
      index: true,
    },
    targetType: { type: String, enum: SCENE_TARGET_TYPES, required: true },
    targetId: { type: Schema.Types.ObjectId, required: true },
    viewKey: {
      type: String,
      required: true,
      default: DEFAULT_SCENE_VIEW_KEY,
      trim: true,
      lowercase: true,
      match: [SCENE_VIEW_KEY_PATTERN, 'viewKey must be a short lowercase slug'],
    },
    viewName: { type: String, trim: true, maxlength: 80 },
    viewDirection: { type: String, enum: SCENE_VIEW_DIRECTIONS, default: 'front' },
    sortOrder: { type: Number, default: 0, min: 0, max: 999 },
    imageMediaId: {
      type: Schema.Types.ObjectId,
      ref: 'MediaAsset',
    },
    imageUrl: { type: String, required: true },
    imagePublicId: { type: String },
    imageWidth: { type: Number, required: true, min: 1 },
    imageHeight: { type: Number, required: true, min: 1 },
    draft: { type: SceneVersionSchema, default: () => ({ hotspots: [], version: 0 }) },
    published: { type: SceneVersionSchema, default: undefined },
    version: { type: Number, default: 0 },
    deletedAt: { type: Date, index: true },
  },
  { timestamps: true }
);

// Encode every reference in JSON. The owner editor matches a scene to its
// selected target by comparing `scene.targetId` with the encoded building/floor
// id; a raw value never matched and an uploaded scene showed the empty prompt.
encodeRefsOnJSON(DevelopmentSceneSchema, ['developmentId', 'targetId', 'imageMediaId']);

// One scene per (development, target, view): a building may have a front,
// back, aerial… view, but never two "front" views.
// `deletedAt: null` matches a missing field; MongoDB rejects `$exists: false`.
// Supersedes the single-view index `scene_per_target_unique`, which
// scripts/migrateSceneViews.ts drops where it was ever built.
DevelopmentSceneSchema.index(
  { developmentId: 1, targetType: 1, targetId: 1, viewKey: 1 },
  {
    unique: true,
    partialFilterExpression: { deletedAt: null },
    name: 'scene_per_target_view_unique',
  }
);
// Reading every view of a target, in display order.
DevelopmentSceneSchema.index({ developmentId: 1, targetType: 1, targetId: 1, sortOrder: 1 });

export default mongoose.model<IDevelopmentScene>(
  'DevelopmentScene',
  DevelopmentSceneSchema
);
