/**
 * Admin React Query Hooks
 * Following architecture guidelines: Use TanStack Query for ALL server state
 * Provides real-time data fetching with automatic caching and refetching
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/src/shared/api';
import {
  getUsers,
  updateUser,
  updateUserRole,
  deleteUser,
  getAdminProperties,
  approveProperty,
  rejectProperty,
  getProducts,
  updateProduct,
  toggleProductStatus,
  toggleProductVisibility,
  getPromotionPlans,
  updatePromotionPlan,
  deletePromotionPlan,
  togglePromotionPlanStatus,
  seedPromotionPlans,
  getDiscountCodes,
  createFullDiscountCode,
  generateBulkDiscountCodes,
  deleteDiscountCode,
  deactivateDiscountCode,
  type Product,
  type PromotionPlan,
  type UserUpdateData,
  type CreateDiscountCodeData,
  type BulkDiscountCodeData,
} from '../api/adminApi';

// ============================================================================
// QUERY KEYS - Following architecture patterns for cache management
// ============================================================================

export const adminKeys = {
  all: ['admin'] as const,

  // Users
  users: () => [...adminKeys.all, 'users'] as const,
  usersList: (filters?: { page?: number; limit?: number; role?: string; search?: string }) =>
    [...adminKeys.users(), 'list', { filters }] as const,

  // Properties
  properties: () => [...adminKeys.all, 'properties'] as const,
  propertiesList: (filters?: { page?: number; limit?: number; status?: string }) =>
    [...adminKeys.properties(), 'list', { filters }] as const,

  // Products/Pricing
  products: () => [...adminKeys.all, 'products'] as const,

  // Promotion Plans
  promotionPlans: () => [...adminKeys.all, 'promotionPlans'] as const,

  // Discount Codes
  discountCodes: () => [...adminKeys.all, 'discountCodes'] as const,

  // Analytics & Activity
  analytics: () => [...adminKeys.all, 'analytics'] as const,
  activityLog: (filters?: { limit?: number; offset?: number }) =>
    [...adminKeys.all, 'activityLog', { filters }] as const,
  dashboardStats: () => [...adminKeys.all, 'dashboardStats'] as const,
  heatmapData: (days?: number) => [...adminKeys.all, 'heatmap', { days }] as const,
  recentSubscriptions: (limit?: number) => [...adminKeys.all, 'recentSubscriptions', { limit }] as const,

  // Payments
  payments: () => [...adminKeys.all, 'payments'] as const,
  paymentsList: (filters?: { page?: number; limit?: number; status?: string }) =>
    [...adminKeys.payments(), 'list', { filters }] as const,
  paymentStats: () => [...adminKeys.payments(), 'stats'] as const,

  // Inquiries
  inquiries: () => [...adminKeys.all, 'inquiries'] as const,
  inquiriesList: (filters?: { page?: number; limit?: number; status?: string }) =>
    [...adminKeys.inquiries(), 'list', { filters }] as const,

  // Agent Requests
  agentRequests: () => [...adminKeys.all, 'agentRequests'] as const,
  agentRequestsList: (filters?: { page?: number; limit?: number; status?: string }) =>
    [...adminKeys.agentRequests(), 'list', { filters }] as const,

  // Agencies
  agencies: () => [...adminKeys.all, 'agencies'] as const,
  agenciesList: (filters?: { page?: number; limit?: number }) =>
    [...adminKeys.agencies(), 'list', { filters }] as const,
};

// ============================================================================
// USER MANAGEMENT HOOKS
// ============================================================================

export function useAdminUsers(filters?: { page?: number; limit?: number; role?: string; search?: string }) {
  return useQuery({
    queryKey: adminKeys.usersList(filters),
    queryFn: () => getUsers(filters),
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true,
    refetchInterval: 60 * 1000, // Poll every 60 seconds
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, data }: { userId: string; data: UserUpdateData }) =>
      updateUser(userId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.users() });
    },
  });
}

export function useUpdateUserRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) =>
      updateUserRole(userId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.users() });
    },
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => deleteUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.users() });
    },
  });
}

// ============================================================================
// PROPERTY MANAGEMENT HOOKS
// ============================================================================

export function useAdminProperties(filters?: { page?: number; limit?: number; status?: string }) {
  return useQuery({
    queryKey: adminKeys.propertiesList(filters),
    queryFn: () => getAdminProperties(filters),
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
    refetchInterval: 60 * 1000,
  });
}

export function useApproveProperty() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (propertyId: string) => approveProperty(propertyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.properties() });
    },
  });
}

export function useRejectProperty() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ propertyId, reason }: { propertyId: string; reason?: string }) =>
      rejectProperty(propertyId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.properties() });
    },
  });
}

// ============================================================================
// PRODUCTS/PRICING HOOKS
// ============================================================================

export function useAdminProducts() {
  return useQuery({
    queryKey: adminKeys.products(),
    queryFn: () => getProducts(),
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
    refetchInterval: 60 * 1000,
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ productId, data }: { productId: string; data: Partial<Product> }) =>
      updateProduct(productId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.products() });
      // Also invalidate public products cache (for pricing page)
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

export function useToggleProductStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (productId: string) => toggleProductStatus(productId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.products() });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

export function useToggleProductVisibility() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (productId: string) => toggleProductVisibility(productId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.products() });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

// ============================================================================
// PROMOTION PLANS HOOKS
// ============================================================================

export function useAdminPromotionPlans() {
  return useQuery({
    queryKey: adminKeys.promotionPlans(),
    queryFn: () => getPromotionPlans(),
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
    refetchInterval: 60 * 1000,
  });
}

export function useUpdatePromotionPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ planId, data }: { planId: string; data: Partial<PromotionPlan> }) =>
      updatePromotionPlan(planId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.promotionPlans() });
      queryClient.invalidateQueries({ queryKey: ['promotionPlans'] });
    },
  });
}

export function useDeletePromotionPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (planId: string) => deletePromotionPlan(planId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.promotionPlans() });
      queryClient.invalidateQueries({ queryKey: ['promotionPlans'] });
    },
  });
}

export function useTogglePromotionPlanStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (planId: string) => togglePromotionPlanStatus(planId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.promotionPlans() });
      queryClient.invalidateQueries({ queryKey: ['promotionPlans'] });
    },
  });
}

export function useSeedPromotionPlans() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (options?: { force?: boolean }) => seedPromotionPlans(options),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.promotionPlans() });
      queryClient.invalidateQueries({ queryKey: ['promotionPlans'] });
    },
  });
}

// ============================================================================
// DISCOUNT CODES HOOKS
// ============================================================================

export function useAdminDiscountCodes() {
  return useQuery({
    queryKey: adminKeys.discountCodes(),
    queryFn: () => getDiscountCodes(),
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
    refetchInterval: 60 * 1000,
  });
}

export function useCreateDiscountCode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateDiscountCodeData) => createFullDiscountCode(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.discountCodes() });
    },
  });
}

export function useGenerateBulkDiscountCodes() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: BulkDiscountCodeData) => generateBulkDiscountCodes(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.discountCodes() });
    },
  });
}

export function useDeleteDiscountCode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (codeId: string) => deleteDiscountCode(codeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.discountCodes() });
    },
  });
}

export function useDeactivateDiscountCode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (codeId: string) => deactivateDiscountCode(codeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.discountCodes() });
    },
  });
}

// ============================================================================
// ANALYTICS & ACTIVITY HOOKS
// ============================================================================

export function useActivityLog(filters?: { limit?: number; offset?: number }) {
  return useQuery({
    queryKey: adminKeys.activityLog(filters),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.limit) params.append('limit', String(filters.limit));
      if (filters?.offset) params.append('offset', String(filters.offset));
      return apiRequest(`/analytics/activity-log?${params.toString()}`, { requiresAuth: true });
    },
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
    refetchInterval: 30 * 1000, // More frequent for activity log
  });
}

export function useDashboardStats() {
  return useQuery({
    queryKey: adminKeys.dashboardStats(),
    queryFn: () => apiRequest('/analytics/dashboard-stats', { requiresAuth: true }),
    staleTime: 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
    refetchInterval: 60 * 1000,
  });
}

export function useHeatmapData(days: number = 30) {
  return useQuery({
    queryKey: adminKeys.heatmapData(days),
    queryFn: () => apiRequest(`/analytics/heatmap-data?days=${days}`, { requiresAuth: true }),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: true,
  });
}

export function useRecentSubscriptions(limit: number = 10) {
  return useQuery({
    queryKey: adminKeys.recentSubscriptions(limit),
    queryFn: () => apiRequest(`/analytics/subscriptions/recent?limit=${limit}`, { requiresAuth: true }),
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
    refetchInterval: 60 * 1000,
  });
}

// ============================================================================
// PAYMENT HOOKS
// ============================================================================

/**
 * Fetch all payments with filters
 */
