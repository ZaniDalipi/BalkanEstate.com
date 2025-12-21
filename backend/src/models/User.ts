import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  _id: string;
  email: string;
  password?: string;
  name: string;
  phone?: string;
  avatarUrl?: string;
  avatarPublicId?: string;
  role: 'buyer' | 'private_seller' | 'agent' | 'admin' | 'super_admin'; // Deprecated - use availableRoles instead
  availableRoles: ('buyer' | 'private_seller' | 'agent' | 'admin' | 'super_admin')[]; // What roles user can access
  activeRole: 'buyer' | 'private_seller' | 'agent' | 'admin' | 'super_admin'; // Current UI context
  primaryRole: 'buyer' | 'private_seller' | 'agent' | 'admin' | 'super_admin'; // Default/main role
  provider: 'local' | 'google' | 'facebook' | 'apple';
  providerId?: string;
  isEmailVerified: boolean;
  city?: string;
  country?: string;
  agencyName?: string;
  agentId?: string;
  licenseNumber?: string;
  licenseVerified?: boolean,
  licenseVerificationDate?: Date,

  listingsCount: number,
  totalListingsCreated: number

  // Real-time Statistics (auto-updated)
  stats?: {
    totalViews: number;        // Total views across all properties
    totalSaves: number;        // Total saves/favorites
    totalInquiries: number;    // Total conversation inquiries
    propertiesSold: number;    // Count of sold properties
    totalSalesValue: number;   // Sum of sold property prices
    activeListings: number;    // Count of active properties
    rating: number;            // Average rating (0-5)
    lastUpdated: Date;         // Last stats update timestamp
  };

  // Tier-specific features
  promotedAdsCount?: number;
  lastPromotionReset?: Date;
  isEnterpriseTier?: boolean;
  agencyId?: mongoose.Types.ObjectId;
  featuredUntil?: Date;

  // Enhanced Subscription Fields
  isSubscribed: boolean;
  subscriptionPlan?: string; // Product ID (e.g., 'buyer_pro_monthly')
  subscriptionProductName?: string; // Human-readable name (e.g., 'Buyer Pro Monthly')
  subscriptionSource?: 'google' | 'apple' | 'stripe' | 'web'; // Where subscription came from
  subscriptionExpiresAt?: Date;
  subscriptionStartedAt?: Date;
  activeSubscriptionId?: mongoose.Types.ObjectId; // Link to active Subscription document
  lastPaymentDate?: Date;
  lastPaymentAmount?: number;
  totalPaid?: number; // Track lifetime payment value
  subscriptionStatus?: 'active' | 'expired' | 'trial' | 'grace' | 'canceled';

  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  publicKey?: string; // E2E encryption public key (JWK format)

  // Email Verification
  emailVerificationToken?: string;
  emailVerificationExpires?: Date;

  // Security & Account Protection
  loginAttempts: number;
  lockUntil?: Date;
  lastFailedLogin?: Date;
  lastSuccessfulLogin?: Date;
  passwordChangedAt?: Date;

  // Refresh Token Management
  refreshTokens?: Array<{
    token: string;
    createdAt: Date;
    expiresAt: Date;
    deviceInfo?: string;
    ipAddress?: string;
  }>;

  // Login History (permanent log of all login events)
  loginHistory?: Array<{
    timestamp: Date;
    success: boolean;
    ipAddress?: string;
    userAgent?: string;
    deviceInfo?: string;
    location?: string;
    failureReason?: string;
  }>;

  // Trial Period Management (for agents)
  trialStartDate?: Date;
  trialEndDate?: Date;
  trialReminderSent?: boolean;
  trialExpired?: boolean;

  // Listing Limits
  activeListingsLimit: number; // Max active listings allowed
  paidListingsCount: number; // Count of paid extra listings

  // Enhanced Subscription System
  subscription: {
    // Core subscription info
    tier: 'free' | 'pro' | 'agency_owner' | 'agency_agent' | 'buyer';
    status: 'active' | 'canceled' | 'expired' | 'trial';
    startDate?: Date;
    expiresAt?: Date;
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;

    // Listing limits (for sellers: free/pro/agency)
    listingsLimit: number; // 3 for free, 20 for pro/agency agents
    activeListingsCount: number; // Current active listings
    privateSellerCount: number; // Posted as private seller
    agentCount: number; // Posted as agent

    // Promotion Coupons (for Pro and Agency users)
    promotionCoupons?: {
      monthly: number; // 3 for Pro, 15 for Agency (agency-wide)
      available: number; // Current available
      used: number; // Used this period
      rollover: number; // Rolled over from last month (max 6 for Pro)
      lastRefresh: Date; // Last monthly refresh
    };

    // Buyer-specific features
    savedSearchesLimit?: number; // 1 free, 10 pro, unlimited buyer

    // Value tracking
    totalPaid: number; // Lifetime value
    lastPayment?: {
      amount: number;
      date: Date;
      method: 'stripe' | 'agency_coupon';
    };
  };

  // Agent License Verification (for agents only)
  agentLicense?: {
    number: string;
    country: string;
    expiryDate?: Date;
    documentUrl?: string; // S3/Cloudinary URL to uploaded license
    documentPublicId?: string; // Cloudinary public ID for cleanup
    isVerified: boolean;
    verifiedAt?: Date;
    verifiedBy?: mongoose.Types.ObjectId; // Admin who verified
    rejectionReason?: string;
    submittedAt?: Date; // When license was first submitted
    status: 'pending' | 'verified' | 'rejected' | 'expired';
  };

  // Agency Association (for agency owners and agents)
  agency?: {
    agencyId?: mongoose.Types.ObjectId;
    role: 'owner' | 'agent' | 'none';
    joinedAt?: Date;
    couponCode?: string; // If joined via coupon
    leftAt?: Date;
  };

  // Legacy Subscription Fields (kept for backwards compatibility - use subscription instead)
  proSubscription?: {
    isActive: boolean;
    activeListingsCount: number;
    privateSellerCount: number;
    agentCount: number;
    totalListingsLimit: number;
    expiresAt?: Date;
    startedAt?: Date;
    plan?: string; // Legacy field for old subscription system
    promotionCoupons?: {
      monthly: number;
      available: number;
      used: number;
      highlightCoupons?: number; // Legacy field
      usedHighlightCoupons?: number; // Legacy field
    };
  };

  freeSubscription?: {
    activeListingsCount: number;
    listingsLimit?: number; // Legacy field
  };

  // Neighborhood Insights Usage Tracking
  neighborhoodInsights?: {
    monthlyCount: number;        // Number of insights generated this month
    lastUsed?: Date;             // Last time insights were requested
    monthResetDate: Date;        // When the monthly counter resets
  };

  // Weekly Search Usage Tracking
  weeklySearches?: {
    weeklyCount: number;         // Number of searches performed this week
    lastUsed?: Date;             // Last time a search was performed
    weekResetDate: Date;         // When the weekly counter resets
  };

  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;

  // Methods
  hasActiveSubscription(): boolean;
  canAccessPremiumFeatures(): boolean;
  isAccountLocked(): boolean;
  incrementLoginAttempts(): Promise<void>;
  resetLoginAttempts(): Promise<void>;
  getActiveListingsLimit(): number;
  canCreateListing(): Promise<boolean>;
  isTrialActive(): boolean;
  isTrialExpiring(): boolean;
}

