// Agency Dashboard API module
// Handles all agency dashboard API calls
// Transforms backend responses to match frontend types

import { apiRequest } from '@/src/shared/api';
import type {
  OverviewData,
  DashboardAgent,
  DashboardProperty,
  DashboardInquiry,
  AnalyticsData,
  FinancialData,
  CouponInfo,
  TeamFeedItem,
  TeamNote,
  PropertyFilters,
  InquiryFilters,
  BulkActionRequest,
  PaginatedResponse,
  AgentComparison,
  TimeSeriesPoint,
} from '../types';

const BASE = '/agency-dashboard';

// --- Overview ---

export const getAgencyOverview = async (agencyId: string): Promise<OverviewData> => {
  const raw = await apiRequest<Record<string, unknown>>(`${BASE}/${agencyId}/overview`, {
    requiresAuth: true,
    encryptResponse: true,
  });

  return {
    activeListings: (raw.activeListings as number) ?? 0,
    totalAgents: (raw.totalAgents as number) ?? 0,
    inquiriesThisMonth: (raw.inquiriesThisMonth as number) ?? 0,
    totalViews: (raw.totalPropertyViews as number) ?? (raw.totalViews as number) ?? 0,
    conversionRate: (raw.conversionRate as number) ?? 0,
    subscriptionStatus: ((raw.subscription as Record<string, unknown>)?.status as OverviewData['subscriptionStatus']) ?? 'none',
    recentInquiries: ((raw.recentInquiries as DashboardInquiry[]) ?? []),
    topProperties: ((raw.topProperties as DashboardProperty[]) ?? []),
    viewsTrend: ((raw.viewsTrend as TimeSeriesPoint[]) ?? []),
    inquiriesTrend: ((raw.inquiriesTrend as TimeSeriesPoint[]) ?? []),
  };
};

// --- Agents ---

export const getDashboardAgents = async (agencyId: string): Promise<DashboardAgent[]> => {
  const raw = await apiRequest<Record<string, unknown>>(`${BASE}/${agencyId}/agents`, {
    requiresAuth: true,
    encryptResponse: true,
  });

  // Backend returns { agents: [...], total, page, limit }
  const agents = (raw.agents ?? raw) as Record<string, unknown>[];
  if (!Array.isArray(agents)) return [];

  return agents.map((a) => ({
    userId: String(a.id ?? a._id ?? a.userId ?? ''),
    name: (a.name as string) ?? '',
    avatar: (a.avatarUrl as string) ?? (a.avatar as string) ?? null,
    avatarOptions: (a.avatarOptions as string) ?? undefined,
    gender: (a.gender as DashboardAgent['gender']) ?? undefined,
    activeListings: (a.listingsCount as number) ?? (a.activeListings as number) ?? 0,
    inquiriesHandled: ((a.stats as Record<string, unknown>)?.inquiriesHandled as number) ?? (a.inquiriesHandled as number) ?? 0,
    avgResponseTime: (a.avgResponseTime as string) ?? '-',
    joinedAt: (a.joinedAt as string) ?? '',
    status: mapAgentStatus(a.isActive, a.status as string),
    couponCode: (a.couponCode as string) ?? undefined,
  }));
};

function mapAgentStatus(isActive: unknown, status?: string): DashboardAgent['status'] {
  if (status === 'active' || status === 'inactive' || status === 'pending') return status;
  if (isActive === false) return 'inactive';
  if (isActive === true) return 'active';
  return 'active';
}

export const getDashboardAgentDetail = async (agencyId: string, agentId: string): Promise<DashboardAgent> => {
  return apiRequest(`${BASE}/${agencyId}/agents/${agentId}`, { requiresAuth: true });
};

// --- Properties ---

export const getDashboardProperties = async (
  agencyId: string,
  filters?: PropertyFilters
): Promise<PaginatedResponse<DashboardProperty>> => {
  const params = new URLSearchParams();
  if (filters?.status) params.append('status', filters.status);
  if (filters?.agentId) params.append('agentId', filters.agentId);
  if (filters?.propertyType) params.append('listingType', filters.propertyType);
  if (filters?.dateFrom) params.append('dateFrom', filters.dateFrom);
  if (filters?.dateTo) params.append('dateTo', filters.dateTo);
  if (filters?.page) params.append('page', String(filters.page));
  if (filters?.limit) params.append('limit', String(filters.limit));

  const query = params.toString();
  const raw = await apiRequest<Record<string, unknown>>(
    `${BASE}/${agencyId}/properties${query ? `?${query}` : ''}`,
    { requiresAuth: true }
  );

  // Backend returns { properties: [...], total, page, limit }
  const properties = (raw.properties ?? raw.items ?? []) as Record<string, unknown>[];

  return {
    items: Array.isArray(properties) ? properties.map(mapProperty) : [],
    total: (raw.total as number) ?? 0,
    page: (raw.page as number) ?? 1,
    limit: (raw.limit as number) ?? 20,
  };
};