export function useAdminPayments(filters?: { page?: number; limit?: number; status?: string }) {
  return useQuery({
    queryKey: adminKeys.paymentsList(filters),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.page) params.append('page', String(filters.page));
      if (filters?.limit) params.append('limit', String(filters.limit));
      if (filters?.status) params.append('status', filters.status);
      return apiRequest(`/admin/payments?${params.toString()}`, { requiresAuth: true });
    },
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
    refetchInterval: 60 * 1000,
  });
}

/**
 * Fetch payment statistics
 */
export function usePaymentStats() {
  return useQuery({
    queryKey: adminKeys.paymentStats(),
    queryFn: () => apiRequest('/admin/payments/stats', { requiresAuth: true }),
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
    refetchInterval: 120 * 1000, // Poll every 2 minutes
  });
}

// ============================================================================
// INQUIRIES HOOKS
// ============================================================================

export function useAdminInquiries(filters?: { page?: number; limit?: number; status?: string }) {
  return useQuery({
    queryKey: adminKeys.inquiriesList(filters),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.page) params.append('page', String(filters.page));
      if (filters?.limit) params.append('limit', String(filters.limit));
      if (filters?.status) params.append('status', filters.status);
      return apiRequest(`/admin/inquiries?${params.toString()}`, { requiresAuth: true });
    },
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
    refetchInterval: 60 * 1000,
  });
}

