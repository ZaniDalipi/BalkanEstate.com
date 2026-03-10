import mongoose, { Document, Schema } from 'mongoose';

export interface IFileRecord extends Document {
  publicId: string;
  url: string;
  userId: mongoose.Types.ObjectId;
  fileType: 'property' | 'floorplan' | 'avatar' | 'license' | 'credential' | 'agency-logo' | 'agency-cover' | 'conversation' | 'video' | 'site-logo' | 'site-email-logo' | 'other';
  resourceId?: string;
  mimeType?: string;
  bytes?: number;
  createdAt: Date;
  updatedAt: Date;
}

const FileRecordSchema: Schema = new Schema(
  {
    publicId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    url: {
      type: String,
      required: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    fileType: {
      type: String,
      enum: ['property', 'floorplan', 'avatar', 'license', 'credential', 'agency-logo', 'agency-cover', 'conversation', 'video', 'site-logo', 'site-email-logo', 'other'],
      required: true,
      index: true,
    },
    resourceId: {
      type: String,
      index: true,
    },
    mimeType: {
      type: String,
    },
    bytes: {
      type: Number,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for ownership lookups
FileRecordSchema.index({ userId: 1, fileType: 1 });

export default mongoose.model<IFileRecord>('FileRecord', FileRecordSchema);
