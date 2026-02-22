/**
 * Messaging/Conversations React Query Hooks
 * Following architecture guidelines: Use TanStack Query for ALL server state
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { conversationApiClient } from '@/src/data/api/ConversationApiClient';

// ============================================================================
// QUERY KEYS
// ============================================================================

export const conversationKeys = {
  all: ['conversations'] as const,
  lists: () => [...conversationKeys.all, 'list'] as const,
  list: (filters?: { search?: string; unreadOnly?: boolean }) =>
    [...conversationKeys.lists(), { filters }] as const,
  details: () => [...conversationKeys.all, 'detail'] as const,
  detail: (id: string) => [...conversationKeys.details(), id] as const,
  unreadCount: () => [...conversationKeys.all, 'unreadCount'] as const,
};

// ============================================================================
// CONVERSATION HOOKS
// ============================================================================

/**
 * Fetch all conversations with real-time updates
 */
export function useConversations(enabled: boolean = true) {
  return useQuery({
    queryKey: conversationKeys.lists(),
    queryFn: () => conversationApiClient.getConversations(),
    enabled,
    staleTime: 30 * 1000, // 30 seconds - messages update frequently
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true,
    refetchInterval: 30 * 1000, // Poll every 30 seconds for new messages
  });
}

/**
 * Fetch single conversation by ID
 */
export function useConversation(conversationId: string | undefined) {
  return useQuery({
    queryKey: conversationKeys.detail(conversationId!),
    queryFn: () => conversationApiClient.getConversationById(conversationId!),
    enabled: !!conversationId,
    staleTime: 15 * 1000, // 15 seconds
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
    refetchInterval: 15 * 1000, // Poll every 15 seconds for active conversation
  });
}

/**
 * Get unread message count
 */
export function useUnreadCount(enabled: boolean = true) {
  return useQuery({
    queryKey: conversationKeys.unreadCount(),
    queryFn: () => conversationApiClient.getUnreadCount(),
    enabled,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
    refetchInterval: 30 * 1000,
  });
}

/**
 * Create new conversation
 */
export function useCreateConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      propertyId: string;
      buyerId?: string;
      sellerId: string;
      initialMessage?: string;
    }) => conversationApiClient.createConversation(data as any),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: conversationKeys.lists() });
    },
  });
}

/**
 * Send message in conversation
 */
export function useSendMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      conversationId,
      data,
    }: {
      conversationId: string;
      data: {
        content?: string;
        imageUrl?: string;
        encryptedContent?: string;
      };
    }) => conversationApiClient.sendMessage(conversationId, data as any),
    onSuccess: (_, { conversationId }) => {
      // Invalidate specific conversation and list
      queryClient.invalidateQueries({ queryKey: conversationKeys.detail(conversationId) });
      queryClient.invalidateQueries({ queryKey: conversationKeys.lists() });
      queryClient.invalidateQueries({ queryKey: conversationKeys.unreadCount() });
    },
  });
}

/**
 * Mark conversation as read
 */
export function useMarkAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (conversationId: string) =>
      conversationApiClient.markAsRead(conversationId),
    onSuccess: (_, conversationId) => {
      queryClient.invalidateQueries({ queryKey: conversationKeys.detail(conversationId) });
      queryClient.invalidateQueries({ queryKey: conversationKeys.lists() });
      queryClient.invalidateQueries({ queryKey: conversationKeys.unreadCount() });
    },
  });
}

/**
 * Delete conversation
 */
export function useDeleteConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (conversationId: string) =>
      conversationApiClient.deleteConversation(conversationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: conversationKeys.lists() });
      queryClient.invalidateQueries({ queryKey: conversationKeys.unreadCount() });
    },
  });
}

/**
 * Upload message image
 */
export function useUploadMessageImage() {
  return useMutation({
    mutationFn: (file: File) => conversationApiClient.uploadMessageImage(file),
  });
}

// ============================================================================
// UTILITY HOOKS
// ============================================================================

/**
 * Invalidate all conversation queries
 */
export function useInvalidateConversationQueries() {
  const queryClient = useQueryClient();

  return {
    invalidateAll: () => {
      queryClient.invalidateQueries({ queryKey: conversationKeys.all });
    },
    invalidateConversation: (conversationId: string) => {
      queryClient.invalidateQueries({ queryKey: conversationKeys.detail(conversationId) });
    },
    invalidateUnreadCount: () => {
      queryClient.invalidateQueries({ queryKey: conversationKeys.unreadCount() });
    },
  };
}

/**
 * Prefetch conversation (useful for navigation optimization)
 */
export function usePrefetchConversation() {
  const queryClient = useQueryClient();

  return (conversationId: string) => {
    queryClient.prefetchQuery({
      queryKey: conversationKeys.detail(conversationId),
      queryFn: () => conversationApiClient.getConversationById(conversationId),
      staleTime: 15 * 1000,
    });
  };
}
