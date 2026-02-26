/**
 * Site Settings Data Hooks - Reactive data management using React Query
 *
 * Manages global site settings for the admin panel
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/src/shared/api/httpClient';

// ============================================================================
// Types
// ============================================================================

export interface SocialLinks {
  facebook: string;
  instagram: string;
  twitter: string;
  linkedin: string;
  youtube: string;
}

export interface EmailBrandColors {
  primary: string;
  primaryDark: string;
  accent: string;
  text: string;
  textMuted: string;
  background: string;
  backgroundAlt: string;
}

export interface EmailFooterLink {
  label: string;
  url: string;
}

export interface SiteSettings {
  _id: string;
  companyName: string;
  companyNameFormatted: string;
  logoUrl: string;
  faviconUrl: string;
  supportEmail: string;
  noReplyEmail: string;
  alertsEmail: string;
  inquiriesEmail: string;
  contactPhone: string;
  frontendUrl: string;
  backendUrl: string;
  socialLinks: SocialLinks;
  emailLogoUrl: string;
  emailBrandColors: EmailBrandColors;
  emailFooterText: string;
  emailFooterLinks: EmailFooterLink[];
  siteTitle: string;
  siteDescription: string;
  lastModified: string;
  modifiedBy?: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// API Functions
// ============================================================================

async function getSiteSettings(): Promise<{ settings: SiteSettings }> {
  return apiRequest<{ settings: SiteSettings }>('/admin/site-settings', {
    requiresAuth: true,
  });
}

async function updateSiteSettings(
  data: Partial<SiteSettings>
): Promise<{ message: string; settings: SiteSettings }> {
  return apiRequest<{ message: string; settings: SiteSettings }>('/admin/site-settings', {
    method: 'PATCH',
    body: data,
    requiresAuth: true,
  });
}

async function resetSiteSettings(): Promise<{ message: string; settings: SiteSettings }> {
  return apiRequest<{ message: string; settings: SiteSettings }>('/admin/site-settings/reset', {
    method: 'POST',
    requiresAuth: true,
  });
}

// ============================================================================
// Query Keys
// ============================================================================

export const siteSettingsKeys = {
  all: ['site-settings'] as const,
  detail: () => [...siteSettingsKeys.all, 'detail'] as const,
};

// ============================================================================
// Hooks
// ============================================================================

/**
 * useSiteSettings - Fetches the global site settings
 */
export function useSiteSettings() {
  return useQuery({
    queryKey: siteSettingsKeys.detail(),
    queryFn: getSiteSettings,
    staleTime: 60 * 1000, // 1 minute
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * useUpdateSiteSettings - Mutation to update site settings
 */
export function useUpdateSiteSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<SiteSettings>) => updateSiteSettings(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: siteSettingsKeys.all });
    },
  });
}

/**
 * useResetSiteSettings - Mutation to reset site settings to defaults
 */
export function useResetSiteSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: resetSiteSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: siteSettingsKeys.all });
    },
  });
}
