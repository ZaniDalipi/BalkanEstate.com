// Agency Dashboard feature types
// All dashboard-specific TypeScript interfaces

import type { PropertyType, PropertyStatus } from '@/src/shared/types';

// Re-export from root types for convenience
export type { AgencyDashboardSection } from '@/types';

// --- Time Series ---

export interface TimeSeriesPoint {
  date: string;
  value: number;
}

// --- Overview ---

export interface OverviewData {
  activeListings: number;
  totalAgents: number;
  inquiriesThisMonth: number;
  totalViews: number;
  conversionRate: number;
  subscriptionStatus: 'active' | 'trial' | 'expired' | 'none';
  recentInquiries: DashboardInquiry[];
  topProperties: DashboardProperty[];
  viewsTrend: TimeSeriesPoint[];
  inquiriesTrend: TimeSeriesPoint[];
}

// --- Agents ---

export interface DashboardAgent {
  userId: string;
  name: string;
  avatar: string | null;
  activeListings: number;
  inquiriesHandled: number;
  avgResponseTime: string;
  joinedAt: string;
  status: 'active' | 'inactive' | 'pending';
  couponCode?: string;
}

// --- Properties ---

export interface DashboardProperty {
  id: string;
  title: string;
  image: string;
  price: number;
  status: PropertyStatus;
  assignedAgent: string;
  views: number;
  inquiries: number;
  listedAt: string;
  propertyType: PropertyType;
}

// --- Inquiries ---

export interface DashboardInquiry {
  id: string;
  propertyTitle: string;
  buyerName: string;
  message: string;
  date: string;
  status: 'new' | 'in-progress' | 'responded' | 'closed';
  assignedAgentName: string;
  agentId: string;
}

// --- Analytics ---

export interface AgentComparison {
  agentId: string;
  agentName: string;
  listings: number;
  inquiries: number;
  views: number;
  responseTime: string;
}

export interface AnalyticsData {
  viewsOverTime: TimeSeriesPoint[];
  inquiriesOverTime: TimeSeriesPoint[];
  agentComparison: AgentComparison[];
  topProperties: DashboardProperty[];
}

// --- Financial ---

export interface SubscriptionInfo {
  plan: string;
  status: 'active' | 'trial' | 'expired' | 'cancelled' | 'none';
  startDate: string | null;
  endDate: string | null;
  interval: 'weekly' | 'monthly' | 'yearly' | null;
  amount: number;
}

export interface CouponInfo {
  code: string;
  status: 'available' | 'used' | 'expired';
  generatedAt: string;
  expiresAt: string;
  usedBy: { id: string; name: string } | null;
  usedAt: string | null;
}

export interface PaymentHistoryEntry {
  id: string;
  date: string;
  amount: number;
  description: string;
  status: 'paid' | 'pending' | 'failed' | 'refunded';
}

export interface FinancialData {
  subscription: SubscriptionInfo;
  agentCoupons: CouponInfo[];
  promotionCoupons: CouponInfo[];
  paymentHistory: PaymentHistoryEntry[];
}

// --- Team ---

export interface TeamFeedItem {
  id: string;
  type: 'listing_added' | 'inquiry_received' | 'inquiry_responded' | 'agent_joined' | 'property_sold' | 'note_added';
  agentName: string;
  description: string;
  timestamp: string;
  propertyTitle?: string;
}

export interface TeamNote {
  id: string;
  content: string;
  authorName: string;
  createdAt: string;
  propertyId?: string;
  type: 'general' | 'property' | 'client' | 'task';
}

// --- Filters ---

export interface PropertyFilters {
  status?: PropertyStatus;
  agentId?: string;
  propertyType?: PropertyType;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

export interface InquiryFilters {
  status?: 'new' | 'in-progress' | 'responded' | 'closed';
  agentId?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

// --- Bulk Actions ---

export interface BulkActionRequest {
  action: 'promote' | 'deactivate';
  propertyIds: string[];
}

// --- Paginated Response ---

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

// --- Hook-level type aliases ---

export interface PropertyListData {
  properties: DashboardProperty[];
  total: number;
}

export interface InquiryListData {
  inquiries: DashboardInquiry[];
  total: number;
}

export interface AgentListData {
  agents: DashboardAgent[];
}

export interface AssignInquiryPayload {
  inquiryId: string;
  agentId: string;
}

export interface BulkPropertyActionPayload {
  action: 'promote' | 'deactivate';
  propertyIds: string[];
}

export interface CreateTeamNotePayload {
  content: string;
  propertyId?: string;
  type: TeamNote['type'];
}
