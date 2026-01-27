/**
 * Email Configuration Data Hooks - Reactive data management using React Query
 *
 * Manages email templates and configurations for the admin panel
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/src/shared/api/httpClient';

// ============================================================================
// Types
// ============================================================================

export interface EmailVariable {
  name: string;
  description: string;
  required: boolean;
  example: string;
}

export interface EmailConfig {
  _id: string;
  key: string;
  name: string;
  description: string;
  category: 'transactional' | 'marketing' | 'alerts' | 'notifications' | 'reports';
  fromCategory: 'noreply' | 'alerts' | 'support' | 'inquiries';
  subject: string;
  preheaderText?: string;
  headerTitle: string;
  headerSubtitle?: string;
  headerGradient?: string;
  headerEmoji?: string;
  bodyTemplate: string;
  showUnsubscribe: boolean;
  unsubscribeType?: string;
  footerReason?: string;
  ctaEnabled: boolean;
  ctaText?: string;
  ctaUrl?: string;
  variables: EmailVariable[];
  isActive: boolean;
  lastModified: string;
  modifiedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EmailConfigsResponse {
  configs: EmailConfig[];
  total: number;
  categoryStats: Record<string, number>;
}

export interface CategoryCount {
  _id: string;
  count: number;
  activeCount: number;
}

// ============================================================================
// API Functions
// ============================================================================

async function getEmailConfigs(params?: {
  category?: string;
  isActive?: string;
  search?: string;
}): Promise<EmailConfigsResponse> {
  const searchParams = new URLSearchParams();
  if (params?.category) searchParams.append('category', params.category);
  if (params?.isActive) searchParams.append('isActive', params.isActive);
  if (params?.search) searchParams.append('search', params.search);

  const endpoint = `/admin/email-configs${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
  return apiRequest<EmailConfigsResponse>(endpoint, { requiresAuth: true });
}

async function getEmailConfig(key: string): Promise<{ config: EmailConfig }> {
  return apiRequest<{ config: EmailConfig }>(`/admin/email-configs/${key}`, { requiresAuth: true });
}

async function updateEmailConfig(
  key: string,
  data: Partial<EmailConfig>
): Promise<{ message: string; config: EmailConfig }> {
  return apiRequest<{ message: string; config: EmailConfig }>(`/admin/email-configs/${key}`, {
    method: 'PATCH',
    body: data,
    requiresAuth: true,
  });
}

async function toggleEmailStatus(key: string): Promise<{ message: string; config: EmailConfig }> {
  return apiRequest<{ message: string; config: EmailConfig }>(`/admin/email-configs/${key}/toggle`, {
    method: 'POST',
    requiresAuth: true,
  });
}

async function resetEmailConfig(key: string): Promise<{ message: string; config: EmailConfig }> {
  return apiRequest<{ message: string; config: EmailConfig }>(`/admin/email-configs/${key}/reset`, {
    method: 'POST',
    requiresAuth: true,
  });
}

async function resetAllEmailConfigs(): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(`/admin/email-configs/reset-all`, {
    method: 'POST',
    requiresAuth: true,
  });
}

async function sendTestEmail(
  key: string,
  data: { testEmail: string; testVariables?: Record<string, string> }
): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(`/admin/email-configs/${key}/test`, {
    method: 'POST',
    body: data,
    requiresAuth: true,
  });
}

async function previewEmail(
  key: string,
  data: { testVariables?: Record<string, string> }
): Promise<{ subject: string; html: string; preheaderText: string }> {
  return apiRequest<{ subject: string; html: string; preheaderText: string }>(
    `/admin/email-configs/${key}/preview`,
    {
      method: 'POST',
      body: data,
      requiresAuth: true,
    }
  );
}

async function getEmailCategories(): Promise<{ categories: CategoryCount[] }> {
  return apiRequest<{ categories: CategoryCount[] }>(`/admin/email-configs/categories`, {
    requiresAuth: true,
  });
}

async function createEmailConfig(
  data: Partial<EmailConfig>
): Promise<{ message: string; config: EmailConfig }> {
  return apiRequest<{ message: string; config: EmailConfig }>(`/admin/email-configs`, {
    method: 'POST',
    body: data,
    requiresAuth: true,
  });
}

async function deleteEmailConfig(key: string): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(`/admin/email-configs/${key}`, {
    method: 'DELETE',
    requiresAuth: true,
  });
}

async function duplicateEmailConfig(
  key: string,
  data: { newKey: string; newName: string }
): Promise<{ message: string; config: EmailConfig }> {
  return apiRequest<{ message: string; config: EmailConfig }>(
    `/admin/email-configs/${key}/duplicate`,
    {
      method: 'POST',
      body: data,
      requiresAuth: true,
    }
  );
}

// ============================================================================
// Query Keys
// ============================================================================

export const emailConfigKeys = {
  all: ['email-configs'] as const,
  list: (params?: { category?: string; isActive?: string; search?: string }) =>
    [...emailConfigKeys.all, 'list', params] as const,
  detail: (key: string) => [...emailConfigKeys.all, 'detail', key] as const,
  categories: () => [...emailConfigKeys.all, 'categories'] as const,
  preview: (key: string) => [...emailConfigKeys.all, 'preview', key] as const,
};

// ============================================================================
// Hooks
// ============================================================================

/**
 * useEmailConfigs - Fetches all email configurations with optional filters
 */
