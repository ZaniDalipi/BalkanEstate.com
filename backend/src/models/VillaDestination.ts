import mongoose, { Document, Schema } from 'mongoose';

/**
 * A Balkan place showcased in the home-page villa destinations corridor.
 *
 * `imageUrl` is the photo shown on the card. It is optional on purpose: when
 * empty the frontend falls back to the Cloudinary city library seeded by
 * `scripts/seedCityImages.ts` (public id `city-{country}-{city}`), which is
 * how the feature shipped before admins could curate it. That fallback is why
 * a destination is still useful the moment it is created, before anyone
 * uploads anything.
 *
 * `query` is what gets sent to the villas page as the location search, so it
 * must match how sellers actually write the place — it is not decorative.
 */
export interface IVillaDestination extends Document {
  name: string;
  query: string;
  country: string;
  /** Curated photo. Falls back to the seeded city image when absent. */
  imageUrl?: string;
  /** Cloudinary public id, kept so a replaced image can be cleaned up. */
  imagePublicId?: string;
  /** Seeded city supplying the fallback photo. */
  imageCity?: string;
  imageCountry?: string;
  lat: number;
  lng: number;
  zoom: number;
  displayOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const VillaDestinationSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    query: { type: String, required: true, trim: true, maxlength: 80 },
    country: { type: String, required: true, trim: true, maxlength: 60 },
    imageUrl: { type: String, trim: true },
    imagePublicId: { type: String, trim: true },
    imageCity: { type: String, trim: true, maxlength: 80 },
    imageCountry: { type: String, trim: true, maxlength: 60 },
    // Real-world ranges, so a bad value can never fly the map off the planet.
    lat: { type: Number, required: true, min: -90, max: 90 },
    lng: { type: Number, required: true, min: -180, max: 180 },
    zoom: { type: Number, default: 12, min: 1, max: 20 },
    displayOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// The public list is always "active, in display order".
VillaDestinationSchema.index({ isActive: 1, displayOrder: 1 });

export default mongoose.model<IVillaDestination>('VillaDestination', VillaDestinationSchema);