const UserSchema: Schema = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: false,
      minlength: 6,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      required: false,
      trim: true,
    },
    provider: {
      type: String,
      enum: ['local', 'google', 'facebook', 'apple'],
      default: 'local',
    },
    providerId: {
      type: String,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    avatarUrl: {
      type: String,
    },
    avatarPublicId: {
      type: String,
    },
    role: {
      type: String,
      enum: ['buyer', 'private_seller', 'agent', 'admin', 'super_admin'],
      default: 'buyer',
    },
    availableRoles: {
      type: [String],
      enum: ['buyer', 'private_seller', 'agent', 'admin', 'super_admin'],
      default: ['buyer'], // Will be updated in pre-save hook
    },
    activeRole: {
      type: String,
      enum: ['buyer', 'private_seller', 'agent', 'admin', 'super_admin'],
      default: 'buyer', // Will be updated in pre-save hook
    },
    primaryRole: {
      type: String,
      enum: ['buyer', 'private_seller', 'agent', 'admin', 'super_admin'],
      default: 'buyer', // Will be updated in pre-save hook
    },
    city: {
      type: String,
    },
    country: {
      type: String,
    },
    agencyName: {
      type: String,
    },
    agentId: {
      type: String,
    },
    licenseNumber: {
      type: String,
    },
    licenseVerified: {
      type: Boolean,
      default: false,
    },
    licenseVerificationDate: {
      type: Date,
    },
    listingsCount: {
      type: Number,
      default: 0,
    },
    totalListingsCreated: {
      type: Number,
      default: 0,
    },
    stats: {
      totalViews: {
        type: Number,
        default: 0,
      },
      totalSaves: {
        type: Number,
        default: 0,
      },
      totalInquiries: {
        type: Number,
        default: 0,
      },
      propertiesSold: {
        type: Number,
        default: 0,
      },
      totalSalesValue: {
        type: Number,
        default: 0,
      },
      activeListings: {
        type: Number,
        default: 0,
      },
      rating: {
        type: Number,
        default: 0,
        min: 0,
        max: 5,
      },
      lastUpdated: {
        type: Date,
        default: Date.now,
      },
    },
    isSubscribed: {
      type: Boolean,
      default: false,
      index: true, // Index for fast subscription queries
    },
    subscriptionPlan: {
      type: String, // Product ID (e.g., 'buyer_pro_monthly', 'seller_premium_yearly')
    },
    subscriptionProductName: {
      type: String, // Human-readable name (e.g., 'Buyer Pro Monthly')
    },
    subscriptionSource: {
      type: String,
      enum: ['google', 'apple', 'stripe', 'web'],
      index: true, // Index for querying by subscription source
    },
    subscriptionExpiresAt: {
      type: Date,
      index: true, // Index for expiration queries
    },
    subscriptionStartedAt: {
      type: Date,
    },
    activeSubscriptionId: {
      type: Schema.Types.ObjectId,
      ref: 'Subscription',
      index: true,
    },
    lastPaymentDate: {
      type: Date,
    },
    lastPaymentAmount: {
      type: Number,
    },
    totalPaid: {
      type: Number,
      default: 0,
    },
    subscriptionStatus: {
      type: String,
      enum: ['active', 'expired', 'trial', 'grace', 'canceled'],
    },
    // Tier-specific features
    promotedAdsCount: {
      type: Number,
      default: 0,
    },
    lastPromotionReset: {
      type: Date,
    },
    // Enterprise tier fields
    isEnterpriseTier: {
      type: Boolean,
      default: false,
    },
    agencyId: {
      type: Schema.Types.ObjectId,
      ref: 'Agency',
    },
    featuredUntil: {
      type: Date,
    },
    resetPasswordToken: {
      type: String,
    },
    resetPasswordExpires: {
      type: Date,
    },
    publicKey: {
      type: String,
      required: false,
    },
    // Email Verification
    emailVerificationToken: {
      type: String,
    },
    emailVerificationExpires: {
      type: Date,
    },
    // Security & Account Protection
    loginAttempts: {
      type: Number,
      default: 0,
    },
    lockUntil: {
      type: Date,
    },
    lastFailedLogin: {
      type: Date,
    },
    lastSuccessfulLogin: {
      type: Date,
    },
    passwordChangedAt: {
      type: Date,
    },
    // Refresh Token Management
    refreshTokens: [{
      token: {
        type: String,
        required: true,
      },
      createdAt: {
        type: Date,
        default: Date.now,
      },
      expiresAt: {
        type: Date,
        required: true,
      },
      deviceInfo: String,
      ipAddress: String,
    }],
    // Login History (permanent log of all login events)
    loginHistory: [{
      timestamp: {
        type: Date,
        default: Date.now,
      },
      success: {
        type: Boolean,
        required: true,
      },
      ipAddress: String,
      userAgent: String,
      deviceInfo: String,
      location: String,
      failureReason: String,
    }],
    // Trial Period Management
    trialStartDate: {
      type: Date,
    },
    trialEndDate: {
      type: Date,
    },
    trialReminderSent: {
      type: Boolean,
      default: false,
    },
    trialExpired: {
      type: Boolean,
      default: false,
    },
    // Listing Limits
    activeListingsLimit: {
      type: Number,
      default: 3, // Default for private sellers (free)
    },
    paidListingsCount: {
      type: Number,
      default: 0,
    },
    // Enhanced Subscription System
    subscription: {
      tier: {
        type: String,
        enum: ['free', 'pro', 'agency_owner', 'agency_agent', 'buyer'],
        default: 'free',
        index: true,
      },
      status: {
        type: String,
        enum: ['active', 'canceled', 'expired', 'trial'],
        default: 'active',
      },
      startDate: Date,
      expiresAt: Date,
      stripeCustomerId: String,
      stripeSubscriptionId: String,

      // Listing limits
      listingsLimit: {
        type: Number,
        default: 3, // Free tier default
      },
      activeListingsCount: {
        type: Number,
        default: 0,
      },
      privateSellerCount: {
        type: Number,
        default: 0,
      },
      agentCount: {
        type: Number,
        default: 0,
      },

      // Promotion coupons
      promotionCoupons: {
        monthly: {
          type: Number,
          default: 0, // 0 for free, 3 for pro, 15 for agency
        },
        available: {
          type: Number,
          default: 0,
        },
        used: {
          type: Number,
          default: 0,
        },
        rollover: {
          type: Number,
          default: 0, // Max 6 for Pro individual users
        },
        lastRefresh: {
          type: Date,
          default: Date.now,
        },
      },

      // Buyer features
      savedSearchesLimit: {
        type: Number,
        default: 1, // 1 for free, 10 for pro, unlimited (-1) for buyer
      },

      // Value tracking
      totalPaid: {
        type: Number,
        default: 0,
      },
      lastPayment: {
        amount: Number,
        date: Date,
        method: {
          type: String,
          enum: ['stripe', 'agency_coupon'],
        },
      },
    },

    // Agent License Verification
    agentLicense: {
      number: String,
      country: String,
      expiryDate: Date,
      documentUrl: String,
      documentPublicId: String,
      isVerified: {
        type: Boolean,
        default: false,
      },
      verifiedAt: Date,
      verifiedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
      rejectionReason: String,
      submittedAt: Date,
      status: {
        type: String,
        enum: ['pending', 'verified', 'rejected', 'expired'],
        default: 'pending',
      },
    },

    // Agency Association
    agency: {
      agencyId: {
        type: Schema.Types.ObjectId,
        ref: 'Agency',
      },
      role: {
        type: String,
        enum: ['owner', 'agent', 'none'],
        default: 'none',
      },
      joinedAt: Date,
      couponCode: String,
      leftAt: Date,
    },
    neighborhoodInsights: {
      monthlyCount: {
        type: Number,
        default: 0,
      },
      lastUsed: {
        type: Date,
      },
      monthResetDate: {
        type: Date,
        default: () => {
          const nextMonth = new Date();
          nextMonth.setMonth(nextMonth.getMonth() + 1);
          nextMonth.setDate(1);
          nextMonth.setHours(0, 0, 0, 0);
          return nextMonth;
        },
      },
    },
    weeklySearches: {
      weeklyCount: {
        type: Number,
        default: 0,
      },
      lastUsed: {
        type: Date,
      },
      weekResetDate: {
        type: Date,
        default: () => {
          const nextWeek = new Date();
          nextWeek.setDate(nextWeek.getDate() + 7);
          nextWeek.setHours(0, 0, 0, 0);
          return nextWeek;
        },
      },
    },
  },
  {
    timestamps: true,
  }
);

