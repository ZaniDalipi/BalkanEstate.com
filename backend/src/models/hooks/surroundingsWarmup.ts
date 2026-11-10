/**
 * When a listing is created or its pin moves, work out its noise and traffic
 * in the background so its page shows them at once. Best-effort: the
 * warmer never throws and never holds up the save.
 */
import type { Schema } from 'mongoose';
import { warmSurroundings } from '../../services/surroundings/surroundingsWarmer';

const locationChanged = new WeakSet<object>();

export const registerSurroundingsWarmup = (schema: Schema): void => {
  schema.pre('save', function (next) {
    if (this.isNew || this.isModified('lat') || this.isModified('lng')) locationChanged.add(this);
    next();
  });

  schema.post('save', function (doc: { lat?: unknown; lng?: unknown }) {
    if (!locationChanged.has(this)) return;
    locationChanged.delete(this);
    warmSurroundings(doc.lat, doc.lng);
  });
};
