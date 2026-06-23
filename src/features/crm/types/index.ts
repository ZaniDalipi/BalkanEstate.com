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

export interface LeadActivity {
  _id: string;
  action: string;
  note?: string;
  performedBy: string;
  performedByName: string;
  createdAt: string;
}

export interface Lead {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  stage: LeadStage;
  source: LeadSource;
  agentId: string;
  agencyId?: string;
  propertyId?: string;
  propertyTitle?: string;
  inquiryId?: string;
  budget?: number;
  preferredLocation?: string;
  preferredPropertyType?: string;
  notes?: string;
  nextAction?: string;
  nextActionDate?: string;
  activities?: LeadActivity[];
  isArchived: boolean;
  closedReason?: string;
  lastContactedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LeadFilters {
  stage?: LeadStage;
  source?: LeadSource;
  search?: string;
  isArchived?: boolean;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
}

export interface LeadListResponse {
  items: Lead[];
  total: number;
  page: number;
  limit: number;
}

export type PipelineSummary = Record<LeadStage, number>;

export interface CreateLeadInput {
  name: string;
  email: string;
  phone?: string;
  stage?: LeadStage;
  source?: LeadSource;
  propertyId?: string;
  propertyTitle?: string;
  inquiryId?: string;
  budget?: number;
  preferredLocation?: string;
  preferredPropertyType?: string;
  notes?: string;
  nextAction?: string;
  nextActionDate?: string;
}

export type UpdateLeadInput = Partial<CreateLeadInput> & {
  closedReason?: string;
};

export interface MoveStageInput {
  stage: LeadStage;
  note?: string;
}

export interface AddActivityInput {
  action: string;
  note?: string;
}

// UI helpers
export const PIPELINE_STAGES: LeadStage[] = [
  'new', 'contacted', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost',
];

export const LEAD_SOURCES: LeadSource[] = [
  'inquiry', 'referral', 'website', 'social', 'walk_in', 'other',
];

export const STAGE_COLORS: Record<LeadStage, string> = {
  new: 'bg-gray-100 text-gray-700',
  contacted: 'bg-blue-100 text-blue-700',
  qualified: 'bg-yellow-100 text-yellow-700',
  proposal: 'bg-purple-100 text-purple-700',
  negotiation: 'bg-orange-100 text-orange-700',
  closed_won: 'bg-green-100 text-green-700',
  closed_lost: 'bg-red-100 text-red-700',
};

export const STAGE_BORDER_COLORS: Record<LeadStage, string> = {
  new: 'border-gray-300',
  contacted: 'border-blue-300',
  qualified: 'border-yellow-300',
  proposal: 'border-purple-300',
  negotiation: 'border-orange-300',
  closed_won: 'border-green-400',
  closed_lost: 'border-red-300',
};
