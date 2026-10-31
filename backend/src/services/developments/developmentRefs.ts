/**
 * Resolving client-supplied references inside a development.
 *
 * The client speaks encoded ids (the global toJSON and the per-model
 * transforms encode every reference), but a body field typed as ObjectId is
 * cast by Mongoose, which rejects a 16-character encoded id with a CastError —
 * a 500 before this helper existed. Every id that arrives in a body or query
 * goes through here: decoded, validated, and proven to belong to the
 * development in the route. That last check is what stops a member of
 * development A from creating a unit inside development B's building.
 */
import mongoose from 'mongoose';
import { resolveId } from '../../utils/idObfuscation';
import { isValidObjectId } from '../../utils/validateParams';
import { ValidationError } from './developmentService';
import { NotFoundError } from './developmentListingService';

/** A raw or encoded id as an ObjectId, or null when it is neither. */
export const toObjectId = (raw: unknown): mongoose.Types.ObjectId | null => {
  if (raw instanceof mongoose.Types.ObjectId) return raw;
  if (typeof raw !== 'string' || !raw.trim()) return null;
  const hex = resolveId(raw.trim());
  return hex && isValidObjectId(hex) ? new mongoose.Types.ObjectId(hex) : null;
};

/** Like toObjectId, but a malformed id is a 400 naming the field. */
export const requireObjectId = (raw: unknown, field: string): mongoose.Types.ObjectId => {
  const id = toObjectId(raw);
  if (!id) throw new ValidationError(`A valid ${field} is required`, { code: 'FIELD_INVALID', field });
  return id;
};

/**
 * Load a live (non-deleted) document of `model` by a client id and prove it
 * belongs to `developmentId`. 400 for a malformed id, 404 when it does not
 * exist in this development — never revealing that it exists elsewhere.
 */
export const requireRefInDevelopment = async <T>(
  model: mongoose.Model<T>,
  raw: unknown,
  developmentId: mongoose.Types.ObjectId | string,
  field: string
): Promise<mongoose.HydratedDocument<T>> => {
  const id = requireObjectId(raw, field);
  const doc = await model.findOne({ _id: id, developmentId, deletedAt: null } as mongoose.FilterQuery<T>);
  if (!doc) throw new NotFoundError(`${field} not found in this development`, { code: 'REF_NOT_FOUND', field });
  return doc;
};
