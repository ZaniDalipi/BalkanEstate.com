import mongoose, { Document, Schema } from 'mongoose';

/**
 * A city panel in the home-page elastic gallery.
 *
 * Unlike `VillaDestination`, this collection is the **only** source of truth
 * for what the gallery shows: there is no built-in list to fall back on and no
 * seeded Cloudinary city library behind it. A panel exists because an admin
 * created it, and it carries a photo because an admin uploaded one — which is
 * why `imageUrl` is required rather than optional. A row that cannot be
 * rendered has no reason to exist, so the invariant is enforced here instead
 * of being patched over in the frontend.
 *
 * `searchQuery` is what the search page receives when a visitor opens a panel,
 * so it has to match how sellers actually write the place; it is not
 * decorative. It defaults to nothing — the admin form requires it.
 */
export interface ICityShowcase extends Document {
  city: string;
  country: string;
  searchQuery: string;
  imageUrl: string;
  /** Cloudinary public id, kept so a replaced image can be cleaned up. */
  imagePublicId?: string;
  displayOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CityShowcaseSchema = new Schema(
  {
    city: { type: String, required: true, trim: true, maxlength: 80 },
    country: { type: String, required: true, trim: true, maxlength: 60 },
    searchQuery: { type: String, required: true, trim: true, maxlength: 80 },
    // Required: the gallery has no fallback photo. See the note above.
    imageUrl: { type: String, required: true, trim: true },
    imagePublicId: { type: String, trim: true },
    displayOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// The public list is always "active, in display order".
CityShowcaseSchema.index({ isActive: 1, displayOrder: 1 });

export default mongoose.model<ICityShowcase>('CityShowcase', CityShowcaseSchema);