// Create compound index for OAuth users only (when providerId is not null)
// This prevents duplicate key errors for local users who all have providerId = null
UserSchema.index(
  { provider: 1, providerId: 1 },
  {
    unique: true,
    partialFilterExpression: { providerId: { $ne: null } }
  }
);

// Hash password before saving (only for local auth users)
UserSchema.pre('save', async function (next) {
  // Skip password hashing if no password (OAuth users) or password not modified
  if (!this.get('password') || !this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    const password = this.get('password') as string;
    this.set('password', await bcrypt.hash(password, salt));
    next();
  } catch (error: any) {
    next(error);
  }
});

// Initialize role fields for new users
UserSchema.pre('save', function (next) {
  // Only run for new documents
  if (!this.isNew) {
    return next();
  }

  // Initialize availableRoles, activeRole, and primaryRole based on role field
  const currentRole = this.get('role') || 'buyer';
  const availableRoles = this.get('availableRoles') as string[] | undefined;

  if (!availableRoles || availableRoles.length === 0) {
    this.set('availableRoles', [currentRole]);
  }

  if (!this.get('activeRole')) {
    this.set('activeRole', currentRole);
  }

  if (!this.get('primaryRole')) {
    this.set('primaryRole', currentRole);
  }

  next();
});

// Compare password method
UserSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  const password = this.get('password') as string;
  return bcrypt.compare(candidatePassword, password);
};

