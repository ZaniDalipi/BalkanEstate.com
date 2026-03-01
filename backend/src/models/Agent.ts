import mongoose, { Document, Schema } from 'mongoose';

export interface ICredential {
  type: 'license' | 'certification' | 'award' | 'membership';
  title: string;
  issuer: string;
  issueNumber?: string;
  issueDate?: Date;
  expiryDate?: Date;
  documentUrl?: string;
  documentPublicId?: string;
  status: 'pending' | 'verified' | 'rejected' | 'expired';
  verifiedAt?: Date;
  verifiedBy?: mongoose.Types.ObjectId;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ITestimonial {
  clientName: string;
  userId?: mongoose.Types.ObjectId; // User who wrote the review
  quote: string;
  rating: number; // 1-5
  propertyId?: mongoose.Types.ObjectId;
  createdAt: Date;
}

export interface IAgentStats {
  totalViews: number;
  uniqueViews: number;
  viewsThisWeek: number;
  viewsThisMonth: number;
  viewsLastMonth: number;
  inquiriesFromViews: number;
  conversionRate: number; // inquiries / views
  lastViewedAt?: Date;
}

export interface IAgent extends Document {
  userId: mongoose.Types.ObjectId;
  agencyName: string;
  agencyId?: mongoose.Types.ObjectId;
  agentId: string;
  licenseNumber?: string;
  licenseCountry?: string;
  licenseVerified: boolean;
  licenseVerificationDate?: Date;
  licenseStatus: 'none' | 'pending' | 'verified' | 'rejected';
  bio?: string;
  specializations: string[]; // e.g., ['residential', 'commercial', 'luxury']
  yearsOfExperience?: number;
  languages: string[]; // e.g., ['English', 'Serbian', 'Croatian']
  serviceAreas: string[]; // e.g., ['Belgrade', 'Novi Sad']
  credentials: ICredential[]; // Professional credentials, certifications, awards
  lat?: number;
  lng?: number;
  websiteUrl?: string;
  facebookUrl?: string;
  instagramUrl?: string;
  linkedinUrl?: string;
  officeAddress?: string;
  officePhone?: string;
  testimonials: ITestimonial[];
  rating: number; // Calculated average rating
  calculateRating: () => void;
  totalReviews: number;
  totalSales: number;
  totalSalesValue: number;
  activeListings: number;
  // View statistics
  views: number;
  viewStats: IAgentStats;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CredentialSchema: Schema = new Schema(
  {
    type: {
      type: String,
      enum: ['license', 'certification', 'award', 'membership'],
      required: true,
    },
    title: {
      type: String,
      required: true,
      maxlength: 200,
    },
    issuer: {
      type: String,
      required: true,
      maxlength: 200,
    },
    issueNumber: {
      type: String,
      maxlength: 100,
    },
    issueDate: {
      type: Date,
    },
    expiryDate: {
      type: Date,
    },
    documentUrl: {
      type: String,
    },
    documentPublicId: {
      type: String,
    },
    status: {
      type: String,
      enum: ['pending', 'verified', 'rejected', 'expired'],
      default: 'pending',
    },
    verifiedAt: {
      type: Date,
    },
    verifiedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    isPublic: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

const TestimonialSchema: Schema = new Schema(
  {
    clientName: {
      type: String,
      required: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true, // For quick lookups to prevent duplicate reviews
    },
    quote: {
      type: String,
      required: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    propertyId: {
      type: Schema.Types.ObjectId,
      ref: 'Property',
    },
  },
  {
    timestamps: true,
  }
);

const AgentSchema: Schema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    agencyName: {
      type: String,
      required: true,
    },
    agencyId: {
      type: Schema.Types.ObjectId,
      ref: 'Agency',
      index: true,
    },
    agentId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    licenseNumber: {
      type: String,
      sparse: true,
      index: true,
    },
    licenseCountry: {
      type: String,
    },
    licenseVerified: {
      type: Boolean,
      default: false,
    },
    licenseVerificationDate: {
      type: Date,
    },
    licenseStatus: {
      type: String,
      enum: ['none', 'pending', 'verified', 'rejected'],
      default: 'none',
    },
    bio: {
      type: String,
      maxlength: 1000,
    },
    specializations: {
      type: [String],
      default: [],
    },
    yearsOfExperience: {
      type: Number,
      min: 0,
    },
    languages: {
      type: [String],
      default: ['English'],
    },
    serviceAreas: {
      type: [String],
      default: [],
    },
    lat: {
      type: Number,
    },
    lng: {
      type: Number,
    },
    websiteUrl: {
      type: String,
    },
    facebookUrl: {
      type: String,
    },
    instagramUrl: {
      type: String,
    },
    linkedinUrl: {
      type: String,
    },
    officeAddress: {
      type: String,
    },
    officePhone: {
      type: String,
    },
    testimonials: {
      type: [TestimonialSchema],
      default: [],
    },
    credentials: {
      type: [CredentialSchema],
      default: [],
    },
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    totalReviews: {
      type: Number,
      default: 0,
    },
    totalSales: {
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
    // View statistics
    views: {
      type: Number,
      default: 0,
    },
    viewStats: {
      totalViews: {
        type: Number,
        default: 0,
      },
      uniqueViews: {
        type: Number,
        default: 0,
      },
      viewsThisWeek: {
        type: Number,
        default: 0,
      },
      viewsThisMonth: {
        type: Number,
        default: 0,
      },
      viewsLastMonth: {
        type: Number,
        default: 0,
      },
      inquiriesFromViews: {
        type: Number,
        default: 0,
      },
      conversionRate: {
        type: Number,
        default: 0,
      },
      lastViewedAt: {
        type: Date,
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Method to calculate average rating
AgentSchema.methods.calculateRating = function () {
  if (this.testimonials.length === 0) {
    this.rating = 0;
    this.totalReviews = 0;
    return;
  }

  const totalRating = this.testimonials.reduce(
    (sum: number, testimonial: ITestimonial) => sum + testimonial.rating,
    0
  );

  this.rating = totalRating / this.testimonials.length;
  this.totalReviews = this.testimonials.length;
};

// Auto-calculate rating before saving
AgentSchema.pre<IAgent>('save', function (next) {
  if (this.isModified('testimonials')) {
    this.calculateRating();
  }
  next();
});

export default mongoose.model<IAgent>('Agent', AgentSchema);