function mapProperty(p: Record<string, unknown>): DashboardProperty {
  return {
    id: String(p._id ?? p.id ?? ''),
    title: (p.title as string) ?? '',
    image: (p.imageUrl as string) ?? (p.image as string) ?? '',
    price: (p.price as number) ?? 0,
    status: (p.status as DashboardProperty['status']) ?? 'draft',
    assignedAgent: (p.createdByName as string) ?? (p.assignedAgent as string) ?? '',
    views: (p.views as number) ?? 0,
    inquiries: (p.inquiries as number) ?? 0,
    listedAt: (p.createdAt as string) ?? (p.listedAt as string) ?? '',
    propertyType: (p.listingType as DashboardProperty['propertyType']) ?? (p.propertyType as DashboardProperty['propertyType']) ?? 'other',
  };
}

export const bulkPropertyAction = async (
  agencyId: string,
  request: BulkActionRequest
): Promise<{ success: boolean; affected: number }> => {
  // Backend uses 'activate' rather than 'promote'
  const backendAction = request.action === 'promote' ? 'activate' : request.action;
  const result = await apiRequest<Record<string, unknown>>(
    `${BASE}/${agencyId}/properties/bulk-action`,
    {
      method: 'POST',
      body: { propertyIds: request.propertyIds, action: backendAction },
      requiresAuth: true,
    }
  );
  return {
    success: true,
    affected: (result.affected as number) ?? 0,
  };
};

// --- Inquiries ---

export const getDashboardInquiries = async (
  agencyId: string,
  filters?: InquiryFilters
): Promise<PaginatedResponse<DashboardInquiry>> => {
  const params = new URLSearchParams();
  if (filters?.status) params.append('status', filters.status);
  if (filters?.agentId) params.append('agentId', filters.agentId);
  if (filters?.dateFrom) params.append('dateFrom', filters.dateFrom);
  if (filters?.dateTo) params.append('dateTo', filters.dateTo);
  if (filters?.page) params.append('page', String(filters.page));
  if (filters?.limit) params.append('limit', String(filters.limit));

  const query = params.toString();
  const raw = await apiRequest<Record<string, unknown>>(
    `${BASE}/${agencyId}/inquiries${query ? `?${query}` : ''}`,
    { requiresAuth: true, encryptResponse: true }
  );

  // Backend returns { inquiries: [...], total, page, limit }
  const inquiries = (raw.inquiries ?? raw.items ?? []) as Record<string, unknown>[];

  return {
    items: Array.isArray(inquiries) ? inquiries.map(mapInquiry) : [],
    total: (raw.total as number) ?? 0,
    page: (raw.page as number) ?? 1,
    limit: (raw.limit as number) ?? 20,
  };
};

function mapInquiry(i: Record<string, unknown>): DashboardInquiry {
  return {
    id: String(i._id ?? i.id ?? ''),
    propertyTitle: (i.propertyTitle as string) ?? '',
    buyerName: (i.buyerName as string) ?? '',
    message: (i.message as string) ?? (i.subject as string) ?? '',
    date: (i.createdAt as string) ?? (i.date as string) ?? '',
    status: mapInquiryStatus(i.status as string, i.readAt, i.repliedAt),
    assignedAgentName: (i.recipientName as string) ?? (i.assignedAgentName as string) ?? '',
    agentId: String(i.recipientId ?? i.agentId ?? ''),
  };
}

function mapInquiryStatus(
  status: string | undefined,
  readAt: unknown,
  repliedAt: unknown
): DashboardInquiry['status'] {
  // Map backend inquiry statuses to dashboard display statuses
  if (status === 'new' || status === 'in-progress' || status === 'responded' || status === 'closed') {
    return status;
  }
  if (status === 'replied' || repliedAt) return 'responded';
  if (status === 'read' || readAt) return 'in-progress';
  return 'new';
}

export const assignInquiry = async (
  agencyId: string,
  inquiryId: string,
  agentId: string
): Promise<DashboardInquiry> => {
  // Backend expects { assignToAgentId } not { agentId }
  return apiRequest(`${BASE}/${agencyId}/inquiries/${inquiryId}/assign`, {
    method: 'PUT',
    body: { assignToAgentId: agentId },
    requiresAuth: true,
  });
};

// --- Analytics ---