// Check if user has an active subscription
UserSchema.methods.hasActiveSubscription = function (): boolean {
  if (!this.isSubscribed || !this.subscriptionExpiresAt) {
    return false;
  }
  return new Date(this.subscriptionExpiresAt) > new Date();
};

// Check if user can access premium features (includes grace period)
UserSchema.methods.canAccessPremiumFeatures = function (): boolean {
  if (!this.isSubscribed) {
    return false;
  }

  const now = new Date();
  const expiresAt = new Date(this.subscriptionExpiresAt || 0);

  // Allow access if within subscription period
  if (expiresAt > now) {
    return true;
  }

  // Allow access during grace period (7 days after expiration)
  const gracePeriodEnd = new Date(expiresAt);
  gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 7);

  if (now <= gracePeriodEnd && this.subscriptionStatus === 'grace') {
    return true;
  }

  return false;
};

// Check if account is locked due to failed login attempts
UserSchema.methods.isAccountLocked = function (): boolean {
  if (!this.lockUntil) return false;
  return this.lockUntil > new Date();
};

// Increment login attempts and lock account if threshold reached
UserSchema.methods.incrementLoginAttempts = async function (): Promise<void> {
  const MAX_LOGIN_ATTEMPTS = 5;
  const LOCK_TIME = 30 * 60 * 1000; // 30 minutes

  this.loginAttempts += 1;
  this.lastFailedLogin = new Date();

  // Lock account after max attempts
  if (this.loginAttempts >= MAX_LOGIN_ATTEMPTS) {
    this.lockUntil = new Date(Date.now() + LOCK_TIME);
  }

  await this.save();
};