export function useEmailConfigs(params?: {
  category?: string;
  isActive?: string;
  search?: string;
}) {
  return useQuery({
    queryKey: emailConfigKeys.list(params),
    queryFn: () => getEmailConfigs(params),
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * useEmailConfig - Fetches a single email configuration by key
 */
export function useEmailConfig(key: string) {
  return useQuery({
    queryKey: emailConfigKeys.detail(key),
    queryFn: () => getEmailConfig(key),
    enabled: !!key,
    staleTime: 30 * 1000,
  });
}

/**
 * useEmailCategories - Fetches email categories with counts
 */
export function useEmailCategories() {
  return useQuery({
    queryKey: emailConfigKeys.categories(),
    queryFn: getEmailCategories,
    staleTime: 60 * 1000, // 1 minute
  });
}

/**
 * useUpdateEmailConfig - Mutation to update an email configuration
 */
export function useUpdateEmailConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ key, data }: { key: string; data: Partial<EmailConfig> }) =>
      updateEmailConfig(key, data),
    onSuccess: (_, { key }) => {
      queryClient.invalidateQueries({ queryKey: emailConfigKeys.all });
      queryClient.invalidateQueries({ queryKey: emailConfigKeys.detail(key) });
    },
  });
}

/**
 * useToggleEmailStatus - Mutation to toggle email active/inactive status
 */
export function useToggleEmailStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (key: string) => toggleEmailStatus(key),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: emailConfigKeys.all });
    },
  });
}

/**
 * useResetEmailConfig - Mutation to reset a single email to defaults
 */
export function useResetEmailConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (key: string) => resetEmailConfig(key),
    onSuccess: (_, key) => {
      queryClient.invalidateQueries({ queryKey: emailConfigKeys.all });
      queryClient.invalidateQueries({ queryKey: emailConfigKeys.detail(key) });
    },
  });
}

/**
 * useResetAllEmailConfigs - Mutation to reset all emails to defaults
 */
export function useResetAllEmailConfigs() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: resetAllEmailConfigs,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: emailConfigKeys.all });
    },
  });
}

/**
 * useSendTestEmail - Mutation to send a test email
 */
export function useSendTestEmail() {
  return useMutation({
    mutationFn: ({
      key,
      testEmail,
      testVariables,
    }: {
      key: string;
      testEmail: string;
      testVariables?: Record<string, string>;
    }) => sendTestEmail(key, { testEmail, testVariables }),
  });
}

/**
 * usePreviewEmail - Mutation to preview email HTML
 */
export function usePreviewEmail() {
  return useMutation({
    mutationFn: ({
      key,
      testVariables,
    }: {
      key: string;
      testVariables?: Record<string, string>;
    }) => previewEmail(key, { testVariables }),
  });
}

/**
 * useCreateEmailConfig - Mutation to create a new email configuration
 */
export function useCreateEmailConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<EmailConfig>) => createEmailConfig(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: emailConfigKeys.all });
    },
  });
}

/**
 * useDeleteEmailConfig - Mutation to delete an email configuration
 */
export function useDeleteEmailConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (key: string) => deleteEmailConfig(key),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: emailConfigKeys.all });
    },
  });
}

/**
 * useDuplicateEmailConfig - Mutation to duplicate an email configuration
 */
export function useDuplicateEmailConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      key,
      newKey,
      newName,
    }: {
      key: string;
      newKey: string;
      newName: string;
    }) => duplicateEmailConfig(key, { newKey, newName }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: emailConfigKeys.all });
    },
  });
}
