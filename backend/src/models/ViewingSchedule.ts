import mongoose, { Document, Schema } from 'mongoose';

export interface ITimeSlot {
  start: string; // HH:mm format (e.g., "09:00")
  end: string; // HH:mm format (e.g., "17:00")
}

export interface IWorkingDay {
  day: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
  enabled: boolean;
  slots: ITimeSlot[]; // Multiple time slots per day (e.g., morning and afternoon)
}

export interface IBlockedDate {
  date: Date;
  reason?: string; // e.g., "Holiday", "Personal day"
}

export interface IViewingSchedule extends Document {
  userId: mongoose.Types.ObjectId; // Agent/seller
  // Working schedule
  workingDays: IWorkingDay[];
  timezone: string; // e.g., "Europe/Skopje"
  // Viewing settings
  viewingDuration: number; // Duration in minutes (default: 30)
  bufferTime: number; // Buffer between viewings in minutes (default: 15)
  maxViewingsPerDay: number; // Maximum viewings per day (0 = unlimited)
  advanceBookingDays: number; // How far in advance can bookings be made (default: 30)
  minimumNotice: number; // Minimum hours notice required (default: 24)
  // Blocked dates (holidays, personal time)
  blockedDates: IBlockedDate[];
  // Auto-confirmation settings
  autoConfirm: boolean; // Automatically confirm bookings
  requireApproval: boolean; // Require manual approval
  // Notification preferences
  notifyByEmail: boolean;
  notifyBySms: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const TimeSlotSchema = new Schema(
  {
    start: {
      type: String,
      required: true,
      validate: {
        validator: (v: string) => /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v),
        message: 'Time must be in HH:mm format',
      },
    },
    end: {
      type: String,
      required: true,
      validate: {
        validator: (v: string) => /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v),
        message: 'Time must be in HH:mm format',
      },
    },
  },
  { _id: false }
);

const WorkingDaySchema = new Schema(
  {
    day: {
      type: String,
      enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
      required: true,
    },
    enabled: {
      type: Boolean,
      default: true,
    },
    slots: {
      type: [TimeSlotSchema],
      default: [],
    },
  },
  { _id: false }
);

const BlockedDateSchema = new Schema(
  {
    date: {
      type: Date,
      required: true,
    },
    reason: {
      type: String,
      maxlength: 200,
    },
  },
  { _id: false }
);

const ViewingScheduleSchema: Schema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    workingDays: {
      type: [WorkingDaySchema],
      default: [
        { day: 'monday', enabled: true, slots: [{ start: '09:00', end: '17:00' }] },
        { day: 'tuesday', enabled: true, slots: [{ start: '09:00', end: '17:00' }] },
        { day: 'wednesday', enabled: true, slots: [{ start: '09:00', end: '17:00' }] },
        { day: 'thursday', enabled: true, slots: [{ start: '09:00', end: '17:00' }] },
        { day: 'friday', enabled: true, slots: [{ start: '09:00', end: '17:00' }] },
        { day: 'saturday', enabled: true, slots: [{ start: '10:00', end: '14:00' }] },
        { day: 'sunday', enabled: false, slots: [] },
      ],
    },
    timezone: {
      type: String,
      default: 'Europe/Skopje',
    },
    viewingDuration: {
      type: Number,
      default: 30,
      min: 15,
      max: 120,
    },
    bufferTime: {
      type: Number,
      default: 15,
      min: 0,
      max: 60,
    },
    maxViewingsPerDay: {
      type: Number,
      default: 0, // 0 = unlimited
      min: 0,
    },
    advanceBookingDays: {
      type: Number,
      default: 30,
      min: 1,
      max: 90,
    },
    minimumNotice: {
      type: Number,
      default: 24, // hours
      min: 1,
      max: 168, // 1 week
    },
    blockedDates: {
      type: [BlockedDateSchema],
      default: [],
    },
    autoConfirm: {
      type: Boolean,
      default: true,
    },
    requireApproval: {
      type: Boolean,
      default: false,
    },
    notifyByEmail: {
      type: Boolean,
      default: true,
    },
    notifyBySms: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IViewingSchedule>('ViewingSchedule', ViewingScheduleSchema);
