import mongoose, { Document, Schema } from 'mongoose';
import {
  SCENE_TARGET_TYPES,
  HOTSPOT_LINK_TYPES,
  HOTSPOT_SHAPES,
  type SceneTargetType,
  type HotspotLinkType,
  type HotspotShape,
} from '../config/developments';
import { encodeId } from '../utils/idObfuscation';

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

/**
 * Encode the ObjectId references so JSON responses speak the same obfuscated
 * ids as the rest of the API. The global toJSON transform only rewrites `_id`,
 * which left `targetId`/`developmentId` as raw ObjectIds — and the owner editor
 * matches a scene to its selected target by comparing `scene.targetId` against
 * the encoded building/floor/development id, so a raw value never matched and an
 * already-uploaded scene kept showing the empty upload prompt.
 */
DevelopmentSceneSchema.set('toJSON', {
  transform(_doc, ret: Record<string, unknown>) {
    if (ret._id) {
      ret.id = encodeId(String(ret._id));
      delete ret._id;
    }
    if (ret.developmentId) ret.developmentId = encodeId(String(ret.developmentId));
    if (ret.targetId) ret.targetId = encodeId(String(ret.targetId));
    if (ret.imageMediaId) ret.imageMediaId = encodeId(String(ret.imageMediaId));
    delete ret.__v;
    return ret;
  },
});

// One scene per (development, target). The visual editor edits exactly one
// scene per building facade / floor plan / development aerial.
DevelopmentSceneSchema.index(
  { developmentId: 1, targetType: 1, targetId: 1 },
  {
    unique: true,
    // `deletedAt: null` matches a missing field; MongoDB rejects `$exists: false`.
    partialFilterExpression: { deletedAt: null },
    name: 'scene_per_target_unique',
  }
);

export default mongoose.model<IDevelopmentScene>(
  'DevelopmentScene',
  DevelopmentSceneSchema
);