// Reset login attempts after successful login
UserSchema.methods.resetLoginAttempts = async function (): Promise<void> {
  if (this.loginAttempts === 0 && !this.lockUntil) return;

  this.loginAttempts = 0;
  this.lockUntil = undefined;
  this.lastSuccessfulLogin = new Date();
  await this.save();
};

// Get active listings limit based on role and subscription
UserSchema.methods.getActiveListingsLimit = function (): number {
  // Agents (on paid plan or trial)
  if (this.role === 'agent') {
    if (this.isTrialActive()) {
      return 10; // Trial agents get 10 active listings
    }
    if (this.hasActiveSubscription()) {
      return 50; // Paid agent subscription allows 50 active listings
    }
    // Agent with expired trial/subscription - treated as private seller
    return 3;
  }

  // Private sellers
  if (this.role === 'private_seller') {
    if (this.hasActiveSubscription()) {
      return 20; // Paid private sellers get 20 active listings
    }
    return 3; // Free private sellers get 3 active listings
  }

  // Buyers cannot create listings
  return 0;
};

// Check if user can create a new listing
UserSchema.methods.canCreateListing = async function (): Promise<boolean> {
  const limit = this.getActiveListingsLimit();

  // Buyer role cannot create listings
  if (this.role === 'buyer') return false;

  // Check if under the limit
  const currentActiveListings = this.listingsCount || 0;
  return currentActiveListings < limit;
};

// Check if trial period is active
UserSchema.methods.isTrialActive = function (): boolean {
  if (!this.trialStartDate || !this.trialEndDate) return false;
  if (this.trialExpired) return false;

  const now = new Date();
  return now >= this.trialStartDate && now <= this.trialEndDate;
};

// Check if trial is expiring soon (within 3 days)
UserSchema.methods.isTrialExpiring = function (): boolean {
  if (!this.isTrialActive()) return false;

  const now = new Date();
  const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

  return this.trialEndDate! <= threeDaysFromNow;
};

// Update password changed timestamp
UserSchema.pre('save', function(next) {
  if (this.isModified('password') && !this.isNew) {
    this.passwordChangedAt = new Date();
  }
  next();
});

// Index for finding expiring subscriptions
UserSchema.index({ subscriptionExpiresAt: 1, isSubscribed: 1 });

// Index for finding expiring trials
UserSchema.index({ trialEndDate: 1, trialExpired: 1 });

// Index for account lockout
UserSchema.index({ lockUntil: 1 });

export default mongoose.model<IUser>('User', UserSchema);
