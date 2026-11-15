import mongoose, { Document, Schema } from 'mongoose';

/** One person who said they're coming. Guests sign up with name + email only. */
export interface IOpenHouseRsvp {
  _id: mongoose.Types.ObjectId;
  userId?: mongoose.Types.ObjectId;
  name: string;
  email: string;
  phone?: string;
  createdAt: Date;
  /** Reminders already sent, so the hourly job never sends one twice. */
  remindedDayBefore?: boolean;
  remindedSoon?: boolean;
}

/**
 * A time window when anyone may come and see a listing. Entirely optional:
 * a listing has none unless its owner adds one.
 */
export interface IOpenHouse extends Document {
  propertyId: mongoose.Types.ObjectId;
  hostId: mongoose.Types.ObjectId;
  startsAt: Date;
  endsAt: Date;
  note?: string;
  capacity?: number;
  status: 'scheduled' | 'cancelled';
  /** When people who saved the home were reminded (once, the day before). */
  favoritesRemindedAt?: Date;
  rsvps: mongoose.Types.DocumentArray<IOpenHouseRsvp & mongoose.Types.Subdocument>;
  createdAt: Date;
  updatedAt: Date;
}

const RsvpSchema = new Schema<IOpenHouseRsvp>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    name: { type: String, required: true, trim: true, maxlength: 200 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 254 },
    phone: { type: String, trim: true, maxlength: 30 },
    createdAt: { type: Date, default: Date.now },
    remindedDayBefore: { type: Boolean, default: false },
    remindedSoon: { type: Boolean, default: false },
  },
  { _id: true },
);

const OpenHouseSchema = new Schema<IOpenHouse>(
  {
    propertyId: { type: Schema.Types.ObjectId, ref: 'Property', required: true },
    hostId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    startsAt: { type: Date, required: true },
    endsAt: { type: Date, required: true },
    note: { type: String, trim: true, maxlength: 500 },
    capacity: { type: Number, min: 1, max: 500 },
    status: { type: String, enum: ['scheduled', 'cancelled'], default: 'scheduled' },
    favoritesRemindedAt: { type: Date },
    rsvps: { type: [RsvpSchema], default: [] },
  },
  { timestamps: true },
);

OpenHouseSchema.index({ propertyId: 1, startsAt: 1 });
OpenHouseSchema.index({ status: 1, startsAt: 1 });

export default mongoose.model<IOpenHouse>('OpenHouse', OpenHouseSchema);
