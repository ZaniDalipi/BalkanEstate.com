import mongoose, { Document, Schema } from 'mongoose';
import { SUPPORTED_CURRENCIES, type SupportedCurrency } from './Hotel';

// Lifecycle of a booking request. Guests create `pending`; the host moves it on.
export const BOOKING_STATUSES = ['pending', 'confirmed', 'declined', 'cancelled'] as const;
export type BookingStatus = typeof BOOKING_STATUSES[number];

export interface IHotelBooking extends Document {
  hotel: mongoose.Types.ObjectId;
  /** The host who owns the property — bookings are listed by owner. */
  owner: mongoose.Types.ObjectId;
  /** The signed-in guest who made the request, when available. */
  guest?: mongoose.Types.ObjectId;
  // Snapshot of the requested room (rooms are embedded and may change later).
  roomName: string;
  roomType?: string;
  checkIn: Date;
  checkOut: Date;
  nights: number;
  guests: number;
  pricePerNight: number;
  totalPrice: number;
  currency: SupportedCurrency;
  // Guest contact details so the host can follow up.
  guestName: string;
  guestPhone: string;
  guestEmail?: string;
  message?: string;
  status: BookingStatus;
  createdAt: Date;
  updatedAt: Date;
}

const HotelBookingSchema: Schema = new Schema(
  {
    hotel: { type: Schema.Types.ObjectId, ref: 'Hotel', required: true, index: true },
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    guest: { type: Schema.Types.ObjectId, ref: 'User' },
    roomName: { type: String, required: true, trim: true, maxlength: 120 },
    roomType: { type: String, trim: true, maxlength: 40 },
    checkIn: { type: Date, required: true },
    checkOut: { type: Date, required: true },
    nights: { type: Number, required: true, min: 1, max: 365 },
    guests: { type: Number, required: true, min: 1, max: 30 },
    pricePerNight: { type: Number, required: true, min: 0 },
    totalPrice: { type: Number, required: true, min: 0 },
    currency: {
      type: String,
      enum: { values: SUPPORTED_CURRENCIES, message: 'Invalid currency: {VALUE}' },
      default: 'EUR',
    },
    guestName: { type: String, required: true, trim: true, maxlength: 100 },
    guestPhone: { type: String, required: true, trim: true, maxlength: 30 },
    guestEmail: { type: String, trim: true, lowercase: true, maxlength: 100 },
    message: { type: String, trim: true, maxlength: 1000 },
    status: {
      type: String,
      enum: { values: BOOKING_STATUSES, message: 'Invalid status: {VALUE}' },
      default: 'pending',
      index: true,
    },
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

// Host dashboard query: newest requests for an owner first.
HotelBookingSchema.index({ owner: 1, createdAt: -1 });

export default mongoose.model<IHotelBooking>('HotelBooking', HotelBookingSchema);