export const getDashboardAnalytics = async (agencyId: string, range?: string): Promise<AnalyticsData> => {
  const params = range ? `?period=${range}` : '';
  const raw = await apiRequest<Record<string, unknown>>(
    `${BASE}/${agencyId}/analytics${params}`,
    { requiresAuth: true }
  );

  // Backend returns { stats, inquiryTrend, topProperties, statusBreakdown, listingTypeBreakdown }
  // Frontend expects { viewsOverTime, inquiriesOverTime, agentComparison, topProperties }

  const inquiryTrend = (raw.inquiryTrend ?? []) as Array<{ _id: string; count: number }>;
  const viewsOverTime = (raw.viewsOverTime ?? []) as TimeSeriesPoint[];
  const agentComparison = (raw.agentComparison ?? []) as AgentComparison[];
  const topProperties = ((raw.topProperties ?? []) as Record<string, unknown>[]).map(mapProperty);

  return {
    viewsOverTime: viewsOverTime.length > 0
      ? viewsOverTime
      : [], // Backend may not return this yet
    inquiriesOverTime: inquiryTrend.map((point) => ({
      date: point._id ?? (point as unknown as TimeSeriesPoint).date ?? '',
      value: point.count ?? (point as unknown as TimeSeriesPoint).value ?? 0,
    })),
    agentComparison,
    topProperties,
  };
};

export const exportAnalyticsCsv = async (agencyId: string, range: string): Promise<Blob> => {
  const params = range ? `?period=${range}` : '';
  const data = await apiRequest<Record<string, unknown>>(
    `${BASE}/${agencyId}/analytics/export${params}`,
    { requiresAuth: true }
  );

  // Convert JSON export data to CSV format
  const properties = (data.properties ?? []) as Record<string, unknown>[];
  const agentSummary = (data.agentSummary ?? []) as Record<string, unknown>[];

  let csv = 'Type,Title/Name,Status,Price,Views,Inquiries,Date\n';

  for (const p of properties) {
    csv += `Property,"${String(p.title ?? '').replace(/"/g, '""')}",${p.status},${p.price},${p.views ?? 0},${p.inquiries ?? 0},${p.createdAt}\n`;
  }

  csv += '\nAgent Summary\nName,Email,Total Properties,Active Listings,Total Views,Total Inquiries\n';
  for (const a of agentSummary) {
    csv += `"${String(a.name ?? '').replace(/"/g, '""')}",${a.email},${a.totalProperties},${a.activeListings},${a.totalViews},${a.totalInquiries}\n`;
  }

  return new Blob([csv], { type: 'text/csv' });
};

// --- Financial ---

export const getDashboardFinancial = async (agencyId: string): Promise<FinancialData> => {
  const raw = await apiRequest<Record<string, unknown>>(
    `${BASE}/${agencyId}/financial`,
    { requiresAuth: true, encryptResponse: true }
  );

  const sub = (raw.subscription ?? {}) as Record<string, unknown>;
  const agentCouponsRaw = (raw.agentCoupons ?? {}) as Record<string, unknown>;
  const promotionCouponsRaw = (raw.promotionCoupons ?? {}) as Record<string, unknown>;

  return {
    subscription: {
      plan: (sub.plan as string) ?? (sub.status === 'active' ? 'Agency Pro' : 'None'),
      status: (sub.status as FinancialData['subscription']['status']) ?? 'none',
      startDate: (sub.startDate as string) ?? null,
      endDate: (sub.expiresAt as string) ?? (sub.endDate as string) ?? null,
      interval: (sub.interval as FinancialData['subscription']['interval']) ?? null,
      amount: (sub.amount as number) ?? 0,
    },
    agentCoupons: buildCouponList(agentCouponsRaw),
    promotionCoupons: buildCouponList(promotionCouponsRaw),
    paymentHistory: ((raw.paymentHistory ?? []) as FinancialData['paymentHistory']),
  };
};

