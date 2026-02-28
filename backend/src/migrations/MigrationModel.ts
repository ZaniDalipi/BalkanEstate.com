import mongoose, { Schema, Document } from 'mongoose';
import type { IMigrationRecord } from './types';

export interface IMigrationDocument extends IMigrationRecord, Document {}

const MigrationSchema = new Schema<IMigrationDocument>(
  {
    migrationId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    appliedAt: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
    durationMs: {
      type: Number,
      required: true,
    },
    environment: {
      type: String,
      required: true,
      index: true,
    },
    checksum: {
      type: String,
      required: true,
    },
    rolledBackAt: {
      type: Date,
      default: undefined,
    },
  },
  {
    collection: '_migrations',
    timestamps: false,
  }
);

MigrationSchema.index({ environment: 1, migrationId: 1 }, { unique: true });

const MigrationRecord = mongoose.model<IMigrationDocument>(
  'MigrationRecord',
  MigrationSchema
);

export default MigrationRecord;
