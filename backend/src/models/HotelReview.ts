import mongoose, { Document, Schema } from 'mongoose';

// Optional Booking-style category sub-scores.
export const REVIEW_CATEGORIES = ['cleanliness', 'location', 'value', 'service'] as const;
export type ReviewCategory = typeof REVIEW_CATEGORIES[number];

export interface IHotelReview extends Document {
  hotel: mongoose.Types.ObjectId;
  guest: mongoose.Types.ObjectId;
  guestName: string;
  guestAvatar?: string;
  rating: number;
  comment?: string;
  cleanliness?: number;
  location?: number;
  value?: number;
  service?: number;
  createdAt: Date;
  updatedAt: Date;
}

const scoreField = { type: Number, min: 1, max: 5 };

const HotelReviewSchema: Schema = new Schema(
  {
    hotel: { type: Schema.Types.ObjectId, ref: 'Hotel', required: true, index: true },
    guest: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    guestName: { type: String, required: true, trim: true, maxlength: 100 },
    guestAvatar: { type: String },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, trim: true, maxlength: 2000 },
    cleanliness: scoreField,
    location: scoreField,
    value: scoreField,
    service: scoreField,
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc: any, ret: any) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// One review per guest per hotel (a guest can edit their existing review).
HotelReviewSchema.index({ hotel: 1, guest: 1 }, { unique: true });
HotelReviewSchema.index({ hotel: 1, createdAt: -1 });

export default mongoose.model<IHotelReview>('HotelReview', HotelReviewSchema);