function buildCouponList(raw: Record<string, unknown>): FinancialData['agentCoupons'] {
  // If backend returns a `coupons` array with real coupon data, use it directly
  const rawCoupons = raw.coupons as Record<string, unknown>[] | undefined;
  if (Array.isArray(rawCoupons) && rawCoupons.length > 0) {
    return rawCoupons.map((c) => {
      const usedByRaw = c.usedBy as Record<string, unknown> | null;
      return {
        code: (c.code as string) ?? '',
        status: (c.status as CouponInfo['status']) ?? 'available',
        generatedAt: (c.generatedAt as string) ?? '',
        expiresAt: (c.expiresAt as string) ?? '',
        usedBy: usedByRaw
          ? { id: String(usedByRaw.id ?? usedByRaw._id ?? ''), name: (usedByRaw.name as string) ?? '' }
          : null,
        usedAt: (c.usedAt as string) ?? null,
      };
    });
  }

  // Fallback: create virtual entries from summary counts (for promotion coupons etc.)
  const total = (raw.total as number) ?? 0;
  const available = (raw.available as number) ?? 0;
  const used = (raw.used as number) ?? 0;
  const coupons: FinancialData['agentCoupons'] = [];

  for (let i = 0; i < available; i++) {
    coupons.push({
      code: `AVAIL-${i + 1}`,
      status: 'available',
      generatedAt: '',
      expiresAt: '',
      usedBy: null,
      usedAt: null,
    });
  }
  for (let i = 0; i < used; i++) {
    coupons.push({
      code: `USED-${i + 1}`,
      status: 'used',
      generatedAt: '',
      expiresAt: '',
      usedBy: null,
      usedAt: null,
    });
  }
  for (let i = 0; i < total - available - used; i++) {
    coupons.push({
      code: `EXP-${i + 1}`,
      status: 'expired',
      generatedAt: '',
      expiresAt: '',
      usedBy: null,
      usedAt: null,
    });
  }

  return coupons;
}

// --- Team Feed ---

export const getTeamFeed = async (agencyId: string): Promise<TeamFeedItem[]> => {
  const raw = await apiRequest<Record<string, unknown>>(
    `${BASE}/${agencyId}/team-feed`,
    { requiresAuth: true }
  );

  // Backend returns { feed: [...notifications], total, page, limit }
  const feed = (raw.feed ?? raw) as Record<string, unknown>[];
  if (!Array.isArray(feed)) return [];

  return feed.map((item) => {
    const data = (item.data ?? {}) as Record<string, unknown>;
    return {
      id: String(item._id ?? item.id ?? ''),
      type: mapFeedType(item.type as string),
      agentName: (data.authorName as string) ?? (item.title as string) ?? '',
      description: (item.message as string) ?? (item.description as string) ?? '',
      timestamp: (item.createdAt as string) ?? (item.timestamp as string) ?? '',
      propertyTitle: (data.propertyTitle as string) ?? undefined,
    };
  });
};

function mapFeedType(type: string): TeamFeedItem['type'] {
  const mapping: Record<string, TeamFeedItem['type']> = {
    agent_joined_agency: 'agent_joined',
    new_inquiry: 'inquiry_received',
    listing_milestone: 'listing_added',
    listing_trending: 'listing_added',
    promotion_success: 'property_sold',
    agency_coupon_redeemed: 'note_added',
  };
  return mapping[type] ?? 'note_added';
}

// --- Team Notes ---

export const getTeamNotes = async (agencyId: string): Promise<TeamNote[]> => {
  const raw = await apiRequest<Record<string, unknown>>(
    `${BASE}/${agencyId}/team-notes`,
    { requiresAuth: true }
  );

  // Backend returns { notes: [...], total, page, limit }
  const notes = (raw.notes ?? raw) as Record<string, unknown>[];
  if (!Array.isArray(notes)) return [];

  return notes.map((note) => {
    const data = (note.data ?? {}) as Record<string, unknown>;
    const user = (note.userId ?? {}) as Record<string, unknown>;
    return {
      id: String(note._id ?? note.id ?? ''),
      content: (note.message as string) ?? (note.content as string) ?? '',
      authorName: (data.authorName as string) ?? (user.name as string) ?? '',
      createdAt: (note.createdAt as string) ?? '',
      propertyId: (data.propertyId as string) ?? undefined,
      type: (data.noteType as TeamNote['type']) ?? 'general',
    };
  });
};

export const createTeamNote = async (
  agencyId: string,
  note: { content: string; propertyId?: string; type: TeamNote['type'] }
): Promise<TeamNote> => {
  // Backend expects { title, message }
  const result = await apiRequest<Record<string, unknown>>(`${BASE}/${agencyId}/team-notes`, {
    method: 'POST',
    body: {
      title: note.type === 'general' ? 'Team Note' : `${note.type} Note`,
      message: note.content,
    },
    requiresAuth: true,
  });

  const returnedNote = (result.note ?? result) as Record<string, unknown>;
  const data = (returnedNote.data ?? {}) as Record<string, unknown>;
  return {
    id: String(returnedNote._id ?? returnedNote.id ?? ''),
    content: (returnedNote.message as string) ?? note.content,
    authorName: (data.authorName as string) ?? '',
    createdAt: (returnedNote.createdAt as string) ?? new Date().toISOString(),
    propertyId: note.propertyId,
    type: note.type,
  };
};

export const deleteTeamNote = async (agencyId: string, noteId: string): Promise<{ success: boolean }> => {
  return apiRequest(`${BASE}/${agencyId}/team-notes/${noteId}`, {
    method: 'DELETE',
    requiresAuth: true,
  });
};
