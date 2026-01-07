import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IPhoneVerification extends Document {
  phone: string;
  code: string; // Hashed OTP code
  expiresAt: Date;
  attempts: number;
  verified: boolean;
  createdAt: Date;
  updatedAt: Date;
  verifyCode(candidateCode: string): Promise<boolean>;
  incrementAttempts(): Promise<void>;
  isExpired(): boolean;
  isMaxAttemptsReached(): boolean;
}

const PhoneVerificationSchema: Schema = new Schema(
  {
    phone: {
      type: String,
      required: true,
      index: true,
    },
    code: {
      type: String,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    attempts: {
      type: Number,
      default: 0,
    },
    verified: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Hash the OTP code before saving
PhoneVerificationSchema.pre('save', async function (next) {
  if (!this.isModified('code')) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    const code = this.get('code') as string;
    this.set('code', await bcrypt.hash(code, salt));
    next();
  } catch (error: any) {
    next(error);
  }
});

// Verify the OTP code
PhoneVerificationSchema.methods.verifyCode = async function (
  candidateCode: string
): Promise<boolean> {
  const code = this.get('code') as string;
  return bcrypt.compare(candidateCode, code);
};

// Increment verification attempts
PhoneVerificationSchema.methods.incrementAttempts = async function (): Promise<void> {
  this.attempts += 1;
  await this.save();
};

// Check if OTP is expired
PhoneVerificationSchema.methods.isExpired = function (): boolean {
  return new Date() > this.expiresAt;
};

// Check if max attempts reached (5 attempts max)
PhoneVerificationSchema.methods.isMaxAttemptsReached = function (): boolean {
  return this.attempts >= 5;
};

// TTL index to automatically delete expired records after 1 hour
PhoneVerificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 3600 });

// Compound index for efficient lookups
PhoneVerificationSchema.index({ phone: 1, verified: 1 });

export default mongoose.model<IPhoneVerification>('PhoneVerification', PhoneVerificationSchema);
