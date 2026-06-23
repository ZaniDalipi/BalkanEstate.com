import mongoose, { Document, Schema } from 'mongoose';

export type LeadStage =
  | 'new'
  | 'contacted'
  | 'qualified'
  | 'proposal'
  | 'negotiation'
  | 'closed_won'
  | 'closed_lost';

export type LeadSource =
  | 'inquiry'
  | 'referral'
  | 'website'
  | 'social'
  | 'walk_in'
  | 'other';

export interface ILeadActivity {
  action: string;
  note?: string;
  performedBy: mongoose.Types.ObjectId;
  performedByName: string;
  createdAt: Date;
}

export interface ILead extends Document {
  // Core contact
  name: string;
  email: string;
  phone?: string;

  // Pipeline
  stage: LeadStage;
  source: LeadSource;

  // Assignment
  agentId: mongoose.Types.ObjectId;
  agencyId?: mongoose.Types.ObjectId;

  // Linked entities
  propertyId?: mongoose.Types.ObjectId;
  propertyTitle?: string;
  inquiryId?: mongoose.Types.ObjectId;

  // Lead details
  budget?: number;
  preferredLocation?: string;
  preferredPropertyType?: string;
  notes?: string;
  nextAction?: string;
  nextActionDate?: Date;

  // Activity log
  activities: ILeadActivity[];

  // Tracking
  isArchived: boolean;
  closedReason?: string;
  createdAt: Date;
  updatedAt: Date;
  lastContactedAt?: Date;
}

const LeadActivitySchema = new Schema<ILeadActivity>(
  {
    action: { type: String, required: true },
    note: { type: String },
    performedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    performedByName: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const LeadSchema = new Schema<ILead>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    phone: { type: String, trim: true },

    stage: {
      type: String,
      enum: ['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost'],
      default: 'new',
    },
    source: {
      type: String,
      enum: ['inquiry', 'referral', 'website', 'social', 'walk_in', 'other'],
      default: 'other',
    },

    agentId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    agencyId: { type: Schema.Types.ObjectId, ref: 'Agency' },

    propertyId: { type: Schema.Types.ObjectId, ref: 'Property' },
    propertyTitle: { type: String },
    inquiryId: { type: Schema.Types.ObjectId, ref: 'Inquiry' },

    budget: { type: Number, min: 0 },
    preferredLocation: { type: String, trim: true },
    preferredPropertyType: { type: String },
    notes: { type: String, maxlength: 5000 },
    nextAction: { type: String, maxlength: 500 },
    nextActionDate: { type: Date },

    activities: { type: [LeadActivitySchema], default: [] },

    isArchived: { type: Boolean, default: false },
    closedReason: { type: String, maxlength: 500 },
    lastContactedAt: { type: Date },
  },
  { timestamps: true }
);

LeadSchema.index({ agentId: 1, stage: 1 });
LeadSchema.index({ agencyId: 1, stage: 1 });
LeadSchema.index({ email: 1, agentId: 1 });
LeadSchema.index({ createdAt: -1 });
LeadSchema.index({ nextActionDate: 1, agentId: 1 });

export default mongoose.model<ILead>('Lead', LeadSchema);
