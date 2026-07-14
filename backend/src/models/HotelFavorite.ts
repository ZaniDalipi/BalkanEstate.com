import mongoose, { Document, Schema } from 'mongoose';

export interface IHotelFavorite extends Document {
  userId: mongoose.Types.ObjectId;
  hotelId: mongoose.Types.ObjectId;
  createdAt: Date;
}

const HotelFavoriteSchema: Schema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    hotelId: {
      type: Schema.Types.ObjectId,
      ref: 'Hotel',
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// One favourite per user per hotel
HotelFavoriteSchema.index({ userId: 1, hotelId: 1 }, { unique: true });

export default mongoose.model<IHotelFavorite>('HotelFavorite', HotelFavoriteSchema);