export function useUpdateInquiryStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ inquiryId, status }: { inquiryId: string; status: string }) =>
      apiRequest(`/admin/inquiries/${inquiryId}/status`, {
        method: 'PATCH',
        body: { status },
        requiresAuth: true,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.inquiries() });
    },
  });
}

// ============================================================================
// AGENT REQUESTS HOOKS
// ============================================================================

export function useAdminAgentRequests(filters?: { page?: number; limit?: number; status?: string }) {
  return useQuery({
    queryKey: adminKeys.agentRequestsList(filters),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.page) params.append('page', String(filters.page));
      if (filters?.limit) params.append('limit', String(filters.limit));
      if (filters?.status) params.append('status', filters.status);
      return apiRequest(`/agent-requests?${params.toString()}`, { requiresAuth: true });
    },
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
    refetchInterval: 60 * 1000,
  });
}

export function useApproveAgentRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (requestId: string) =>
      apiRequest(`/agent-requests/${requestId}/approve`, {
        method: 'POST',
        requiresAuth: true,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.agentRequests() });
      queryClient.invalidateQueries({ queryKey: adminKeys.users() });
    },
  });
}

export function useRejectAgentRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ requestId, reason }: { requestId: string; reason?: string }) =>
      apiRequest(`/agent-requests/${requestId}/reject`, {
        method: 'POST',
        body: { reason },
        requiresAuth: true,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.agentRequests() });
    },
  });
}

// ============================================================================
// AGENCIES HOOKS
// ============================================================================

export function useAdminAgencies(filters?: { page?: number; limit?: number }) {
  return useQuery({
    queryKey: adminKeys.agenciesList(filters),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.page) params.append('page', String(filters.page));
      if (filters?.limit) params.append('limit', String(filters.limit));
      return apiRequest(`/admin/agencies?${params.toString()}`, { requiresAuth: true });
    },
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
    refetchInterval: 60 * 1000,
  });
}

// ============================================================================
// UTILITY HOOK - Invalidate all admin queries
// ============================================================================

export function useInvalidateAdminQueries() {
  const queryClient = useQueryClient();

  return {
    invalidateAll: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.all });
    },
    invalidateUsers: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.users() });
    },
    invalidateProperties: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.properties() });
    },
    invalidateProducts: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.products() });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    invalidatePromotionPlans: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.promotionPlans() });
      queryClient.invalidateQueries({ queryKey: ['promotionPlans'] });
    },
    invalidateDiscountCodes: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.discountCodes() });
    },
    invalidateAnalytics: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.analytics() });
      queryClient.invalidateQueries({ queryKey: adminKeys.dashboardStats() });
      queryClient.invalidateQueries({ queryKey: adminKeys.activityLog() });
    },
  };
}
